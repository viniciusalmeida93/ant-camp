import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Trophy, LogOut, Settings, Trash2, Plus, Loader2
} from "lucide-react";
import { useChampionship } from "@/contexts/ChampionshipContext";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { setSelectedChampionship, loadChampionships } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [championships, setChampionships] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalChampionships: 0,
    totalAthletes: 0,
    totalRevenue: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [championshipToDelete, setChampionshipToDelete] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
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
        .select("*")
        .eq("organizer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (champsError) throw champsError;
      setChampionships(champs || []);

      // Calcular estatísticas
      const totalChamps = champs?.length || 0;
      const champIds = champs?.map(c => c.id) || [];
      let totalAthletes = 0;
      let totalRevenue = 0;

      if (champIds.length > 0) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, team_members, category_id, subtotal_cents, payment_status")
          .in("championship_id", champIds)
          .eq("payment_status", "approved");

        // Contar atletas (considerando times)
        if (regs) {
          for (const reg of regs) {
            if (reg.team_members) {
              try {
                const members = typeof reg.team_members === 'string' 
                  ? JSON.parse(reg.team_members) 
                  : reg.team_members;
                if (Array.isArray(members)) {
                  totalAthletes += members.length;
                } else {
                  totalAthletes += 1;
                }
              } catch {
                totalAthletes += 1;
              }
            } else {
              totalAthletes += 1;
            }
          }

          // Receita total (apenas pagamentos aprovados)
          totalRevenue = regs.reduce((sum, r) => sum + (r.subtotal_cents || 0), 0);
        }
      }

      setStats({
        totalChampionships: totalChamps,
        totalAthletes,
        totalRevenue,
      });
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Erro ao carregar dashboard");
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
      await loadDashboard();
      await loadChampionships();
      toast.success("Campeonato excluído com sucesso");
    } catch (error: any) {
      console.error("Error deleting championship:", error);
      toast.error("Não foi possível excluir este campeonato");
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleCreateChampionship = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        navigate("/auth");
        return;
      }

      const { name, date, location, description } = formData;
      
      if (!name || !date || !location) {
        toast.error("Preencha todos os campos obrigatórios");
        setCreating(false);
        return;
      }

      // Generate unique slug
      let slug = generateSlug(name);
      let slugExists = true;
      let attempts = 0;
      
      while (slugExists && attempts < 10) {
        const { data: existing } = await supabase
          .from("championships")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        
        if (!existing) {
          slugExists = false;
        } else {
          slug = `${generateSlug(name)}-${Date.now()}`;
          attempts++;
        }
      }

      const { data: championship, error } = await supabase
        .from("championships")
        .insert({
          name,
          slug,
          date,
          location,
          description: description || null,
          organizer_id: session.user.id,
          is_published: false,
          is_indexable: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Campeonato criado com sucesso!");
      setIsCreateDialogOpen(false);
      setFormData({ name: '', date: '', location: '', description: '' });
      
      await loadDashboard();
      await loadChampionships();
    } catch (error: any) {
      console.error("Error creating championship:", error);
      toast.error("Erro ao criar campeonato");
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDateRange = (championship: any) => {
    if (!championship.date) return '';
    
    const startDate = new Date(championship.date);
    const endDate = championship.total_days 
      ? new Date(new Date(championship.date).setDate(startDate.getDate() + (championship.total_days - 1)))
      : startDate;
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    };
    
    if (championship.total_days > 1) {
      return `${formatDate(startDate)} a ${formatDate(endDate)}`;
    }
    return formatDate(startDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051C2C] flex items-center justify-center">
        <div className="text-[#FAFAFA] font-sans">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051C2C] text-[#FAFAFA] font-sans">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F32735] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ANTCAMP</h1>
              <p className="text-sm text-[#D9D9D9]">{user?.email || ''}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="border-[#D9D9D9] text-[#FAFAFA] hover:bg-[#1F3342]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total de Campeonatos */}
          <Card className="bg-[#1F3342] border-[#1F3342] relative">
            <CardContent className="p-6">
              <div className="absolute top-4 right-4">
                <Trophy className="w-5 h-5 text-[#F32735]" />
              </div>
              <h3 className="text-sm text-[#FAFAFA] mb-2">Total de Campeonatos</h3>
              <p className="text-3xl font-bold text-[#F32735] mb-1">{stats.totalChampionships}</p>
              <p className="text-xs text-[#D9D9D9]">Ativo</p>
            </CardContent>
          </Card>

          {/* Atletas Inscritos */}
          <Card className="bg-[#1F3342] border-[#1F3342] relative">
            <CardContent className="p-6">
              <div className="absolute top-4 right-4">
                <Trophy className="w-5 h-5 text-[#F32735]" />
              </div>
              <h3 className="text-sm text-[#FAFAFA] mb-2">Atletas Inscritos</h3>
              <p className="text-3xl font-bold text-[#F32735] mb-1">{stats.totalAthletes}</p>
              <p className="text-xs text-[#D9D9D9]">Confirmados</p>
            </CardContent>
          </Card>

          {/* Receita Total */}
          <Card className="bg-[#1F3342] border-[#1F3342] relative">
            <CardContent className="p-6">
              <div className="absolute top-4 right-4">
                <Trophy className="w-5 h-5 text-[#F32735]" />
              </div>
              <h3 className="text-sm text-[#FAFAFA] mb-2">Receita Total</h3>
              <p className="text-3xl font-bold text-[#F32735] mb-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-[#D9D9D9]">Líquido</p>
            </CardContent>
          </Card>
        </div>

        {/* Meus Campeonatos Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">Meus Campeonatos</h2>
          
          {championships.length === 0 ? (
            <Card className="bg-[#1F3342] border-[#1F3342]">
              <CardContent className="p-8 text-center">
                <p className="text-[#D9D9D9]">Nenhum campeonato criado ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {championships.map((championship) => (
                <Card key={championship.id} className="bg-[#1F3342] border-[#1F3342]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-[#FAFAFA]">
                            {championship.name}
                          </h3>
                          <div className="w-2 h-2 rounded-full bg-[#F32735]"></div>
                        </div>
                        <p className="text-sm text-[#D9D9D9]">
                          {formatDateRange(championship)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedChampionship(championship);
                            navigate("/app");
                          }}
                          className="border-[#D9D9D9] text-[#FAFAFA] hover:bg-[#051C2C]"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurações
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setChampionshipToDelete(championship);
                            setDeleteDialogOpen(true);
                          }}
                          className="border-[#D9D9D9] text-[#FAFAFA] hover:bg-[#051C2C]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <button
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#F32735] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50"
            aria-label="Criar novo campeonato"
          >
            <Plus className="w-6 h-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="bg-[#1F3342] border-[#1F3342] text-[#FAFAFA]">
          <DialogHeader>
            <DialogTitle className="text-[#FAFAFA]">Criar Novo Campeonato</DialogTitle>
            <DialogDescription className="text-[#D9D9D9]">
              Preencha os dados básicos do seu campeonato
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChampionship} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-[#FAFAFA]">Nome do Campeonato *</Label>
              <Input 
                id="name" 
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Open 2024" 
                required
                className="bg-[#051C2C] border-[#1F3342] text-[#FAFAFA]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="text-[#FAFAFA]">Data *</Label>
                <Input 
                  id="date" 
                  name="date"
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="bg-[#051C2C] border-[#1F3342] text-[#FAFAFA]"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-[#FAFAFA]">Local *</Label>
                <Input 
                  id="location" 
                  name="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Box CrossFit SP" 
                  required
                  className="bg-[#051C2C] border-[#1F3342] text-[#FAFAFA]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-[#FAFAFA]">Descrição</Label>
              <Textarea 
                id="description" 
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva seu campeonato..."
                rows={3}
                className="bg-[#051C2C] border-[#1F3342] text-[#FAFAFA]"
              />
            </div>
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1 border-[#D9D9D9] text-[#FAFAFA] hover:bg-[#051C2C]"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-[#F32735] hover:bg-[#d11f2d] text-white"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Campeonato"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1F3342] border-[#1F3342] text-[#FAFAFA]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#FAFAFA]">Excluir Campeonato</AlertDialogTitle>
            <AlertDialogDescription className="text-[#D9D9D9]">
              Tem certeza que deseja excluir "{championshipToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#D9D9D9] text-[#FAFAFA] hover:bg-[#051C2C]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChampionship}
              className="bg-[#F32735] hover:bg-[#d11f2d] text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
