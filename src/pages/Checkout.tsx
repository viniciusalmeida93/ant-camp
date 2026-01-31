
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, QrCode, Shield, Copy, CheckCircle2, CreditCard, RefreshCcw, Ticket, X } from "lucide-react";
import { getPixPayloadForDisplay } from "@/utils/pix";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { cn, formatCurrency } from "@/lib/utils";
import { Coupon } from "@/types/coupon";

export default function Checkout() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [registration, setRegistration] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [cardData, setCardData] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cpf: "", // CPF do portador do cartão
    postalCode: "", // CEP do titular do cartão (obrigatório pelo Asaas)
    addressNumber: "", // Número do endereço
  });
  const [pixCpf, setPixCpf] = useState("");
  const [installments, setInstallments] = useState(1);
  const [hasAsaasIntegration, setHasAsaasIntegration] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  // Asaas Fee Constants (User provided)
  const PIX_FEE_CENTS = 199;
  const ASAAS_FIXED_FEE_CENTS = 49;

  const CREDIT_CARD_FEES = {
    "1": 0.0299,
    "2-6": 0.0349,
    "7-12": 0.0399
  };

  const DEBIT_CARD_FEE_PERCENT = 0.0199; // Mantido apenas como constante interna se necessário futuramente, mas removido da UI

  const [dynamicTotal, setDynamicTotal] = useState<number>(0);
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    loadRegistration();
    const method = searchParams.get("method");
    if (method === "credit_card") {
      setPaymentMethod("credit_card");
    }
  }, [registrationId, searchParams]);

  useEffect(() => {
    if (registration) {
      calculateFees();

      // Setup real-time subscription for payment status
      if (registration.payment_status !== 'approved') {
        const channel = supabase
          .channel(`registration-${registrationId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'registrations',
              filter: `id=eq.${registrationId}`,
            },
            (payload) => {
              console.log('Realtime update received:', payload);
              if (payload.new && (payload.new as any).payment_status === 'approved') {
                toast.success("Pagamento aprovado!");
                navigate(`/inscricao-confirmada/${registrationId}`);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [registration, paymentMethod, installments, discountCents]);

  const calculateFees = () => {
    if (!registration) return;

    // Base Calculation: (Subtotal - Discount) + Platform Fee
    // Ensure discount doesn't exceed subtotal
    const subtotalAfterDiscount = Math.max(0, basePrice - discountCents);
    const targetNet = subtotalAfterDiscount + registration.platform_fee_cents;

    let totalToCharge = 0;
    let fee = 0;

    if (paymentMethod === "pix") {
      totalToCharge = targetNet + PIX_FEE_CENTS;
      fee = PIX_FEE_CENTS;
    } else if (paymentMethod === "credit_card") {
      // For credit card, the fee depends on the number of installments
      let feePercent = CREDIT_CARD_FEES["1"];
      if (installments >= 2 && installments <= 6) feePercent = CREDIT_CARD_FEES["2-6"];
      if (installments >= 7) feePercent = CREDIT_CARD_FEES["7-12"];

      // Formula: Total = (Target + Fixed) / (1 - Percent)
      totalToCharge = Math.ceil((targetNet + ASAAS_FIXED_FEE_CENTS) / (1 - feePercent));
      fee = totalToCharge - targetNet;
    }

    setDynamicTotal(totalToCharge);
    setProcessingFee(fee);
  };

  const refreshPixQrCode = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("refresh-pix-qrcode", {
        body: { paymentId },
      });

      if (error) {
        console.error("Erro ao atualizar QR Code:", error);
        return false;
      }

      if (data?.success && data.pixCopyPaste) {
        // Atualizar o estado do pagamento com o novo QR Code
        setPayment((prev) => ({
          ...prev,
          pix_qr_code: data.pixQrCode || prev.pix_qr_code,
          pix_copy_paste: data.pixCopyPaste || prev.pix_copy_paste,
        }));
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("Erro ao atualizar QR Code:", error);
      return false;
    }
  };

  const loadRegistration = async () => {
    try {
      const { data: reg, error: regError } = await supabase
        .from("registrations")
        .select("*, categories(*), championships(*)")
        .eq("id", registrationId)
        .single();

      if (regError) throw regError;

      // Encontrar o nome do lote se houver
      let batchName = "";
      if (reg.categories?.has_batches && reg.categories?.batches) {
        const matchingBatch = reg.categories.batches.find((b: any) => b.price_cents === reg.subtotal_cents);
        if (matchingBatch) {
          batchName = matchingBatch.name;
        }
      }

      setRegistration({ ...reg, batch_name: batchName });

      // PRICE REFRESH LOGIC:
      // Use category price if no active batch logic is complex, or use existing logic if simpler.
      // Since user complained about "value not updating", we prioritize the latest Category Price.
      // If batch exists, ideally we'd check batches. Simplified: use reg.subtotal_cents unless category price differs significantly and user wants update? 
      // Actually, if reg is old, reg.subtotal_cents is old.
      // Robust fix: Always use current category.price_cents unless batches are involved.
      let currentBasePrice = reg.subtotal_cents;

      if (reg.categories?.price_cents !== undefined) {
        // If category has batches, it's safer to trust the registration snapshotted price 
        // UNLESS we implement full batch logic here. 
        // But user might have just changed the Category Price (without batches).
        if (!reg.categories.has_batches) {
          currentBasePrice = reg.categories.price_cents;
        }
      }

      setBasePrice(currentBasePrice);

      // We will calculate dynamic total in useEffect based on basePrice


      // Tentar obter o CPF da inscrição (pode estar na coluna athlete_cpf (legado) ou dentro de team_members[0].cpf)
      let registrationCpf = (reg as any).athlete_cpf; // Casting as any because type definition might be outdated
      if (!registrationCpf && reg.team_members && Array.isArray(reg.team_members) && reg.team_members.length > 0) {
        // @ts-ignore
        registrationCpf = reg.team_members[0].cpf;
      }

      // Inicializar CPF do cartão com o CPF da inscrição se disponível
      if (registrationCpf && !cardData.cpf) {
        // Formatar apenas para exibição inicial no input se ainda não tiver valor
        const cleanCpf = registrationCpf.replace(/\D/g, "");
        if (cleanCpf.length === 11) {
          const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
          setCardData(prev => ({ ...prev, cpf: formattedCpf }));
        } else {
          setCardData(prev => ({ ...prev, cpf: cleanCpf }));
        }
      }

      // Verificar se o campeonato tem integração Asaas e se é sandbox
      if (reg.championships?.organizer_id) {
        // @ts-ignore
        const { data: integration } = await supabase
          .from("organizer_asaas_integrations")
          .select("id, asaas_api_key")
          .eq("organizer_id", reg.championships.organizer_id)
          .eq("is_active", true)
          .maybeSingle();

        setHasAsaasIntegration(!!integration);
        // Verificar se é sandbox (API key começa com $aact_hmlg_)
        if (integration?.asaas_api_key?.startsWith("$aact_hmlg_")) {
          setIsSandbox(true);
        }
      }
      // Verificar se o sistema platform possui configuração sandbox (para pagamentos sem organizador definido)
      if (import.meta.env.VITE_ASAAS_API_KEY?.startsWith("$aact_hmlg_")) {
        setIsSandbox(true);
      }

      // Buscar status do pagamento se já existir um ID
      if (reg.payment_id) {
        const { data: pData } = await supabase
          .from("payments")
          .select("*")
          .eq("id", reg.payment_id)
          .maybeSingle();

        if (pData) setPayment(pData);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados da inscrição");
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!registration) return;
    setProcessing(true);

    try {
      if (paymentMethod === "credit_card") {
        if (!cardData.holderName || !cardData.number || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv) {
          toast.error("Preencha todos os dados do cartão");
          setProcessing(false);
          return;
        }
        if (!cardData.cvv.match(/^\d{3,4}$/)) {
          toast.error("CVV inválido");
          setProcessing(false);
          return;
        }

        // Obter CPF da inscrição (fonte confiável)
        let regCpf = (registration as any).athlete_cpf;
        if (!regCpf && registration.team_members && Array.isArray(registration.team_members) && registration.team_members.length > 0) {
          // @ts-ignore
          regCpf = registration.team_members[0].cpf;
        }

        // Validar CPF - usar o CPF do portador do cartão se informado, senão usar o CPF do atleta
        const cpfToUse = cardData.cpf.trim() || regCpf;
        if (!cpfToUse) {
          toast.error("CPF é obrigatório para pagamento com cartão de crédito");
          setProcessing(false);
          return;
        }
        const cpfClean = cpfToUse.replace(/\D/g, "");
        if (cpfClean.length !== 11 && cpfClean.length !== 14) {
          toast.error("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos");
          setProcessing(false);
          return;
        }

        // Validar CEP
        const postalCodeClean = cardData.postalCode.replace(/\D/g, "");
        if (!postalCodeClean || postalCodeClean.length !== 8) {
          toast.error("CEP é obrigatório e deve ter 8 dígitos");
          setProcessing(false);
          return;
        }
      }


      // Não precisa de autenticação - a inscrição pública não cria usuário
      // A Edge Function usa service_role_key e não precisa de JWT do usuário

      // Obter CPF da inscrição novamente para payload
      let regCpf = (registration as any).athlete_cpf;
      if (!regCpf && registration.team_members && Array.isArray(registration.team_members) && registration.team_members.length > 0) {
        // @ts-ignore
        regCpf = registration.team_members[0].cpf;
      }

      // Para PIX, usamos o CPF digitado (pixCpf) se houver, ou a inscrição (fallback)
      // ISSO É IMPORTANTE: Se o usuário editar o CPF na tela, temos que usar o editado (pixCpf)
      const cpfToUse = paymentMethod === "credit_card"
        ? (cardData.cpf.trim() || regCpf)?.replace(/\D/g, "")
        : (pixCpf || regCpf)?.replace(/\D/g, "");

      // Validação específica para PIX se não tiver CPF
      if (paymentMethod === 'pix' && !cpfToUse) {
        toast.error("CPF é obrigatório para gerar o PIX. Por favor, preencha o campo de CPF.");
        setProcessing(false);
        return;
      }

      if (cpfToUse && (cpfToUse.length !== 11 && cpfToUse.length !== 14)) {
        toast.error("CPF inválido. Verifique os dígitos.");
        setProcessing(false);
        return;
      }

      console.log("Calling create-payment with:", {
        registrationId: registration.id,
        categoryId: registration.category_id,
        athleteName: registration.athlete_name,
        athleteEmail: registration.athlete_email,
        athleteCpf: cpfToUse,
        priceCents: dynamicTotal, // Using the new calculated total
        paymentMethod,
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          registrationId: registration.id,
          categoryId: registration.category_id,
          athleteName: registration.athlete_name,
          athleteEmail: registration.athlete_email,
          athletePhone: registration.athlete_phone,
          athleteCpf: cpfToUse, // Mandando o CPF limpo e resolvido
          athleteBirthDate: (registration as any).athlete_birth_date || (registration.team_members?.[0]?.birthDate),
          teamName: registration.team_name,
          priceCents: dynamicTotal, // CRITICAL CHANGE: Sending the dynamic total
          paymentMethod: paymentMethod === "credit_card" ? "CREDIT_CARD" : "PIX",
          installments: paymentMethod === "credit_card" ? installments : 1,
          cardData: paymentMethod === "credit_card" ? {
            holderName: cardData.holderName,
            number: cardData.number.replace(/\s/g, ""),
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            ccv: cardData.cvv
          } : undefined,
          creditCardHolderInfo: paymentMethod === "credit_card" ? {
            name: cardData.holderName,
            email: registration.athlete_email,
            cpfCnpj: cpfToUse, // Usar o mesmo CPF validado
            addressNumber: (cardData.addressNumber && cardData.addressNumber.trim()) || "S/N",
            phone: registration.athlete_phone || registration.athlete_phone // Fallback if mobilePhone exists
          } : undefined,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined // Send coupon code to backend
        }),
      });

      let data = null;
      let error = null;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          // Se não for JSON, usar o texto como está
        }
        error = {
          message: errorMessage,
          status: response.status,
        };
      } else {
        data = await response.json();
      }

      console.log("Payment creation response:", { data, error });

      // Verificar se há erro na resposta
      if (error) {
        let errorMessage = error.message || "Erro ao criar pagamento";
        try {
          if (error.context && error.context.body) {
            const errorBody = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
            if (errorBody.error) errorMessage = errorBody.error;
          }
          if (data?.error) errorMessage = data.error;
          else if (data?.details) errorMessage = `${data.error || errorMessage} \n\nDetalhes: ${data.details} `;
        } catch (e) { console.error(e); }

        console.error("Payment error details:", { error, data });
        if (errorMessage?.includes("violates check constraint") || errorMessage?.includes("registrations_status_check")) {
          toast.error("Erro ao processar pagamento. Verifique os dados e tente novamente.");
        } else {
          toast.error(`Erro ao criar pagamento: ${errorMessage} `);
        }
        return;
      }

      // Verificar se a resposta tem erro mesmo sem error object
      if (data?.error) {
        console.error("Payment creation error in data:", data);
        toast.error(`Erro ao criar pagamento: ${data.error} `);
        return;
      }

      // Verificar se foi sucesso
      if (data?.success) {
        if (paymentMethod === "credit_card") {
          setTimeout(async () => {
            await loadRegistration();
          }, 2000);
        } else {
          if (data.payment) {
            const paymentData = {
              id: data.payment.id,
              asaas_payment_id: data.payment.asaasPaymentId,
              status: data.payment.status,
              payment_url: data.payment.paymentUrl,
              pix_qr_code: data.payment.pixQrCode || null,
              pix_copy_paste: data.payment.pixCopyPaste || null,
              payment_method: "pix",
              amount_cents: data.payment.totalCents,
              platform_fee_cents: data.payment.platformFeeCents || 0,
            };
            setPayment(paymentData);
            if (registration) {
              setRegistration({
                ...registration,
                payment_id: data.payment.id,
                payment_status: "pending",
              });
            }
          }
        }
        await loadRegistration();
      } else {
        toast.error("Resposta inesperada do servidor");
        console.error("Unexpected response:", data);
      }
    } catch (error: any) {
      console.error("Payment creation exception:", error);
      toast.error(`Erro ao criar pagamento: ${error.message} `);
    } finally {
      setProcessing(false);
    }
  };

  const rawPixPayload = registration?.championships?.pix_payload
    ? String(registration.championships.pix_payload).trim()
    : "";

  const manualPixData = getPixPayloadForDisplay({
    rawPayload: rawPixPayload,
    merchantName: registration?.championships?.name,
    merchantCity: registration?.championships?.location,
  });

  const hasManualPix = manualPixData.qrPayload.length > 0;
  const pixCopyPayload = manualPixData.copyPayload || rawPixPayload;
  const pixImageUrl = hasManualPix
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      manualPixData.qrPayload
    )}`
    : "";

  const copyPixCode = () => {
    const codeToCopy = hasManualPix ? pixCopyPayload : (payment?.pix_copy_paste || "");
    if (codeToCopy) {
      // IMPORTANTE: Remover TODOS os espaços do código PIX
      const cleanCode = codeToCopy.replace(/\s+/g, '');
      console.log("Código PIX original:", codeToCopy);
      console.log("Código PIX limpo:", cleanCode);
      navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      toast.success("Código PIX copiado (sem espaços)!");
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error("Código PIX não disponível");
    }
  };


  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Digite o código do cupom");
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("championship_id", registration.championships.id) // Ensure coupon belongs to this championship
        .eq("is_active", true)
        .maybeSingle();

      console.log("Coupon validation:", {
        code: couponCode,
        champId: registration.championships.id,
        found: !!data,
        error
      });

      if (error) throw error;

      if (!data) {
        toast.error("Cupom inválido ou não encontrado para este campeonato");
        return;
      }

      if (appliedCoupon) {
        toast.error("Você já possui um cupom aplicado. Remova-o para adicionar outro.");
        return;
      }

      // Validate expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("Este cupom expirou");
        return;
      }

      // Validate usage limit
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        toast.error("Este cupom atingiu o limite de uso");
        return;
      }

      // Calculate discount
      let discount = 0;
      if (data.discount_type === "percentage") {
        discount = Math.round(basePrice * (data.discount_value / 100));
      } else {
        discount = data.discount_value; // Fixed value in cents
      }

      // Cap discount at basePrice (cannot go negative)
      discount = Math.min(discount, basePrice);

      setAppliedCoupon(data);
      setDiscountCents(discount);
      toast.success("Cupom aplicado com sucesso!");
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast.error("Erro ao validar cupom");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setDiscountCents(0);
    toast.info("Cupom removido");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Inscrição não encontrada</CardTitle>
            <CardDescription>A inscrição que você está procurando não existe.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <PublicHeader />
      <div className="w-full mx-auto px-6 py-12 max-w-[1200px] flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SIDE: Payment Method */}
          <div className="lg:col-span-8 order-1 lg:order-1">
            {registration.payment_status === "approved" ? (
              <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border shadow-sm text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-bold italic uppercase tracking-tight">Pagamento Confirmado!</h3>
                <p className="text-muted-foreground mt-2">Você está sendo redirecionado para a confirmação...</p>
                <Button
                  onClick={() => navigate(`/inscricao-confirmada/${registrationId}`)}
                  variant="link"
                  className="mt-4"
                >
                  Clique aqui se não for redirecionado
                </Button>
              </div>
            ) : hasManualPix ? (
              <Card className="shadow-md border-border bg-card/50">
                <CardHeader>
                  <CardTitle>Pagamento via PIX</CardTitle>
                  <CardDescription>
                    Utilize o QR Code abaixo para concluir o pagamento diretamente com o organizador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-3 sm:px-6">
                  {/* Manual Pix Content */}
                  <div className="flex flex-col items-center gap-4">
                    {pixImageUrl ? (
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <img src={pixImageUrl} alt="QR Code PIX" className="w-52 h-52" />
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center">
                        QR Code indisponível. Copie o código PIX abaixo.
                      </div>
                    )}
                    <div className="w-full max-w-xl space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Caso prefira, copie o código “copia e cola”:
                      </p>
                      <div className="flex gap-2 items-center">
                        <Input value={pixCopyPayload} readOnly className="font-mono text-xs bg-muted/20" />
                        <Button onClick={copyPixCode} variant="outline">
                          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      {manualPixData.generatedFromKey && (
                        <p className="text-xs text-muted-foreground">
                          Chave informada pelo organizador: {rawPixPayload}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground space-y-2 border border-border">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <QrCode className="w-4 h-4 text-primary" />
                      Como prosseguir
                    </div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Realize o pagamento via PIX utilizando o QR Code ou o código acima.</li>
                      <li>Salve o comprovante. O organizador pode solicitá-lo para validação.</li>
                      <li>
                        Assim que o repasse for confirmado, sua inscrição constará como “Pago”.
                      </li>
                    </ol>
                  </div>
                  <Button onClick={() => navigate(`/links/${registration.championships.slug}`)} className="w-full" variant="outline">
                    Voltar para o evento
                  </Button>
                </CardContent>
              </Card>
            ) : !payment ? (
              <Card className="shadow-md border-border bg-card/50">
                <CardHeader className="border-b border-border bg-muted/5">
                  <CardTitle>Forma de Pagamento</CardTitle>
                  <CardDescription>Escolha como deseja concluir sua inscrição</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6 px-6">
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Label
                      htmlFor="pix"
                      className={cn(
                        "flex items-center space-x-2 p-4 border rounded-xl cursor-pointer transition-all hover:bg-muted/30",
                        paymentMethod === "pix" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background/50"
                      )}
                    >
                      <RadioGroupItem value="pix" id="pix" className="sr-only" />
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn("p-2 rounded-lg", paymentMethod === "pix" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          <QrCode className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-base">PIX</div>
                          <div className="text-xs text-muted-foreground">Confirmação instantânea</div>
                        </div>
                        {paymentMethod === "pix" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      </div>
                    </Label>

                    <Label
                      htmlFor="credit_card"
                      className={cn(
                        "flex items-center space-x-2 p-4 border rounded-xl cursor-pointer transition-all hover:bg-muted/30",
                        paymentMethod === "credit_card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background/50"
                      )}
                    >
                      <RadioGroupItem value="credit_card" id="credit_card" className="sr-only" />
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn("p-2 rounded-lg", paymentMethod === "credit_card" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-base">Crédito</div>
                          <div className="text-xs text-muted-foreground">Parcele em até 12x</div>
                        </div>
                        {paymentMethod === "credit_card" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      </div>
                    </Label>
                  </RadioGroup>

                  {paymentMethod === "pix" && (
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 flex gap-4 items-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-primary mb-1 text-base">Pagamento via PIX</p>
                        <p className="text-muted-foreground leading-relaxed">
                          Ao clicar em "Gerar PIX", um código copia e cola será criado. A confirmação é automática após o pagamento.
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "credit_card" && (
                    <Card className="border-border shadow-sm overflow-hidden bg-card/30">
                      <CardHeader className="bg-muted/10 py-4 border-b border-border">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          Detalhes do Cartão
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-6 px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="holderName">Nome no Cartão *</Label>
                            <Input
                              id="holderName"
                              value={cardData.holderName}
                              onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
                              placeholder="COMO ESTÁ NO CARTÃO"
                              className="uppercase bg-muted/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardNumber">Número do Cartão *</Label>
                            <Input
                              id="cardNumber"
                              value={cardData.number}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
                                setCardData({ ...cardData, number: value });
                              }}
                              placeholder="0000 0000 0000 0000"
                              maxLength={19}
                              className="bg-muted/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="installments">Parcelamento *</Label>
                            <Select
                              value={String(installments)}
                              onValueChange={(v) => setInstallments(parseInt(v))}
                            >
                              <SelectTrigger id="installments" className="h-11 bg-muted/20 border-border">
                                <SelectValue placeholder="Selecione as parcelas" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
                                  const targetNet = (registration?.subtotal_cents || 0) + (registration?.platform_fee_cents || 0);
                                  let feePercent = CREDIT_CARD_FEES["1"];
                                  if (i >= 2 && i <= 6) feePercent = CREDIT_CARD_FEES["2-6"];
                                  if (i >= 7) feePercent = CREDIT_CARD_FEES["7-12"];

                                  const totalForI = Math.ceil((targetNet + ASAAS_FIXED_FEE_CENTS) / (1 - feePercent));
                                  const perInstallment = totalForI / i;

                                  return (
                                    <SelectItem key={i} value={String(i)}>
                                      {i}x de {formatCurrency(perInstallment)} (Total: {formatCurrency(totalForI)})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="expiryMonth">Mês *</Label>
                              <Input
                                id="expiryMonth"
                                value={cardData.expiryMonth}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                                  if (value === "" || (parseInt(value) >= 1 && parseInt(value) <= 12)) {
                                    setCardData({ ...cardData, expiryMonth: value });
                                  }
                                }}
                                placeholder="MM"
                                maxLength={2}
                                className="bg-muted/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expiryYear">Ano *</Label>
                              <Input
                                id="expiryYear"
                                value={cardData.expiryYear}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  setCardData({ ...cardData, expiryYear: value });
                                }}
                                placeholder="AAAA"
                                maxLength={4}
                                className="bg-muted/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cvv">CVV *</Label>
                              <Input
                                id="cvv"
                                type="password"
                                value={cardData.cvv}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  setCardData({ ...cardData, cvv: value });
                                }}
                                placeholder="123"
                                maxLength={4}
                                className="bg-muted/20"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-6">
                          <div className="space-y-2">
                            <Label htmlFor="cpf">CPF do Titular *</Label>
                            <Input
                              id="cpf"
                              value={cardData.cpf}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                let formatted = value;
                                if (value.length <= 11) {
                                  formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                }
                                setCardData({ ...cardData, cpf: formatted });
                              }}
                              placeholder="000.000.000-00"
                              maxLength={14}
                              className="bg-muted/20"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2 col-span-2">
                              <Label htmlFor="postalCode">CEP *</Label>
                              <Input
                                id="postalCode"
                                value={cardData.postalCode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                                  const formatted = value.replace(/(\d{5})(\d{3})/, "$1-$2");
                                  setCardData({ ...cardData, postalCode: formatted });
                                }}
                                placeholder="00000-000"
                                maxLength={9}
                                className="bg-muted/20"
                              />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <Label htmlFor="addressNumber">Nº</Label>
                              <Input
                                id="addressNumber"
                                value={cardData.addressNumber}
                                onChange={(e) => setCardData({ ...cardData, addressNumber: e.target.value })}
                                placeholder="123"
                                maxLength={10}
                                className="bg-muted/20"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    onClick={handlePayment}
                    disabled={processing}
                    size="lg"
                    className="w-full h-14 text-lg font-bold shadow-lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      paymentMethod === "credit_card" ? "Pagar com Cartão" : "Confirmar e Gerar PIX"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : payment.payment_method === 'credit_card' ? (
              <Card className="shadow-md border-border bg-card/50">
                <CardHeader>
                  <CardTitle>Pagamento em Processamento</CardTitle>
                  <CardDescription>
                    Seu pagamento está sendo analisado pelo Asaas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-6 text-center py-10">
                  <div className="bg-yellow-500/10 p-8 rounded-2xl text-yellow-500 border border-yellow-500/20 inline-block mx-auto mb-4">
                    <RefreshCcw className="w-12 h-12 mx-auto mb-3 animate-spin duration-[3s]" />
                    <p className="font-bold text-lg">Status: {payment.status === 'pending' ? 'Pendente' : payment.status}</p>
                    <p className="text-sm mt-1 opacity-80">Isso pode levar alguns instantes.</p>
                  </div>

                  <div className="max-w-md mx-auto space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Se você deseja tentar com outro cartão ou forma de pagamento, clique no botão abaixo.
                    </p>
                    <Button
                      onClick={() => setPayment(null)}
                      variant="outline"
                      className="w-full h-12 border-border"
                    >
                      Tentar com outra forma de pagamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg border-border bg-card/50">
                <CardHeader className="bg-muted/5 border-b border-border">
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    Pagamento PIX
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 pt-8 px-6">
                  <div className="flex flex-col items-center gap-6">
                    {(() => {
                      if (payment.pix_qr_code) {
                        const qrCodeSrc = payment.pix_qr_code.startsWith('data:image')
                          ? payment.pix_qr_code
                          : `data:image/png;base64,${payment.pix_qr_code}`;

                        return (
                          <div className="bg-white p-6 rounded-2xl border-2 border-primary/10 shadow-sm relative group">
                            <img
                              src={qrCodeSrc}
                              alt="QR Code PIX"
                              className="w-64 h-64"
                            />
                            <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-xs font-bold text-primary uppercase tracking-widest">Escaneie no app do Banco</p>
                            </div>
                          </div>
                        );
                      } else if (payment.pix_copy_paste) {
                        const cleanPixCode = payment.pix_copy_paste.replace(/\s+/g, '');
                        return (
                          <div className="bg-white p-6 rounded-2xl border-2 border-primary/10 shadow-sm">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(cleanPixCode)}`}
                              alt="QR Code PIX"
                              className="w-64 h-64"
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {payment.pix_copy_paste && (
                      <div className="w-full max-w-md space-y-3">
                        <Label className="text-sm text-muted-foreground text-center block">
                          Ou utilize o código Copia e Cola:
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={payment.pix_copy_paste.replace(/\s+/g, '')}
                            readOnly
                            className="font-mono text-xs h-12 bg-muted/20 border-border focus-visible:ring-primary"
                          />
                          <Button onClick={copyPixCode} variant="outline" className="h-12 px-6 shrink-0 border-border">
                            {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </Button>
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground">
                          Código gerado em {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={async () => {
                        if (payment.id) {
                          toast.loading("Sincronizando...");
                          const refreshed = await refreshPixQrCode(payment.id);
                          if (refreshed) await loadRegistration();
                          toast.dismiss();
                        }
                      }}
                      variant="outline"
                      className="h-12 border-border"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Atualizar QR Code
                    </Button>
                    <Button
                      onClick={() => setPayment(null)}
                      variant="ghost"
                      className="h-12"
                    >
                      Mudar para Cartão
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/20 rounded-xl border border-dashed border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-bold text-sm">Próximos Passos</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-8 list-disc">
                      <li>Use o app do seu banco para ler o QR Code ou cole o código acima.</li>
                      <li>A confirmação será processada pelo sistema automaticamente.</li>
                      <li>Você será redirecionado assim que o pagamento for detectado.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT SIDE: Order Summary */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 order-2 lg:order-2">
            <Card className="shadow-md border-border bg-card/50">
              <CardHeader className="bg-muted/10 pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Resumo do Pedido</CardTitle>
                    <CardDescription>
                      {registration.championships.name}
                    </CardDescription>
                  </div>
                  <Badge variant={registration.payment_status === "approved" ? "default" : "secondary"} className="uppercase text-[10px]">
                    {registration.payment_status === "approved"
                      ? "Pago"
                      : hasManualPix
                        ? "À confirmar"
                        : "Pendente"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="space-y-4 text-sm">
                    {registration.categories?.has_batches && registration.batch_name && (
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Lote</span>
                        <p className="font-medium text-base leading-tight">
                          {registration.batch_name}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Atleta</span>
                      <p className="font-medium text-base leading-tight">{registration.athlete_name}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Categoria</span>
                      <p className="font-medium leading-tight">{registration.categories?.name}</p>
                    </div>
                    {registration.team_name && (
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Equipe</span>
                        <p className="font-medium leading-tight">{registration.team_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    {/* 1. Base Price (Subtotal) */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Valor Inscrição:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(basePrice)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Taxa de Serviço:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency((registration?.platform_fee_cents || 0) + PIX_FEE_CENTS)}
                      </span>
                    </div>

                    {/* 3. Credit Card Surcharge (Interest/Processing) */}
                    {paymentMethod === 'credit_card' && (
                      <div className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-top-1 duration-300">
                        <span className="text-muted-foreground font-medium">Acréscimo Cartão:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Math.max(0, dynamicTotal - (Math.max(0, basePrice - discountCents) + (registration?.platform_fee_cents || 0) + PIX_FEE_CENTS)))}
                        </span>
                      </div>
                    )}
                  </div>

                  {discountCents > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span className="font-medium flex items-center gap-1"><Ticket className="w-3 h-3" /> Desconto do Cupom:</span>
                      <span className="font-bold">
                        - {(() => {
                          // Calculate Gross Total again to find the difference
                          const grossTargetNet = basePrice + registration.platform_fee_cents;
                          let grossTotal = 0;
                          if (paymentMethod === "pix") {
                            grossTotal = grossTargetNet + PIX_FEE_CENTS;
                          } else {
                            let feePercent = CREDIT_CARD_FEES["1"];
                            if (installments >= 2 && installments <= 6) feePercent = CREDIT_CARD_FEES["2-6"];
                            if (installments >= 7) feePercent = CREDIT_CARD_FEES["7-12"];
                            grossTotal = Math.ceil((grossTargetNet + ASAAS_FIXED_FEE_CENTS) / (1 - feePercent));
                          }
                          return formatCurrency(grossTotal - dynamicTotal);
                        })()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Forma de pagamento:</span>
                    <div className="text-right">
                      {paymentMethod === 'pix' ? (
                        <span className="font-bold text-foreground">PIX</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-blue-400">{installments}x de {formatCurrency(dynamicTotal / installments)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-primary/20">
                    <span className="text-foreground">Total a Pagar:</span>
                    <span className="text-green-500">{formatCurrency(dynamicTotal || registration.total_cents)}</span>
                  </div>

                  <div className="pt-6 space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cupom de desconto</Label>
                    {appliedCoupon ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-green-600 text-sm flex items-center gap-2">
                            <Ticket className="w-4 h-4" />
                            {appliedCoupon.code}
                          </p>
                          <p className="text-xs text-green-700/80 mt-0.5">
                            Desconto de {formatCurrency(discountCents)} aplicado
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={removeCoupon}
                          className="h-8 w-8 p-0 text-green-700 hover:text-green-800 hover:bg-green-500/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-0">
                        <Input
                          placeholder="Digite seu cupom"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          className="rounded-r-none border-r-0 h-10 bg-muted/20 focus-visible:ring-0 focus-visible:ring-offset-0 border-border"
                        />
                        <Button
                          onClick={() => setCouponCode("")}
                          variant="outline"
                          className="rounded-none border-x-0 border-border px-3 h-10 hover:bg-muted/50 transition-colors"
                          disabled={!couponCode}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon || !couponCode}
                          className="rounded-l-none h-10 bg-[#D71C1D] hover:bg-[#b51718] text-white flex gap-2 font-bold shadow-sm transition-all active:scale-95"
                        >
                          {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                          Aplicar
                        </Button>
                      </div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>

            <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pagamento seguro processado via **Asaas**. Seus dados estão protegidos por criptografia de ponta a ponta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
