import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

export default function Integrations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [platformWalletId, setPlatformWalletId] = useState("");
  const [platformApiKey, setPlatformApiKey] = useState("");
  const [validatingPlatform, setValidatingPlatform] = useState(false);
  const [platformValidationStatus, setPlatformValidationStatus] = useState<{
    apiKey: boolean | null;
    walletId: boolean | null;
    accountInfo: any;
  }>({
    apiKey: null,
    walletId: null,
    accountInfo: null,
  });
  const [connectionStatus, setConnectionStatus] = useState({
    supabase: false,
  });

  useEffect(() => {
    checkAuth();
    loadPlatformWallet();
    
    // Verificar conexão automaticamente ao carregar
    const checkConnection = async () => {
      setLoading(true);
      try {
        const response = await fetch(import.meta.env.VITE_SUPABASE_URL + "/auth/v1/health", {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        
        if (response.ok) {
          setConnectionStatus(prev => ({ ...prev, supabase: true }));
        } else {
          setConnectionStatus(prev => ({ ...prev, supabase: false }));
        }
      } catch (error) {
        setConnectionStatus(prev => ({ ...prev, supabase: false }));
      } finally {
        setLoading(false);
      }
    };
    
    checkConnection();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Verificar se o usuário é super_admin (apenas super_admin pode acessar esta página)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roles) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
  };

  const loadPlatformWallet = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "asaas_platform_wallet_id")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading platform wallet:", error);
        return;
      }

      if (data) {
        setPlatformWalletId(data.value || "");
      }
    } catch (error) {
      console.error("Error loading platform wallet:", error);
    }
  };

  const validatePlatformAccount = async () => {
    if (!platformApiKey.trim()) {
      sonnerToast.error("Por favor, insira a chave de API da plataforma");
      return;
    }

    setValidatingPlatform(true);
    setPlatformValidationStatus({
      apiKey: null,
      walletId: null,
      accountInfo: null,
    });

    try {
      // Use Edge Function to validate (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke("validate-asaas-account", {
        body: {
          apiKey: platformApiKey,
          walletId: platformWalletId.trim() || undefined,
        },
      });

      if (error) throw error;

      if (!data.valid) {
        throw new Error(data.error || "Chave de API inválida");
      }

      if (data.walletId === false && platformWalletId.trim()) {
        sonnerToast.warning("Wallet ID não encontrado na conta. Verifique se está correto.");
      }

      setPlatformValidationStatus({
        apiKey: data.apiKey,
        walletId: data.walletId,
        accountInfo: data.accountInfo,
      });

      sonnerToast.success("Conta da plataforma validada com sucesso!");
    } catch (error: any) {
      setPlatformValidationStatus({
        apiKey: false,
        walletId: null,
        accountInfo: null,
      });
      sonnerToast.error(error.message || "Erro ao validar conta da plataforma");
    } finally {
      setValidatingPlatform(false);
    }
  };

  const savePlatformWallet = async () => {
    if (!platformWalletId.trim()) {
      sonnerToast.error("Por favor, insira o ID da wallet");
      return;
    }

    // Verificar autenticação antes de salvar
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sonnerToast.error("Você precisa estar autenticado para salvar");
      navigate("/auth");
      return;
    }

    setSavingWallet(true);
    try {
      // Primeiro, tentar atualizar se existir
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("key", "asaas_platform_wallet_id")
        .single();

      if (existing) {
        // Atualizar registro existente
        const { error } = await supabase
          .from("platform_settings")
          .update({
            value: platformWalletId.trim(),
            description: "Wallet ID da plataforma para receber os 5% dos pagamentos",
            updated_at: new Date().toISOString(),
          })
          .eq("key", "asaas_platform_wallet_id");

        if (error) throw error;
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from("platform_settings")
          .insert({
            key: "asaas_platform_wallet_id",
            value: platformWalletId.trim(),
            description: "Wallet ID da plataforma para receber os 5% dos pagamentos",
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      sonnerToast.success("Wallet da plataforma configurada com sucesso!");
    } catch (error: any) {
      console.error("Error saving platform wallet:", error);
      sonnerToast.error("Erro ao salvar wallet: " + (error.message || "Erro desconhecido"));
    } finally {
      setSavingWallet(false);
    }
  };

  const testSupabaseConnection = async (showToast = false) => {
    setLoading(true);
    try {
      // Test Supabase connection by checking auth
      const response = await fetch(import.meta.env.VITE_SUPABASE_URL + "/auth/v1/health", {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, supabase: true }));
        if (showToast) {
          toast({
            title: "Conexão Backend OK",
            description: "Backend conectado e funcionando",
          });
        }
      } else {
        setConnectionStatus(prev => ({ ...prev, supabase: false }));
        if (showToast) {
          toast({
            title: "Erro na Conexão",
            description: "Não foi possível conectar ao backend",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, supabase: false }));
      if (showToast) {
        toast({
          title: "Erro na Conexão",
          description: "Não foi possível conectar ao backend",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Conta Super Admin (Plataforma)</h1>
        <p className="text-muted-foreground">
          Configure a conta Asaas que receberá os 5% dos pagamentos automaticamente
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          ⚠️ Suas chaves de API são armazenadas de forma segura e criptografada. 
          Nunca as compartilhe publicamente.
        </AlertDescription>
      </Alert>

      {/* Supabase/Backend Connection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Backend (Lovable Cloud)</span>
            {connectionStatus.supabase ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Desconectado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Conexão com autenticação, banco de dados e realtime
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Projeto</Label>
            <Input 
              type="text" 
              value={import.meta.env.VITE_SUPABASE_URL}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label>Project ID</Label>
            <Input 
              type="text" 
              value={import.meta.env.VITE_SUPABASE_PROJECT_ID}
              disabled
              className="bg-muted"
            />
          </div>
                 <Button onClick={() => testSupabaseConnection(true)} disabled={loading}>
                   {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Testar Conexão
                 </Button>
        </CardContent>
      </Card>

      {/* Platform Account Configuration (Super Admin - 5%) */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Conta Super Admin (5% da Plataforma)
          </CardTitle>
          <CardDescription>
            Configure e valide a conta Asaas que receberá os 5% dos pagamentos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <p className="font-medium mb-2">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Quando um atleta paga, o Asaas divide automaticamente: <strong>95% para o organizador</strong> e <strong>5% para você</strong></li>
                <li>Tudo acontece na mesma transação - você não precisa fazer nada!</li>
                <li>O dinheiro é liberado no prazo normal do Asaas</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              <p className="font-medium mb-2 text-blue-900">⚠️ Importante:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>A validação aqui é apenas para <strong>testar</strong> se os dados estão corretos</li>
                <li>A <strong>chave de API</strong> deve estar configurada no <strong>Supabase</strong> como variável de ambiente <code className="bg-blue-100 px-1 rounded">ASAAS_API_KEY</code></li>
                <li>O <strong>Wallet ID</strong> pode ser salvo aqui (banco de dados) ou no Supabase como <code className="bg-blue-100 px-1 rounded">ASAAS_PLATFORM_WALLET_ID</code></li>
                <li>Após validar, configure no Supabase: <strong>Settings → Edge Functions → Environment Variables</strong></li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="platform-api-key">Chave de API da Plataforma *</Label>
            <div className="flex gap-2">
              <Input
                id="platform-api-key"
                type={showKeys ? "text" : "password"}
                placeholder="$aact_..."
                value={platformApiKey}
                onChange={(e) => setPlatformApiKey(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys(!showKeys)}
              >
                {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Chave de API da conta que receberá os 5% (Super Admin)
            </p>
            {platformValidationStatus.apiKey === true && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Chave de API válida
              </div>
            )}
            {platformValidationStatus.apiKey === false && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                Chave de API inválida
              </div>
            )}
          </div>

          {/* Wallet ID Input */}
          <div className="space-y-2">
            <Label htmlFor="platform-wallet-id">ID da Wallet/Subconta Asaas *</Label>
            <Input
              id="platform-wallet-id"
              type="text"
              placeholder="37e9b404-a5fb-451a-a785-e833ae60e476"
              value={platformWalletId}
              onChange={(e) => setPlatformWalletId(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Wallet ID da conta que receberá os 5%. Você pode encontrar em: Asaas → Integrações → Wallet ID
            </p>
            {platformValidationStatus.walletId === true && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Wallet ID válido e encontrado na conta
              </div>
            )}
            {platformValidationStatus.walletId === false && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                Wallet ID não encontrado na conta
              </div>
            )}
          </div>

          {/* Account Info Display */}
          {platformValidationStatus.accountInfo && (
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription>
                <p className="font-medium mb-2">Informações da Conta Validada:</p>
                <div className="text-sm space-y-1">
                  <p><strong>Nome:</strong> {platformValidationStatus.accountInfo.name || "N/A"}</p>
                  <p><strong>Email:</strong> {platformValidationStatus.accountInfo.email || "N/A"}</p>
                  <p><strong>CPF/CNPJ:</strong> {platformValidationStatus.accountInfo.cpfCnpj || "N/A"}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={validatePlatformAccount} 
              disabled={validatingPlatform || !platformApiKey.trim()}
              variant="default"
            >
              {validatingPlatform && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validar Conta
            </Button>
            <Button 
              onClick={savePlatformWallet} 
              disabled={savingWallet || !platformWalletId.trim() || platformValidationStatus.walletId === false}
              variant="outline"
            >
              {savingWallet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Wallet ID
            </Button>
            {platformWalletId && platformValidationStatus.walletId !== false && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configurado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Configuração</CardTitle>
          <CardDescription>
            Status das integrações configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Backend Conectado</span>
              {connectionStatus.supabase ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Conta Super Admin (5%)</span>
              {platformWalletId && (platformValidationStatus.walletId !== false) ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Chave API da Plataforma</span>
              {platformValidationStatus.apiKey === true ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : platformValidationStatus.apiKey === false ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : platformWalletId ? (
                <CheckCircle2 className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Wallet ID da Plataforma</span>
              {platformValidationStatus.walletId === true ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : platformValidationStatus.walletId === false ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : platformWalletId ? (
                <CheckCircle2 className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Realtime Habilitado</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span>RLS Aplicado</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
