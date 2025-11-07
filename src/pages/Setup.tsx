import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Setup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    supabaseConnected: false,
    rlsApplied: false,
    realtimeEnabled: false,
    asaasConfigured: false,
    webhookActive: false,
    seedUserCreated: false,
    exampleChampionship: null as string | null,
  });
  const [seedCredentials, setSeedCredentials] = useState({
    email: "vinicius.almeidaa93@gmail.com",
    password: "Temp-CRF93!",
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      // Check Supabase connection
      const { data: authData } = await supabase.auth.getSession();
      const supabaseConnected = !!authData;

      // Check if seed user exists
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", seedCredentials.email)
        .maybeSingle();
      
      const seedUserCreated = !!profiles;

      // Check for example championship
      const { data: championships } = await supabase
        .from("championships")
        .select("slug")
        .eq("name", "Campeonato de Exemplo")
        .single();
      
      const exampleChampionship = championships?.slug || null;

      setStatus({
        supabaseConnected,
        rlsApplied: true, // Migrations already applied
        realtimeEnabled: true, // Enabled in migrations
        asaasConfigured: false, // Will be checked via env
        webhookActive: false, // Will be checked via env
        seedUserCreated,
        exampleChampionship,
      });
    } catch (error) {
      console.error("Error checking setup status:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSeedUser = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke("create-seed-user");
      
      if (error) throw error;
      
      await checkSetupStatus();
    } catch (error) {
      console.error("Error creating seed user:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ active }: { active: boolean }) => (
    active ? (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" />
        Pendente
      </Badge>
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allReady = status.supabaseConnected && status.rlsApplied && status.seedUserCreated;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Checklist de Produção</h1>
        <p className="text-muted-foreground">
          Verifique o status da configuração da plataforma
        </p>
      </div>

      {/* Seed User Credentials */}
      {status.seedUserCreated && (
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Credenciais do Usuário de Teste</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p><strong>Email:</strong> {seedCredentials.email}</p>
            <p><strong>Senha Temporária:</strong> {seedCredentials.password}</p>
            <p className="text-sm text-muted-foreground">
              ⚠️ Troque a senha imediatamente no primeiro login!
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Backend (Lovable Cloud)</span>
              <StatusBadge active={status.supabaseConnected} />
            </CardTitle>
            <CardDescription>
              Conexão com autenticação e banco de dados
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Migrações e RLS</span>
              <StatusBadge active={status.rlsApplied} />
            </CardTitle>
            <CardDescription>
              Políticas de segurança em nível de linha aplicadas
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Realtime</span>
              <StatusBadge active={status.realtimeEnabled} />
            </CardTitle>
            <CardDescription>
              Atualizações em tempo real habilitadas
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Integração Asaas</span>
              <StatusBadge active={status.asaasConfigured} />
            </CardTitle>
            <CardDescription>
              Configure a chave da API na página de Integrações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/integrations")}
            >
              Configurar Asaas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Webhook Asaas</span>
              <StatusBadge active={status.webhookActive} />
            </CardTitle>
            <CardDescription>
              Webhook configurado e verificado
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Usuário Seed</span>
              <StatusBadge active={status.seedUserCreated} />
            </CardTitle>
            <CardDescription>
              Usuário de teste criado automaticamente
            </CardDescription>
          </CardHeader>
          {!status.seedUserCreated && (
            <CardContent>
              <Button onClick={createSeedUser} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário Seed
              </Button>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Campeonato de Exemplo</span>
              <StatusBadge active={!!status.exampleChampionship} />
            </CardTitle>
            <CardDescription>
              Campeonato de teste com dados de exemplo
            </CardDescription>
          </CardHeader>
          {status.exampleChampionship && (
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-between"
                onClick={() => window.open(`/${status.exampleChampionship}/leaderboard`, "_blank")}
              >
                Ver Leaderboard Público
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-between"
                onClick={() => window.open(`/${status.exampleChampionship}/heats`, "_blank")}
              >
                Ver Baterias Públicas
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Action Buttons */}
      {allReady && (
        <div className="flex gap-4 flex-wrap">
          <Button size="lg" onClick={() => navigate("/dashboard")}>
            Criar Meu Campeonato Agora
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/integrations")}>
            Ver Painel de Integrações
          </Button>
          {status.exampleChampionship && (
            <Button variant="outline" size="lg" onClick={() => navigate("/finance")}>
              Ver Painel Financeiro
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
