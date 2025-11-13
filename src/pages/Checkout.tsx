import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, CreditCard, QrCode, FileText, Shield, Copy, CheckCircle2 } from "lucide-react";
import { getPixPayloadForDisplay } from "@/utils/pix";

export default function Checkout() {
  const { registrationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [registration, setRegistration] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadRegistration();
  }, [registrationId]);

  const loadRegistration = async () => {
    try {
      const { data: reg, error: regError } = await supabase
        .from("registrations")
        .select("*, categories(*), championships(*)")
        .eq("id", registrationId)
        .single();

      if (regError) throw regError;
      setRegistration(reg);

      if (reg.payment_id) {
        const { data: pay, error: payError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", reg.payment_id)
          .single();

        if (!payError && pay) {
          setPayment(pay);
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
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          registrationId: registration.id,
          categoryId: registration.category_id,
          athleteName: registration.athlete_name,
          athleteEmail: registration.athlete_email,
          athletePhone: registration.athlete_phone,
          teamName: registration.team_name,
          priceCents: registration.subtotal_cents,
        },
      });

      if (error) throw error;

      toast.success("Pagamento criado! Escolha sua forma de pagamento.");
      await loadRegistration();
    } catch (error: any) {
      toast.error("Erro ao criar pagamento");
      console.error(error);
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
    const codeToCopy = hasManualPix ? pixCopyPayload : payment?.pix_copy_paste;
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
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
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <span>Subtotal</span>
                  <span>{formatPrice(registration.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de serviço (5%)</span>
                  <span className="text-muted-foreground">{formatPrice(registration.platform_fee_cents)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(registration.total_cents)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {registration.payment_status === "approved" ? (
          <Card className="border-primary">
            <CardContent className="pt-6">
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
            <CardContent className="space-y-6">
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
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Shield className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-xl font-bold">Pagamento Seguro</h3>
                <p className="text-muted-foreground">
                  Processamento seguro via Asaas
                </p>
                <Button 
                  onClick={createPayment} 
                  disabled={processing}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando pagamento...
                    </>
                  ) : (
                    "Gerar Pagamento"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Escolha a forma de pagamento</CardTitle>
              <CardDescription>Selecione como deseja pagar sua inscrição</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pix" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pix">
                    <QrCode className="w-4 h-4 mr-2" />
                    PIX
                  </TabsTrigger>
                  <TabsTrigger value="card">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cartão
                  </TabsTrigger>
                  <TabsTrigger value="boleto">
                    <FileText className="w-4 h-4 mr-2" />
                    Boleto
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pix" className="space-y-4">
                  <div className="text-center space-y-4 py-6">
                    {payment.pix_qr_code && (
                      <div className="bg-white p-4 rounded-lg inline-block">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.pix_qr_code)}`}
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Ou copie o código PIX:
                      </p>
                      <div className="flex gap-2 max-w-md mx-auto">
                        <Input 
                          value={payment.pix_copy_paste} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                        <Button onClick={copyPixCode} variant="outline">
                          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      Pagamento identificado automaticamente
                    </Badge>
                  </div>
                </TabsContent>

                <TabsContent value="card" className="space-y-4">
                  <div className="text-center py-8">
                    <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Você será redirecionado para o ambiente seguro de pagamento
                    </p>
                    <Button size="lg" asChild>
                      <a href={payment.payment_url} target="_blank" rel="noopener noreferrer">
                        Pagar com Cartão
                      </a>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="boleto" className="space-y-4">
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Baixe o boleto e pague em qualquer banco
                    </p>
                    <Button size="lg" asChild>
                      <a href={payment.boleto_url} target="_blank" rel="noopener noreferrer">
                        Baixar Boleto
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4">
                      Prazo de compensação: até 3 dias úteis
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Pagamento 100% seguro</p>
                    <p className="text-muted-foreground">
                      Seus dados são criptografados e protegidos. Processamento via Asaas.
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