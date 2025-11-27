import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, QrCode, Shield, Copy, CheckCircle2, CreditCard } from "lucide-react";
import { getPixPayloadForDisplay } from "@/utils/pix";

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
  const [hasAsaasIntegration, setHasAsaasIntegration] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    loadRegistration();
    const method = searchParams.get("method");
    if (method === "credit_card") {
      setPaymentMethod("credit_card");
    }
  }, [registrationId, searchParams]);

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
      setRegistration(reg);
      
      // Inicializar CPF do cartão com o CPF da inscrição se disponível
      if (reg.athlete_cpf && !cardData.cpf) {
        const formattedCpf = reg.athlete_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        setCardData(prev => ({ ...prev, cpf: formattedCpf }));
      }

      // Verificar se o campeonato tem integração Asaas e se é sandbox
      if (reg.championships?.organizer_id) {
        const { data: integration } = await supabase
          .from("organizer_asaas_integrations")
          .select("id, asaas_api_key")
          .eq("organizer_id", reg.championships.organizer_id)
          .eq("is_active", true)
          .maybeSingle();
        
        setHasAsaasIntegration(!!integration);
        // Verificar se é sandbox (API key começa com $aact_hmlg_)
        if (integration?.asaas_api_key) {
          setIsSandbox(integration.asaas_api_key.startsWith("$aact_hmlg_"));
        }
      }

      if (reg.payment_id) {
        const { data: pay, error: payError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", reg.payment_id)
          .single();

        if (!payError && pay) {
          setPayment(pay);
          
          // Se for PIX e não tiver QR Code ou código copia e cola, tentar atualizar
          if (pay.payment_method === "pix" && pay.asaas_payment_id && (!pay.pix_qr_code || !pay.pix_copy_paste)) {
            console.log("QR Code PIX não encontrado, tentando atualizar...");
            await refreshPixQrCode(pay.id);
          }
        }
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    setProcessing(true);
    
    try {
      // Validar dados do cartão se método for cartão de crédito
      if (paymentMethod === "credit_card") {
        if (!cardData.holderName.trim()) {
          toast.error("Digite o nome do portador do cartão");
          setProcessing(false);
          return;
        }
        if (!cardData.number.replace(/\s/g, "").match(/^\d{13,19}$/)) {
          toast.error("Número do cartão inválido");
          setProcessing(false);
          return;
        }
        if (!cardData.expiryMonth || !cardData.expiryYear) {
          toast.error("Digite a data de validade do cartão");
          setProcessing(false);
          return;
        }
        if (!cardData.cvv.match(/^\d{3,4}$/)) {
          toast.error("CVV inválido");
          setProcessing(false);
          return;
        }
        // Validar CPF - usar o CPF do portador do cartão se informado, senão usar o CPF do atleta
        const cpfToUse = cardData.cpf.trim() || registration?.athlete_cpf;
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
        // Validar CEP (obrigatório pelo Asaas)
        const postalCodeClean = cardData.postalCode.replace(/\D/g, "");
        console.log("CEP validation:", {
          original: cardData.postalCode,
          cleaned: postalCodeClean,
          length: postalCodeClean.length,
        });
        if (!postalCodeClean || postalCodeClean.length !== 8) {
          toast.error("CEP é obrigatório e deve ter 8 dígitos");
          setProcessing(false);
          return;
        }
      }

      // Não precisa de autenticação - a inscrição pública não cria usuário
      // A Edge Function usa service_role_key e não precisa de JWT do usuário
      // Para cartão de crédito, usar CPF do portador do cartão se informado, senão usar CPF do atleta
      const cpfToUse = paymentMethod === "credit_card" 
        ? (cardData.cpf.trim() || registration.athlete_cpf)?.replace(/\D/g, "") 
        : registration.athlete_cpf;

      console.log("Calling create-payment with:", {
        registrationId: registration.id,
        categoryId: registration.category_id,
        athleteName: registration.athlete_name,
        athleteEmail: registration.athlete_email,
        athleteCpf: cpfToUse,
        athleteBirthDate: registration.athlete_birth_date,
        priceCents: registration.total_cents, // Usar total_cents que já inclui a taxa de 5%
        paymentMethod,
      });

      // Chamar diretamente via fetch para evitar problemas com JWT
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
          athleteCpf: paymentMethod === "credit_card" 
            ? (cardData.cpf.trim() || registration.athlete_cpf)?.replace(/\D/g, "") 
            : registration.athlete_cpf,
          athleteBirthDate: registration.athlete_birth_date,
          teamName: registration.team_name,
          priceCents: registration.total_cents, // Usar total_cents que já inclui a taxa de 5%
          paymentMethod,
          cardData: paymentMethod === "credit_card" ? {
            holderName: cardData.holderName,
            number: cardData.number.replace(/\s/g, ""),
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            cvv: cardData.cvv,
            postalCode: cardData.postalCode.replace(/\D/g, ""), // CEP sem formatação
            addressNumber: (cardData.addressNumber && cardData.addressNumber.trim()) || "S/N", // Número do endereço ou "S/N"
          } : undefined,
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
      console.log("Full error object:", JSON.stringify(error, null, 2));
      console.log("Full data object:", JSON.stringify(data, null, 2));

      // Verificar se há erro na resposta
      if (error) {
        let errorMessage = error.message || "Erro ao criar pagamento";
        
        // Tentar extrair mensagem de erro mais detalhada da resposta
        try {
          // Se o erro tem uma propriedade context ou response, tentar extrair
          if (error.context && error.context.body) {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          }
          
          // Tentar extrair do data também
          if (data?.error) {
            errorMessage = data.error;
          } else if (data?.details) {
            errorMessage = `${data.error || errorMessage}\n\nDetalhes: ${data.details}`;
          }
        } catch (e) {
          console.error("Error parsing error message:", e);
        }
        
        toast.error(errorMessage, {
          duration: 15000, // Mostrar por 15 segundos
        });
        console.error("Payment creation error - Full details:", {
          error,
          errorString: JSON.stringify(error, null, 2),
          data,
          dataString: JSON.stringify(data, null, 2)
        });
        return;
      }

      // Verificar se a resposta tem erro mesmo sem error object
      if (data?.error) {
        toast.error(data.error, {
          duration: 10000,
        });
        console.error("Payment creation error in data:", data);
        return;
      }

      // Verificar se foi sucesso
      if (data?.success) {
        if (paymentMethod === "credit_card") {
          // Recarregar após um delay para verificar status
          setTimeout(async () => {
            await loadRegistration();
          }, 2000);
        } else {
          // Para PIX, atualizar o estado imediatamente com os dados retornados
          if (data.payment) {
            // A resposta vem em camelCase (pixQrCode, pixCopyPaste)
            // Converter para snake_case para compatibilidade com o estado
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
            console.log("Atualizando payment state com:", paymentData);
            setPayment(paymentData);
            
            // Atualizar também o registration para incluir o payment_id
            if (registration) {
              setRegistration({
                ...registration,
                payment_id: data.payment.id,
                payment_status: "pending",
              });
            }
          }
        }
        // Sempre recarregar para garantir que temos os dados mais atualizados do banco
        await loadRegistration();
      } else {
        toast.error("Resposta inesperada do servidor");
        console.error("Unexpected response:", data);
      }
    } catch (error: any) {
      console.error("Payment creation exception:", error);
      const errorMessage = error.message || error.error || "Erro ao criar pagamento";
      toast.error(errorMessage, {
        duration: 10000,
      });
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

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-4 sm:py-12 px-2 sm:px-4">
      <div className="container mx-auto max-w-4xl px-2 sm:px-4">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Checkout</CardTitle>
                <CardDescription>
                  {registration.championships.name} - {registration.categories.name}
                </CardDescription>
              </div>
              <Badge variant={registration.payment_status === "approved" ? "default" : "secondary"}>
                {registration.payment_status === "approved"
                  ? "Pago"
                  : hasManualPix
                  ? "À confirmar"
                  : "Pendente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Atleta:</span>
                  <p className="font-medium">{registration.athlete_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{registration.athlete_email}</p>
                </div>
                {registration.team_name && (
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">{registration.team_name}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(registration.subtotal_cents)}</span>
                </div>
                {registration.platform_fee_cents > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxa de serviço</span>
                    <span>{formatPrice(registration.platform_fee_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(registration.total_cents)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {registration.payment_status === "approved" ? (
          <Card className="border-primary">
            <CardContent className="pt-6 px-3 sm:px-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold">Pagamento Confirmado!</h3>
                <p className="text-muted-foreground">
                  Sua inscrição foi confirmada. Você receberá um email com os detalhes.
                </p>
                <Button onClick={() => navigate(`/public/${registration.championships.slug}/leaderboard`)}>
                  Ver Leaderboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : hasManualPix ? (
          <Card>
            <CardHeader>
              <CardTitle>Pagamento via PIX</CardTitle>
              <CardDescription>
                Utilize o QR Code abaixo para concluir o pagamento diretamente com o organizador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-3 sm:px-6">
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
                    <Input value={pixCopyPayload} readOnly className="font-mono text-xs" />
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

              <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <QrCode className="w-4 h-4 text-primary" />
                  Como prosseguir
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Realize o pagamento via PIX utilizando o QR Code ou o código acima.</li>
                  <li>Salve o comprovante. O organizador pode solicitá-lo para validação.</li>
                  <li>
                    Assim que o repasse for confirmado, sua inscrição constará como “Pago” no painel do
                    organizador.
                  </li>
                </ol>
              </div>
              <Button onClick={() => navigate(`/links/${registration.championships.slug}`)}>
                Voltar para a página do evento
              </Button>
            </CardContent>
          </Card>
        ) : !payment ? (
          <Card>
            <CardHeader>
              <CardTitle>Escolha o Método de Pagamento</CardTitle>
              <CardDescription>Selecione como deseja pagar sua inscrição</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-3 sm:px-6">
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "pix" | "credit_card")}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5" />
                      <div>
                        <div className="font-medium">PIX</div>
                        <div className="text-sm text-muted-foreground">Pagamento instantâneo</div>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Cartão de Crédito</div>
                          <div className="text-sm text-muted-foreground">Pagamento seguro via Asaas</div>
                        </div>
                      </div>
                    </Label>
                  </div>
              </RadioGroup>

              {paymentMethod === "credit_card" && (
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Dados do Cartão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-3 sm:px-6">
                    <div className="space-y-2">
                      <Label htmlFor="holderName">Nome no Cartão *</Label>
                      <Input
                        id="holderName"
                        value={cardData.holderName}
                        onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
                        placeholder="NOME COMO ESTÁ NO CARTÃO"
                        className="uppercase"
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
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
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
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF do Portador do Cartão *</Label>
                      <Input
                        id="cpf"
                        value={cardData.cpf}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          // Formatar como CPF (11 dígitos)
                          let formatted = value;
                          if (value.length <= 11) {
                            formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                          }
                          setCardData({ ...cardData, cpf: formatted });
                        }}
                        placeholder={registration?.athlete_cpf ? "Deixe em branco para usar CPF da inscrição" : "000.000.000-00"}
                        maxLength={14}
                      />
                      {registration?.athlete_cpf && (
                        <p className="text-xs text-muted-foreground">
                          CPF da inscrição: {registration.athlete_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1">
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
                        />
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label htmlFor="addressNumber">Número</Label>
                        <Input
                          id="addressNumber"
                          value={cardData.addressNumber}
                          onChange={(e) => {
                            setCardData({ ...cardData, addressNumber: e.target.value });
                          }}
                          placeholder="Deixe em branco se não tiver"
                          maxLength={10}
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Seus dados são processados de forma segura pela Asaas. Não armazenamos informações do cartão.
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={createPayment} 
                disabled={processing}
                size="lg"
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {paymentMethod === "credit_card" ? "Processando pagamento..." : "Gerando registro..."}
                  </>
                ) : (
                  paymentMethod === "credit_card" ? "Pagar com Cartão" : "Gerar PIX"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pagamento via PIX</CardTitle>
              <CardDescription>Escaneie o QR Code ou copie o código para pagar</CardDescription>
              {isSandbox && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Ambiente SANDBOX detectado
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Os códigos PIX gerados no sandbox <strong>não funcionam</strong> em apps bancários reais. 
                    Eles são apenas para testes da API. Para pagamentos reais, configure uma API key de produção.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6 px-3 sm:px-6">
              <div className="text-center space-y-4 py-6">
                {(() => {
                  // Debug: verificar o que temos no payment
                  console.log("Payment state:", {
                    hasPixQrCode: !!payment.pix_qr_code,
                    pixQrCodeLength: payment.pix_qr_code?.length,
                    hasPixCopyPaste: !!payment.pix_copy_paste,
                    pixCopyPasteLength: payment.pix_copy_paste?.length,
                    paymentKeys: Object.keys(payment || {}),
                  });
                  
                  if (payment.pix_qr_code) {
                    const qrCodeSrc = payment.pix_qr_code.startsWith('data:image') 
                      ? payment.pix_qr_code 
                      : `data:image/png;base64,${payment.pix_qr_code}`;
                    
                    return (
                      <div className="bg-white p-4 rounded-lg inline-block border shadow-sm">
                        <img 
                          src={qrCodeSrc}
                          alt="QR Code PIX"
                          className="w-60 h-60"
                          onError={(e) => {
                            console.error("Erro ao carregar QR Code:", e);
                            console.error("QR Code source:", qrCodeSrc.substring(0, 100));
                          }}
                        />
                      </div>
                    );
                  } else if (payment.pix_copy_paste) {
                    // Limpar espaços do código PIX antes de gerar QR Code
                    const cleanPixCode = payment.pix_copy_paste.replace(/\s+/g, '');
                    return (
                      <div className="bg-white p-4 rounded-lg inline-block border shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(cleanPixCode)}`}
                          alt="QR Code PIX"
                          className="w-60 h-60"
                          onError={(e) => {
                            console.error("Erro ao gerar QR Code do payload:", e);
                          }}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        QR Code não disponível. Use o código copia e cola abaixo.
                      </div>
                    );
                  }
                })()}
                
                {payment.pix_copy_paste && (
                  <div className="space-y-2 max-w-2xl mx-auto">
                    <p className="text-sm text-muted-foreground">
                      Ou copie o código PIX "copia e cola":
                    </p>
                    <div className="flex gap-2">
                      <Input 
                        value={payment.pix_copy_paste.replace(/\s+/g, '')} 
                        readOnly 
                        className="font-mono text-xs break-all"
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onClick={(e) => {
                          // Selecionar todo o texto ao clicar também
                          (e.target as HTMLInputElement).select();
                        }}
                      />
                      <Button onClick={copyPixCode} variant="outline" className="shrink-0">
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-green-600 font-medium">
                        ✅ Código sem espaços - pronto para copiar e colar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tamanho: {payment.pix_copy_paste.replace(/\s+/g, '').length} caracteres
                      </p>
                    </div>
                  </div>
                )}

                {/* Botão para atualizar QR Code se necessário */}
                {payment.id && payment.payment_method === "pix" && (
                  <div className="text-center pt-4">
                    <Button 
                      onClick={async () => {
                        if (payment.id) {
                          toast.loading("Atualizando QR Code...");
                          const refreshed = await refreshPixQrCode(payment.id);
                          if (refreshed) {
                            await loadRegistration();
                          } else {
                            toast.error("Não foi possível atualizar o QR Code. Verifique se o pagamento ainda está válido.");
                          }
                        }
                      }} 
                      variant="outline"
                      className="mt-2"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Atualizar QR Code
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Se o código PIX não funcionar, clique aqui para atualizar
                    </p>
                  </div>
                )}

          {!payment.pix_qr_code && !payment.pix_copy_paste && payment.id && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                QR Code PIX não disponível. Clique no botão abaixo para atualizar.
              </p>
              <Button 
                onClick={async () => {
                  if (payment.id) {
                    const refreshed = await refreshPixQrCode(payment.id);
                    if (!refreshed) {
                      toast.error("Não foi possível atualizar o QR Code. Tente criar um novo pagamento.");
                    }
                  }
                }} 
                variant="outline"
              >
                Atualizar QR Code
              </Button>
            </div>
          )}

                {(payment.pix_qr_code || payment.pix_copy_paste) && (
                  <Badge variant="secondary" className="mt-4">
                    <QrCode className="w-3 h-3 mr-1" />
                    Pagamento identificado automaticamente após confirmação
                  </Badge>
                )}
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Pagamento direto ao organizador</p>
                    <p className="text-muted-foreground">
                      O pagamento é feito diretamente para o organizador do evento via PIX. Após o pagamento, o organizador confirmará sua inscrição.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`}
      {...props}
    />
  );
}