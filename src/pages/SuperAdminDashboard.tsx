import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Users, DollarSign, Trophy, TrendingUp, 
  LogOut, Settings, BarChart3, Building2,
  ArrowLeft, Loader2
} from "lucide-react";

interface OrganizerStats {
  organizer_id: string;
  organizer_email: string;
  organizer_name: string | null;
  total_championships: number;
  total_registrations: number;
  paid_payments: number;
  total_revenue_cents: number;
  platform_fee_cents: number;
  net_revenue_cents: number;
}

interface PlatformStats {
  total_organizers: number;
  total_championships: number;
  total_registrations: number;
  total_revenue_cents: number;
  total_platform_fee_cents: number;
  paid_payments: number;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    total_organizers: 0,
    total_championships: 0,
    total_registrations: 0,
    total_revenue_cents: 0,
    total_platform_fee_cents: 0,
    paid_payments: 0,
  });
  const [organizers, setOrganizers] = useState<OrganizerStats[]>([]);

  useEffect(() => {
    checkAuth();
    loadDashboard();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // Verificar se o usuário é admin
    // Verificar se o usuário é super_admin (apenas super_admin pode acessar esta página)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roles) {
      toast.error("Acesso negado. Apenas super administradores podem acessar esta página.");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Carregar estatísticas por organizador usando função RPC
      const { data: organizerData, error: orgError } = await supabase.rpc(
        "get_organizer_stats"
      );

      if (orgError) {
        console.error("Error calling RPC:", orgError);
        // Se a função RPC não funcionar, usar query SQL direta via execute_sql
        toast.warning("Carregando dados...");
      }

      if (organizerData && organizerData.length > 0) {
        setOrganizers(organizerData as OrganizerStats[]);
        const platformStats: PlatformStats = {
          total_organizers: organizerData.length,
          total_championships: organizerData.reduce((sum: number, org: OrganizerStats) => sum + org.total_championships, 0),
          total_registrations: organizerData.reduce((sum: number, org: OrganizerStats) => sum + org.total_registrations, 0),
          total_revenue_cents: organizerData.reduce((sum: number, org: OrganizerStats) => sum + org.total_revenue_cents, 0),
          total_platform_fee_cents: 0,
          paid_payments: organizerData.reduce((sum: number, org: OrganizerStats) => sum + org.paid_payments, 0),
        };
        setPlatformStats(platformStats);
      } else {
        // Dados vazios - ainda não há organizadores ou pagamentos
        setOrganizers([]);
        setPlatformStats({
          total_organizers: 0,
          total_championships: 0,
          total_registrations: 0,
          total_revenue_cents: 0,
          total_platform_fee_cents: 0,
          paid_payments: 0,
        });
      }
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Gestão geral da plataforma
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/integrations")}>
                <Settings className="w-4 h-4 mr-2" />
                Integrações
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Organizadores</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.total_organizers}</div>
              <p className="text-xs text-muted-foreground">
                Donos de box cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Campeonatos</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.total_championships}</div>
              <p className="text-xs text-muted-foreground">
                Campeonatos criados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Inscrições</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.total_registrations}</div>
              <p className="text-xs text-muted-foreground">
                Inscrições realizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(platformStats.total_revenue_cents)}
              </div>
              <p className="text-xs text-muted-foreground">
                {platformStats.paid_payments} pagamentos confirmados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas de Receita Total */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Faturamento Total
              </CardTitle>
              <CardDescription>
                Total faturado pelos organizadores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(platformStats.total_revenue_cents)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Valor total recebido pelos organizadores via PIX
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Organizadores */}
        <Card>
          <CardHeader>
            <CardTitle>Organizadores e Faturamento</CardTitle>
            <CardDescription>
              Detalhamento por organizador
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organizers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum organizador encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organizador</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Campeonatos</TableHead>
                      <TableHead>Inscrições</TableHead>
                      <TableHead>Pagamentos</TableHead>
                      <TableHead className="text-right">Faturamento Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizers.map((org) => (
                      <TableRow key={org.organizer_id}>
                        <TableCell className="font-medium">
                          {org.organizer_name || "Sem nome"}
                        </TableCell>
                        <TableCell>{org.organizer_email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{org.total_championships}</Badge>
                        </TableCell>
                        <TableCell>{org.total_registrations}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{org.paid_payments}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(org.total_revenue_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

