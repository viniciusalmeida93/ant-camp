import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink, Shield, DollarSign, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AsaasIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    walletId: "",
  });
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    validated: false,
    lastValidated: null as string | null,
  });

  useEffect(() => {
    checkAuth();
    loadIntegration();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadIntegration = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("organizer_asaas_integrations")
        .select("*")
        .eq("organizer_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setIntegration(data);
        setFormData({
          apiKey: data.asaas_api_key ? "•".repeat(20) : "", // Masked
          walletId: data.asaas_wallet_id || "",
        });
        setConnectionStatus({
          connected: true,
          validated: !!data.last_validated_at,
          lastValidated: data.last_validated_at,
        });
      }
    } catch (error: any) {
      console.error("Error loading integration:", error);
      toast.error("Erro ao carregar integração");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!formData.apiKey) {
      toast.error("Por favor, insira sua chave de API do Asaas");
      return;
    }

    setTesting(true);
    try {
      // Test API key by fetching account info
      const response = await fetch("https://www.asaas.com/api/v3/myAccount", {
        headers: {
          "access_token": formData.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.description || "Chave de API inválida");
      }

      const accountData = await response.json();

      // If wallet ID is provided, validate it
      if (formData.walletId) {
        const walletsResponse = await fetch("https://www.asaas.com/api/v3/myAccount/wallets", {
          headers: {
            "access_token": formData.apiKey,
          },
        });

        if (walletsResponse.ok) {
          const wallets = await walletsResponse.json();
          const walletExists = wallets.data?.some((w: any) => w.id === formData.walletId);
          
          if (!walletExists) {
            toast.warning("Wallet ID não encontrado. Verifique se está correto.");
          }
        }
      }

      setConnectionStatus({
        connected: true,
        validated: true,
        lastValidated: new Date().toISOString(),
      });

      toast.success("Conexão validada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao validar conexão");
      setConnectionStatus({
        connected: false,
        validated: false,
        lastValidated: null,
      });
    } finally {
      setTesting(false);
    }
  };

  const saveIntegration = async () => {
    if (!formData.apiKey || formData.apiKey.includes("•")) {
      toast.error("Por favor, insira uma chave de API válida");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First validate the connection
      await testConnection();
      if (!connectionStatus.validated) {
        toast.error("Por favor, valide a conexão antes de salvar");
        setSaving(false);
        return;
      }

      const integrationData = {
        organizer_id: session.user.id,
        asaas_api_key: formData.apiKey,
        asaas_wallet_id: formData.walletId || null,
        is_active: true,
        last_validated_at: new Date().toISOString(),
      };

      if (integration) {
        // Update existing
        const { error } = await supabase
          .from("organizer_asaas_integrations")
          .update(integrationData)
          .eq("id", integration.id);

        if (error) throw error;
        toast.success("Integração atualizada com sucesso!");
      } else {
        // Create new
        const { error } = await supabase
          .from("organizer_asaas_integrations")
          .insert(integrationData);

        if (error) throw error;
        toast.success("Integração criada com sucesso!");
      }

      await loadIntegration();
    } catch (error: any) {
      console.error("Error saving integration:", error);
      toast.error(error.message || "Erro ao salvar integração");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar sua conta Asaas?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("organizer_asaas_integrations")
        .update({ is_active: false })
        .eq("id", integration.id);

      if (error) throw error;

      toast.success("Conta desconectada com sucesso");
      setIntegration(null);
      setFormData({ apiKey: "", walletId: "" });
      setConnectionStatus({
        connected: false,
        validated: false,
        lastValidated: null,
      });
    } catch (error: any) {
      toast.error("Erro ao desconectar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <div>
              <h1 className="text-2xl font-bold">Integração Asaas</h1>
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Asaas para receber pagamentos automaticamente
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status da Conexão</span>
              {connectionStatus.connected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Não Conectado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Conta Asaas</span>
                {connectionStatus.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Validação</span>
                {connectionStatus.validated ? (
                  <span className="text-sm text-muted-foreground">
                    Validado em {connectionStatus.lastValidated ? new Date(connectionStatus.lastValidated).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Não validado</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">Split Automático de Pagamentos:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Quando um atleta paga uma inscrição, o Asaas divide automaticamente:</li>
                  <li><strong>95% vai direto para sua conta Asaas</strong></li>
                  <li><strong>5% fica para a plataforma</strong> (taxa de serviço)</li>
                  <li>Tudo acontece na mesma transação - você não precisa fazer nada!</li>
                  <li>O dinheiro é liberado no prazo normal do Asaas</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Conta Asaas</CardTitle>
            <CardDescription>
              Conecte sua conta Asaas para habilitar o split automático de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">Como obter suas credenciais:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Acesse o <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">painel do Asaas</a></li>
                  <li>Faça login na sua conta</li>
                  <li>Vá em <strong>Integrações → API</strong></li>
                  <li>Gere uma nova chave de API de produção</li>
                  <li>Copie a chave (formato: <code className="bg-muted px-1 rounded">$aact_...</code>)</li>
                  <li>Para obter sua Wallet ID, vá em <strong>Minha Conta → Carteiras</strong></li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave de API Asaas *</Label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="$aact_..."
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sua chave de API é armazenada de forma segura e criptografada
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="walletId">ID da Wallet (Opcional)</Label>
              <Input
                id="walletId"
                type="text"
                placeholder="wallet_xxxxx"
                value={formData.walletId}
                onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Se não informar, usaremos a conta principal. Para split automático, informe sua wallet ID.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                disabled={testing || !formData.apiKey}
                variant="outline"
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
              <Button
                onClick={saveIntegration}
                disabled={saving || !formData.apiKey || !connectionStatus.validated}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {integration ? "Atualizar" : "Salvar"} Integração
              </Button>
              {integration && (
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  disabled={saving}
                >
                  Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Suas credenciais do Asaas são armazenadas de forma segura e criptografada. 
              Elas são usadas exclusivamente para processar pagamentos e realizar o split automático. 
              Nunca compartilhe suas chaves de API publicamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

