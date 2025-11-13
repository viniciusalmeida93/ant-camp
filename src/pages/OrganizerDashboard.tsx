import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trophy, Users, Calendar, DollarSign, Plus, 
  BarChart3, Settings, LogOut, ExternalLink, QrCode, CreditCard
} from "lucide-react";
import { useChampionship } from "@/contexts/ChampionshipContext";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { setSelectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [championships, setChampionships] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalChampionships: 0,
    activeChampionships: 0,
    totalAthletes: 0,
    totalRevenue: 0,
  });

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
  };

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: champs, error: champsError } = await supabase
        .from("championships")
        .select("*, categories(count)")
        .eq("organizer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (champsError) throw champsError;
      setChampionships(champs || []);

      // Calculate stats
      const totalChamps = champs?.length || 0;
      const activeChamps = champs?.filter(c => c.is_published).length || 0;

      // Get registrations and revenue
      const champIds = champs?.map(c => c.id) || [];
      let totalAthletes = 0;
      let totalRevenue = 0;

      if (champIds.length > 0) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("*")
          .in("championship_id", champIds)
          .eq("payment_status", "approved");

        totalAthletes = regs?.length || 0;
        totalRevenue = regs?.reduce((sum, r) => sum + (r.subtotal_cents || 0), 0) || 0;
      }

      setStats({
        totalChampionships: totalChamps,
        activeChampionships: activeChamps,
        totalAthletes,
        totalRevenue,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar dashboard");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Painel do Organizador</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" onClick={handleSignOut} size="sm" className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Campeonatos
              </CardTitle>
              <Trophy className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChampionships}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeChampionships} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atletas Inscritos
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAthletes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pagamentos confirmados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Total
              </CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Líquido após taxas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximos WODs
              </CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Em breve
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button asChild className="h-auto py-3 sm:py-4 text-sm sm:text-base">
            <Link to="/asaas-integration">
              <CreditCard className="w-4 h-4 mr-2" />
              <span className="truncate">Conectar Asaas</span>
            </Link>
          </Button>
          <Button asChild className="h-auto py-3 sm:py-4 text-sm sm:text-base">
            <Link to="/championships/new">
              <Plus className="w-4 h-4 mr-2" />
              <span className="truncate">Novo Campeonato</span>
            </Link>
          </Button>
        </div>

        {/* Championships List */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Campeonatos</CardTitle>
            <CardDescription>
              Gerencie seus campeonatos e visualize estatísticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {championships.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum campeonato ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro campeonato para começar
                </p>
                <Button asChild>
                  <Link to="/championships/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Campeonato
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {championships.map((champ) => (
                  <Card key={champ.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{champ.name}</CardTitle>
                            <Badge variant={champ.is_published ? "default" : "secondary"}>
                              {champ.is_published ? "Publicado" : "Rascunho"}
                            </Badge>
                          </div>
                          <CardDescription>
                            {new Date(champ.date).toLocaleDateString("pt-BR")} - {champ.location}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/public/${champ.slug}/leaderboard`} target="_blank">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/championships/${champ.id}/finance`}>
                            <DollarSign className="w-4 h-4 mr-1" />
                            Financeiro
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/championships/${champ.id}/links`}>
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Links
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedChampionship(champ);
                            navigate("/app");
                          }}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Configurações
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedChampionship(champ);
                            navigate(`/championships/${champ.id}/settings`);
                          }}
                        >
                          <QrCode className="w-4 h-4 mr-1" />
                          Configurar PIX
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}