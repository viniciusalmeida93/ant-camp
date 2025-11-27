import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Trophy, Users, Calendar, DollarSign, Plus, 
  BarChart3, Settings, LogOut, ExternalLink, CreditCard, Shield, Trash2
} from "lucide-react";
import { useChampionship } from "@/contexts/ChampionshipContext";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { setSelectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [championships, setChampionships] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalChampionships: 0,
    activeChampionships: 0,
    totalAthletes: 0,
    totalRevenue: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [championshipToDelete, setChampionshipToDelete] = useState<any>(null);

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

    // Verificar se o usuário é admin ou super_admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    setIsAdmin(!!roles);
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

  const handleDeleteChampionship = async () => {
    if (!championshipToDelete) return;

    try {
      const { error } = await supabase
        .from("championships")
        .delete()
        .eq("id", championshipToDelete.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setChampionshipToDelete(null);
      loadDashboard(); // Reload the dashboard
    } catch (error: any) {
      toast.error("Não foi possível excluir este campeonato");
      console.error(error);
    }
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleSignOut} size="sm" className="w-full sm:w-auto">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
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
                            navigate("/asaas-integration");
                          }}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Configurar Pagamento
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setChampionshipToDelete(champ);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o campeonato <strong>{championshipToDelete?.name}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todos os dados relacionados (categorias, WODs, inscrições, resultados, etc.) serão perdidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChampionship}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Campeonato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}