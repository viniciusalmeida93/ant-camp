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
    cnpj: "",
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

      console.log("Carregando integração para organizador:", session.user.id);
      
      // Buscar TODAS as integrações do organizador (ativas e inativas)
      const { data: allIntegrations, error: listError } = await supabase
        .from("organizer_asaas_integrations")
        .select("*")
        .eq("organizer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (listError) {
        console.error("Erro ao listar integrações:", listError);
        throw listError;
      }

      console.log("Integrações encontradas:", allIntegrations?.length || 0);

      // Buscar a integração ativa
      const { data, error } = await supabase
        .from("organizer_asaas_integrations")
        .select("*")
        .eq("organizer_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar integração ativa:", error);
        throw error;
      }

      if (data) {
        console.log("Integração ativa encontrada:", {
          id: data.id,
          organizerId: data.organizer_id,
          hasApiKey: !!data.asaas_api_key,
          hasWalletId: !!data.asaas_wallet_id,
          isActive: data.is_active,
        });
        
        setIntegration(data);
        setFormData({
          apiKey: data.asaas_api_key ? "•".repeat(20) : "", // Masked
          walletId: data.asaas_wallet_id || "",
          cnpj: data.organizer_cnpj || "",
        });
        setConnectionStatus({
          connected: true,
          validated: !!data.last_validated_at,
          lastValidated: data.last_validated_at,
        });
      } else {
        console.log("Nenhuma integração ativa encontrada");
        setIntegration(null);
        setFormData({ apiKey: "", walletId: "", cnpj: "" });
        setConnectionStatus({
          connected: false,
          validated: false,
          lastValidated: null,
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
    if (!formData.apiKey || formData.apiKey.includes("•")) {
      toast.error("Por favor, insira sua chave de API do Asaas");
      return;
    }

    setTesting(true);
    try {
      // Use Edge Function to validate (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke("validate-asaas-account", {
        body: {
          apiKey: formData.apiKey,
          walletId: formData.walletId || undefined,
        },
      });

      if (error) throw error;

      if (!data.valid) {
        throw new Error(data.error || "Chave de API inválida");
      }

      if (data.walletId === false && formData.walletId) {
        toast.warning("Wallet ID não encontrado. Verifique se está correto.");
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

  const testCurrentConnection = async () => {
    if (!integration) {
      toast.error("Nenhuma integração encontrada para testar");
      return;
    }

    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      console.log("Testando conexão do organizador:", session.user.id);

      // Testar conexão usando supabase.functions.invoke (recomendado)
      const { data, error } = await supabase.functions.invoke("test-organizer-connection", {
        body: {
          organizerId: session.user.id,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao testar conexão");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Erro ao testar conexão");
      }

      if (data.connectionWorking) {
        const accountName = data.tests?.apiKey?.accountName || "Desconhecido";
        const accountEmail = data.tests?.apiKey?.accountEmail || "";
        const accountCnpj = data.tests?.apiKey?.accountCpfCnpj || "";
        
        toast.success("Conexão funcionando perfeitamente! API Key e Wallet ID estão válidos.");
        toast.info(`Conta configurada: ${accountName} (${accountEmail})`);
        
        // Verificar se não é a conta do super admin
        if (accountName.includes("Vinicius") || accountEmail.includes("vinicius")) {
          toast.error("ATENÇÃO: Esta é a conta do super admin! O organizador precisa usar sua própria conta Asaas.");
        }
      } else {
        const issues = [];
        if (data.tests?.apiKey?.valid !== true) {
          issues.push(`API Key: ${data.tests?.apiKey?.error || "inválida"}`);
        }
        if (data.tests?.walletId?.valid !== true) {
          issues.push(`Wallet ID: ${data.tests?.walletId?.error || "inválido"}`);
        }
        toast.warning(`Conexão com problemas: ${issues.join(", ")}`);
      }

      // Atualizar status
      setConnectionStatus({
        connected: data.hasIntegration,
        validated: data.connectionWorking,
        lastValidated: new Date().toISOString(),
      });

      // Recarregar integração para atualizar dados
      await loadIntegration();
    } catch (error: any) {
      console.error("Erro completo ao testar conexão:", error);
      toast.error(error.message || "Erro ao testar conexão. Verifique o console para mais detalhes.");
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
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        setSaving(false);
        return;
      }

      // Validar a conexão primeiro
      let isValidated = false;
      let accountInfo = null;
      
      const testResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-asaas-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            apiKey: formData.apiKey,
            walletId: formData.walletId || undefined,
          }),
        }
      );

      if (testResponse.ok) {
        const testData = await testResponse.json();
        if (testData.valid && testData.accountInfo) {
          isValidated = true;
          accountInfo = testData.accountInfo;
          
          const accountName = (testData.accountInfo.name || "").toLowerCase();
          const accountEmail = (testData.accountInfo.email || "").toLowerCase();
          
          // Só bloquear se tanto o nome quanto o email indicarem que é do super admin
          const isSuperAdminAccount = accountName.includes("vinicius") && accountEmail.includes("vinicius");
          
          if (isSuperAdminAccount) {
            toast.error(`ERRO: Esta é a conta do super admin (${testData.accountInfo.name}). O organizador precisa usar sua própria conta Asaas.`);
            setSaving(false);
            return;
          }
          
          console.log("Conta que será salva:", {
            name: testData.accountInfo.name,
            email: testData.accountInfo.email,
            cnpj: testData.accountInfo.cpfCnpj,
          });
        } else {
          toast.error(testData.error || "Chave de API inválida. Por favor, valide a conexão antes de salvar.");
          setSaving(false);
          return;
        }
      } else {
        const errorData = await testResponse.json().catch(() => ({ error: "Erro ao validar conexão" }));
        toast.error(errorData.error || "Erro ao validar conexão. Por favor, tente novamente.");
        setSaving(false);
        return;
      }

      if (!isValidated) {
        toast.error("Por favor, valide a conexão antes de salvar");
        setSaving(false);
        return;
      }

      // Validar CNPJ se fornecido
      let cnpjClean = null;
      if (formData.cnpj && formData.cnpj.trim()) {
        cnpjClean = formData.cnpj.replace(/\D/g, "");
        if (cnpjClean.length !== 11 && cnpjClean.length !== 14) {
          toast.error("CNPJ/CPF deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)");
          setSaving(false);
          return;
        }
      }

      const integrationData = {
        organizer_id: session.user.id,
        asaas_api_key: formData.apiKey,
        asaas_wallet_id: formData.walletId || null,
        organizer_cnpj: cnpjClean || null,
        is_active: true,
        last_validated_at: new Date().toISOString(),
      };

      if (integration) {
        // Update existing
        console.log("Atualizando integração existente:", {
          integrationId: integration.id,
          organizerId: session.user.id,
          integrationData: {
            ...integrationData,
            asaas_api_key: integrationData.asaas_api_key.substring(0, 20) + "...", // Log apenas primeiros 20 chars
          },
        });
        
        const { data: updatedData, error } = await supabase
          .from("organizer_asaas_integrations")
          .update(integrationData)
          .eq("id", integration.id)
          .eq("organizer_id", session.user.id) // Garantir que pertence ao organizador
          .select();

        if (error) {
          console.error("Erro ao atualizar integração:", error);
          throw error;
        }
        
        console.log("Integração atualizada com sucesso:", updatedData);
        toast.success("Integração atualizada com sucesso!");
      } else {
        // Create new
        console.log("Criando nova integração:", {
          organizerId: session.user.id,
          integrationData: {
            ...integrationData,
            asaas_api_key: integrationData.asaas_api_key.substring(0, 20) + "...", // Log apenas primeiros 20 chars
          },
        });
        
        const { data: newData, error } = await supabase
          .from("organizer_asaas_integrations")
          .insert(integrationData)
          .select();

        if (error) {
          console.error("Erro ao criar integração:", error);
          throw error;
        }
        
        console.log("Integração criada com sucesso:", newData);
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
      setFormData({ apiKey: "", walletId: "", cnpj: "" });
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
              <h1 className="text-2xl font-bold">Integração Asaas - Organizador</h1>
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Asaas para receber 95% dos pagamentos automaticamente
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
            <CardTitle>Configuração da Conta Asaas do Organizador</CardTitle>
            <CardDescription>
              Conecte sua conta Asaas para receber 95% dos pagamentos automaticamente (5% vai para a plataforma)
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

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ/CPF do Organizador (Opcional)</Label>
              <Input
                id="cnpj"
                type="text"
                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                value={formData.cnpj}
                onChange={(e) => {
                  // Permitir apenas números, pontos, barras e hífens
                  const value = e.target.value.replace(/[^\d.\-/]/g, "");
                  setFormData({ ...formData, cnpj: value });
                }}
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground">
                Informe seu CNPJ (14 dígitos) ou CPF (11 dígitos) para validação. Isso ajuda a garantir que sua conta Asaas seja diferente da conta da plataforma (necessário para split de pagamento).
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={testConnection}
                disabled={testing || !formData.apiKey || formData.apiKey.includes("•") || formData.apiKey.length < 10}
                variant="outline"
                title={formData.apiKey.includes("•") ? "Digite uma nova API key para testar" : "Teste a API key antes de salvar"}
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Nova Conexão
              </Button>
              {integration && (
                <Button
                  onClick={testCurrentConnection}
                  disabled={testing}
                  variant="outline"
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar Conexão Atual
                </Button>
              )}
              <Button
                onClick={saveIntegration}
                disabled={saving || !formData.apiKey || formData.apiKey.includes("•") || !connectionStatus.validated}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {integration ? "Atualizar" : "Salvar"} Integração
              </Button>
              {integration && (
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  disabled={saving || testing}
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

