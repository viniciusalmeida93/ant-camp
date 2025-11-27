import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function TestAsaasConnections() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    checkAuth();
    loadIntegrations();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizer_asaas_integrations")
        .select("*, organizer_id")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar integrações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (organizerId: string) => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-organizer-connection", {
        body: { organizerId },
      });

      if (error) throw error;

      setTestResults((prev) => ({
        ...prev,
        [organizerId]: data,
      }));

      if (data.connectionWorking) {
        toast.success(`Conexão do organizador ${organizerId.substring(0, 8)}... funcionando!`);
      } else {
        toast.warning(`Conexão do organizador ${organizerId.substring(0, 8)}... com problemas`);
      }
    } catch (error: any) {
      toast.error("Erro ao testar conexão");
      setTestResults((prev) => ({
        ...prev,
        [organizerId]: { success: false, error: error.message },
      }));
    } finally {
      setTesting(false);
    }
  };

  const testAllConnections = async () => {
    setTesting(true);
    for (const integration of integrations) {
      await testConnection(integration.organizer_id);
      // Pequeno delay entre testes
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setTesting(false);
    toast.success("Todos os testes concluídos!");
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
              <h1 className="text-2xl font-bold">Verificar Conexões Asaas</h1>
              <p className="text-sm text-muted-foreground">
                Teste todas as integrações ativas dos organizadores
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {integrations.length} integração(ões) ativa(s) encontrada(s)
          </p>
          <Button
            onClick={testAllConnections}
            disabled={testing || integrations.length === 0}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Testar Todas
              </>
            )}
          </Button>
        </div>

        {integrations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Nenhuma integração ativa encontrada
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {integrations.map((integration) => {
              const result = testResults[integration.organizer_id];
              const isWorking = result?.connectionWorking === true;

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Organizador: {integration.organizer_id.substring(0, 8)}...
                        </CardTitle>
                        <CardDescription>
                          Wallet ID: {integration.asaas_wallet_id || "Não configurado"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {result ? (
                          isWorking ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Funcionando
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Com Problemas
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary">Não testado</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">API Key:</span>
                        <p className="font-mono text-xs">
                          {integration.asaas_api_key
                            ? `${integration.asaas_api_key.substring(0, 15)}...`
                            : "Não configurada"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Última validação:</span>
                        <p>
                          {integration.last_validated_at
                            ? new Date(integration.last_validated_at).toLocaleString("pt-BR")
                            : "Nunca"}
                        </p>
                      </div>
                    </div>

                    {result && (
                      <div className="border-t pt-4 space-y-2">
                        <h4 className="font-semibold">Resultado do Teste:</h4>
                        <div className="space-y-2 text-sm">
                          {result.tests?.apiKey && (
                            <div className="flex items-center gap-2">
                              {result.tests.apiKey.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span>
                                API Key:{" "}
                                {result.tests.apiKey.valid
                                  ? `Válida (${result.tests.apiKey.accountName})`
                                  : result.tests.apiKey.error}
                              </span>
                            </div>
                          )}
                          {result.tests?.walletId && (
                            <div className="flex items-center gap-2">
                              {result.tests.walletId.valid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span>
                                Wallet ID:{" "}
                                {result.tests.walletId.valid
                                  ? "Válido"
                                  : result.tests.walletId.error}
                              </span>
                            </div>
                          )}
                          {result.tests?.apiKey?.accountEmail && (
                            <div className="text-xs text-muted-foreground pl-6">
                              Email da conta: {result.tests.apiKey.accountEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => testConnection(integration.organizer_id)}
                      disabled={testing}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

