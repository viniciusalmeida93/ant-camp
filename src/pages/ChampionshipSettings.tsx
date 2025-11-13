import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, QrCode, Copy, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useChampionship } from "@/contexts/ChampionshipContext";
import { getPixPayloadForDisplay, isEmvPixPayload } from "@/utils/pix";

export default function ChampionshipSettings() {
  const navigate = useNavigate();
  const { championshipId } = useParams<{ championshipId: string }>();
  const { championships, setSelectedChampionship, loadChampionships } = useChampionship();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [championship, setChampionship] = useState<any>(null);
  const [showColumnError, setShowColumnError] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    location: "",
    date: "",
    pixPayload: "",
    asaasWalletId: "",
  });

  useEffect(() => {
    checkAuth();
    ensurePixColumnExists();
    loadChampionship();
    checkAsaasConnection();
  }, [championshipId]);

  const checkAsaasConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("organizer_asaas_integrations")
        .select("id, is_active")
        .eq("organizer_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      setAsaasConnected(!!data);
    } catch (error) {
      console.error("Error checking Asaas connection:", error);
    }
  };

  const ensurePixColumnExists = async () => {
    try {
      // Tenta verificar se a coluna existe fazendo uma query simples
      const { error: testError } = await supabase
        .from("championships")
        .select("pix_payload")
        .limit(1);

      // Se der erro relacionado à coluna, mostra instruções para executar SQL
      if (testError && (testError.message.includes("pix_payload") || testError.message.includes("column") || testError.message.includes("schema cache"))) {
        console.warn("Coluna pix_payload não encontrada. É necessário executar a migration.");
        setShowColumnError(true);
      } else {
        setShowColumnError(false);
      }
    } catch (error) {
      console.error("Error checking pix_payload column:", error);
    }
  };

  useEffect(() => {
    if (!championshipId) return;
    const existing = championships.find((c) => c.id === championshipId);
    if (existing) {
      setChampionship(existing);
      setFormData({
        name: existing.name,
        slug: existing.slug,
        location: existing.location,
        date: existing.date ? existing.date.split("T")[0] : "",
        pixPayload: existing.pix_payload || "",
        asaasWalletId: existing.asaas_wallet_id || "",
      });
      setSelectedChampionship(existing);
      setLoading(false);
    }
  }, [championshipId, championships, setSelectedChampionship]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: champs, error } = await supabase
      .from("championships")
      .select("id")
      .eq("id", championshipId)
      .eq("organizer_id", session.user.id)
      .maybeSingle();

    if (error || !champs) {
      toast.error("Você não tem acesso a este campeonato");
      navigate("/dashboard");
    }
  };

  const loadChampionship = async () => {
    if (!championshipId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("championships")
        .select("id, name, slug, location, date, pix_payload, asaas_wallet_id, is_published")
        .eq("id", championshipId)
        .single();

      if (error) throw error;

      setChampionship(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        location: data.location,
        date: data.date ? data.date.split("T")[0] : "",
        pixPayload: data.pix_payload || "",
        asaasWalletId: data.asaas_wallet_id || "",
      });
    } catch (error: any) {
      console.error("Error loading championship:", error);
      toast.error("Erro ao carregar campeonato");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!championshipId) return;

    try {
      setSaving(true);
      const payload = formData.pixPayload.trim();
      
      // Validação básica do PIX
      if (payload) {
        // Se for uma chave simples, verifica se tem formato válido
        if (!isEmvPixPayload(payload)) {
          // Validação básica de chave PIX (email, telefone, CPF/CNPJ, chave aleatória)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          const cpfCnpjRegex = /^\d{11,14}$/;
          
          const isValidKey = 
            emailRegex.test(payload) ||
            phoneRegex.test(payload.replace(/\D/g, '')) ||
            cpfCnpjRegex.test(payload.replace(/\D/g, '')) ||
            payload.length >= 10; // Chave aleatória genérica
            
          if (!isValidKey && payload.length < 10) {
            toast.error("Chave PIX inválida. Verifique se está correta.");
            setSaving(false);
            return;
          }
        }
      }

      const walletId = formData.asaasWalletId.trim();
      const updateData: Record<string, any> = {
        pix_payload: payload || null,
        asaas_wallet_id: walletId || null,
      };

      if (formData.location.trim()) {
        updateData.location = formData.location.trim();
      }

      if (formData.date) {
        updateData.date = formData.date;
      }

      const { error } = await supabase
        .from("championships")
        .update(updateData)
        .eq("id", championshipId);

      if (error) throw error;

      const updatedChampionship = {
        ...(championship || {}),
        pix_payload: payload || null,
        asaas_wallet_id: walletId || null,
      };
      setChampionship(updatedChampionship);
      if (championshipId) {
        setSelectedChampionship(updatedChampionship);
      }
      await loadChampionships();

      toast.success("Configurações atualizadas com sucesso!");
      await loadChampionship();
    } catch (error: any) {
      console.error("Error saving championship:", error);
      toast.error(
        error?.message
          ? `Não foi possível salvar as configurações: ${error.message}`
          : "Não foi possível salvar as configurações"
      );
    } finally {
      setSaving(false);
    }
  };

  const pixDisplayData = useMemo(
    () =>
      getPixPayloadForDisplay({
        rawPayload: formData.pixPayload,
        merchantName: championship?.name,
        merchantCity: championship?.location,
      }),
    [formData.pixPayload, championship?.name, championship?.location]
  );

  const handleCopyPix = async () => {
    if (!pixDisplayData.copyPayload) return;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(pixDisplayData.copyPayload);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopying(false), 3000);
    } catch (error) {
      toast.error("Não foi possível copiar");
      setCopying(false);
    }
  };

  const pixPreviewUrl = useMemo(() => {
    if (!pixDisplayData.qrPayload) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      pixDisplayData.qrPayload
    )}`;
  }, [pixDisplayData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Campeonato não encontrado</CardTitle>
            <CardDescription>Tente voltar ao dashboard e selecionar novamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold">Configurações do Campeonato</h1>
                <p className="text-sm text-muted-foreground">
                  Atualize informações gerais e dados de cobrança
                </p>
              </div>
              <Badge variant={championship.is_published ? "default" : "secondary"}>
                {championship.is_published ? "Publicado" : "Rascunho"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {showColumnError && (
          <Alert variant="destructive">
            <AlertDescription>
              <p className="font-semibold mb-2">⚠️ Coluna pix_payload não encontrada no banco de dados</p>
              <p className="mb-3">Para corrigir, execute este SQL no Supabase Dashboard:</p>
              <div className="bg-muted p-3 rounded-md mb-3">
                <code className="text-xs break-all">
                  ALTER TABLE public.championships ADD COLUMN IF NOT EXISTS pix_payload TEXT;
                </code>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Acesse o <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a></li>
                <li>Vá em <strong>SQL Editor</strong></li>
                <li>Cole o comando SQL acima e clique em <strong>Run</strong></li>
                <li>Recarregue esta página</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos via PIX</CardTitle>
            <CardDescription>
              Cadastre a chave ou payload PIX que será exibido para os atletas durante a inscrição.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">Como configurar o PIX:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Chave PIX simples:</strong> Cole sua chave (email, CPF/CNPJ, telefone ou chave aleatória)</li>
                  <li><strong>Código "Copia e Cola":</strong> Cole o código completo do QR Code PIX (começa com 000201)</li>
                  <li>O sistema gera automaticamente o QR Code a partir da chave, ou usa o código completo se fornecido</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="pixPayload">Chave/QR Code PIX *</Label>
              <Textarea
                id="pixPayload"
                value={formData.pixPayload}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pixPayload: e.target.value }))
                }
                placeholder="Exemplo de chave: seuemail@exemplo.com ou 00020126360014BR.GOV.BCB.PIX..."
                rows={4}
                className="font-mono text-sm"
              />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Aceitamos chave simples (email, CPF/CNPJ, telefone, chave aleatória) ou o código "copia e cola" completo do QR Code.
                </p>
                {pixDisplayData.generatedFromKey && (
                  <p className="text-primary font-medium">
                    ✓ Geramos automaticamente o código "copia e cola" a partir da sua chave para garantir que o QR Code funcione.
                  </p>
                )}
                {formData.pixPayload && !pixDisplayData.generatedFromKey && isEmvPixPayload(formData.pixPayload) && (
                  <p className="text-primary font-medium">
                    ✓ Código "copia e cola" detectado. O QR Code será gerado diretamente deste código.
                  </p>
                )}
              </div>
            </div>

            {pixPreviewUrl ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-lg border p-4 bg-muted/40">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center bg-white p-4 rounded-lg border-2 border-primary/20 shadow-sm">
                      <img
                        src={pixPreviewUrl}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Escaneie com o app do seu banco
                    </p>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-primary" />
                      <p className="font-semibold text-lg">Pré-visualização do QR Code</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Este QR Code será exibido aos atletas na tela de checkout. 
                      <strong className="text-foreground"> Teste o pagamento com um valor simbólico</strong> para garantir que está tudo correto antes de publicar o campeonato.
                    </p>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Código "Copia e Cola" PIX:</Label>
                      <div className="flex gap-2">
                        <Textarea
                          value={pixDisplayData.copyPayload}
                          readOnly
                          className="font-mono text-xs h-20 resize-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopyPix}
                          disabled={copying || !pixDisplayData.copyPayload}
                          className="shrink-0"
                        >
                          {copying ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Dica:</strong> Após salvar, você pode testar o QR Code escaneando-o com o app do seu banco. 
                    Se aparecer um erro, verifique se a chave PIX está correta e se está ativa no seu banco.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted/20">
                <QrCode className="w-4 h-4" />
                <span>Nenhum QR Code disponível — informe uma chave PIX acima para gerar a visualização.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSave} disabled={saving} className="sm:w-auto">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
              <Button
                variant="outline"
                onClick={loadChampionship}
                disabled={saving}
                className="sm:w-auto"
              >
                Recarregar dados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Asaas Split Payment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Split de Pagamento Automático (Asaas)</span>
              {asaasConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Asaas Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Não Conectado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure sua wallet Asaas para receber automaticamente 95% dos pagamentos. Os 5% restantes ficam para a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!asaasConnected && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="font-medium mb-2">⚠️ Conta Asaas não conectada</p>
                  <p className="text-sm mb-2">
                    Para usar o split automático, você precisa conectar sua conta Asaas primeiro.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = "/asaas-integration"}
                  >
                    Conectar Conta Asaas
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">Como funciona o Split Automático:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Quando um atleta paga, o Asaas divide automaticamente o pagamento</li>
                  <li><strong>95% vai direto para sua wallet Asaas</strong></li>
                  <li><strong>5% fica para a plataforma</strong> (taxa de serviço)</li>
                  <li>Tudo acontece na mesma transação - você não precisa fazer nada!</li>
                  <li>O dinheiro é liberado no prazo normal do Asaas</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="asaasWalletId">ID da Wallet/Subconta Asaas</Label>
              <Input
                id="asaasWalletId"
                value={formData.asaasWalletId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, asaasWalletId: e.target.value }))
                }
                placeholder="wallet_xxxxx ou subaccount_xxxxx"
                className="font-mono text-sm"
              />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Para obter sua wallet ID:
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Acesse o painel do Asaas</li>
                  <li>Vá em <strong>Minha Conta → Carteiras</strong> ou <strong>Subcontas</strong></li>
                  <li>Copie o ID da wallet/subconta que deseja usar</li>
                  <li>Cole aqui e salve</li>
                </ol>
                {formData.asaasWalletId && (
                  <p className="text-primary font-medium mt-2">
                    ✓ Split automático ativado! Você receberá 95% dos pagamentos automaticamente.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSave} disabled={saving} className="sm:w-auto">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
              <Button
                variant="outline"
                onClick={loadChampionship}
                disabled={saving}
                className="sm:w-auto"
              >
                Recarregar dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

