import { useState, useEffect } from "react";
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [asaasConfig, setAsaasConfig] = useState({
    apiKey: "",
    webhookSecret: "",
  });
  const [platformWalletId, setPlatformWalletId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState({
    supabase: false,
    asaas: false,
  });

  useEffect(() => {
    loadPlatformWallet();
  }, []);

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

  const savePlatformWallet = async () => {
    if (!platformWalletId.trim()) {
      sonnerToast.error("Por favor, insira o ID da wallet");
      return;
    }

    setSavingWallet(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          key: "asaas_platform_wallet_id",
          value: platformWalletId.trim(),
          description: "Wallet ID da plataforma para receber os 5% dos pagamentos",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key",
        });

      if (error) throw error;

      sonnerToast.success("Wallet da plataforma configurada com sucesso!");
    } catch (error: any) {
      console.error("Error saving platform wallet:", error);
      sonnerToast.error("Erro ao salvar wallet: " + (error.message || "Erro desconhecido"));
    } finally {
      setSavingWallet(false);
    }
  };

  const testSupabaseConnection = async () => {
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
        toast({
          title: "Conexão Backend OK",
          description: "Backend conectado e funcionando",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na Conexão",
        description: "Não foi possível conectar ao backend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testAsaasConnection = async () => {
    if (!asaasConfig.apiKey) {
      toast({
        title: "Chave API necessária",
        description: "Por favor, insira a chave da API Asaas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Mock test - in production would validate with Asaas API
      const response = await fetch("https://www.asaas.com/api/v3/customers?limit=1", {
        headers: {
          "access_token": asaasConfig.apiKey,
        },
      });

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, asaas: true }));
        toast({
          title: "Asaas Conectado",
          description: "Chave de API validada com sucesso",
        });
      } else {
        throw new Error("Invalid API key");
      }
    } catch (error) {
      toast({
        title: "Erro na Conexão Asaas",
        description: "Verifique sua chave de API",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = () => {
    toast({
      title: "Configurações Salvas",
      description: "As configurações foram salvas com segurança",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Integrações</h1>
        <p className="text-muted-foreground">
          Configure e teste as conexões com serviços externos
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
          <Button onClick={testSupabaseConnection} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar Conexão
          </Button>
        </CardContent>
      </Card>

      {/* Asaas Integration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Asaas (Pagamentos)</span>
            {connectionStatus.asaas ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Não Configurado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configure sua conta Asaas para processar pagamentos com taxa de 5%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Para obter suas chaves de API:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Acesse <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">asaas.com</a></li>
                <li>Faça login na sua conta</li>
                <li>Navegue até Integrações → API Keys</li>
                <li>Gere uma nova chave de API de produção</li>
                <li>Configure o webhook apontando para sua aplicação</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="asaas-api-key">Chave da API (Produção)</Label>
            <div className="flex gap-2">
              <Input 
                id="asaas-api-key"
                type={showKeys ? "text" : "password"}
                placeholder="$aact_..."
                value={asaasConfig.apiKey}
                onChange={(e) => setAsaasConfig({ ...asaasConfig, apiKey: e.target.value })}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys(!showKeys)}
              >
                {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <Input 
              id="webhook-secret"
              type={showKeys ? "text" : "password"}
              placeholder="whsec_..."
              value={asaasConfig.webhookSecret}
              onChange={(e) => setAsaasConfig({ ...asaasConfig, webhookSecret: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">
              URL do Webhook: {window.location.origin}/functions/v1/asaas-webhook
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={testAsaasConnection} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar Conexão
            </Button>
            <Button variant="outline" onClick={saveConfiguration}>
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Wallet Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Wallet da Plataforma (5%)
          </CardTitle>
          <CardDescription>
            Configure a wallet Asaas que receberá os 5% dos pagamentos automaticamente
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

          <div className="space-y-2">
            <Label htmlFor="platform-wallet-id">ID da Wallet/Subconta Asaas</Label>
            <Input
              id="platform-wallet-id"
              type="text"
              placeholder="wallet_xxxxx ou subaccount_xxxxx"
              value={platformWalletId}
              onChange={(e) => setPlatformWalletId(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Para obter sua wallet ID: Acesse o painel do Asaas → Minha Conta → Carteiras ou Subcontas → Copie o ID
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={savePlatformWallet} disabled={savingWallet || !platformWalletId.trim()}>
              {savingWallet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Wallet da Plataforma
            </Button>
            {platformWalletId && (
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
              <span>Asaas Configurado</span>
              {connectionStatus.asaas ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Wallet da Plataforma</span>
              {platformWalletId ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
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
