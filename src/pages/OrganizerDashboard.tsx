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
  Trophy, LogOut, Settings, Trash2, Plus, Loader2, Pencil, Users, DollarSign
} from "lucide-react";
import { useChampionship } from "@/contexts/ChampionshipContext";

import { ProfileDialog } from "@/components/ProfileDialog";
import { StatsCard } from "@/components/stats/StatsCard";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { setSelectedChampionship, loadChampionships } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [championships, setChampionships] = useState<any[]>([]);

  // New States for Profile and Avatar
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    registrationDeadline: '',
    city: '',
    state: '',
    address: ''
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
    loadProfileStats(session.user.id);
  };

  const loadProfileStats = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (data) setAvatarUrl(data.avatar_url);
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
  // ... (rest of component, e.g. delete logic)


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

      // Concat location from parts
      // Note: If user didn't fill anything (unlikely due to required), fallback to ""
      // We prioritize the parts if they exist
      let finalLocation = formData.location;
      if (formData.address || formData.city || formData.state) {
        finalLocation = `${formData.address}${formData.city ? ` - ${formData.city}` : ''}${formData.state ? `/${formData.state}` : ''}`;
      }

      const { name, date, description, registrationDeadline } = formData;

      if (!name || !date || !finalLocation) {
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
          location: finalLocation, // using the constructed location
          city: formData.city,
          state: formData.state,
          address: formData.address,
          registration_deadline: registrationDeadline || null,
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
      setFormData({
        name: '',
        date: '',
        location: '',
        description: '',
        registrationDeadline: '',
        city: '',
        state: '',
        address: ''
      });

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
        onProfileUpdate={() => checkAuth()}
      />

      {/* Header */}
      <div className="border-b bg-[#0f172a] text-white">
        <div className="w-full mx-auto px-6 py-4 max-w-[98%]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setProfileOpen(true)}>
              <div className="relative">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted/10 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                  <Pencil className="w-3 h-3 text-black" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold">Área do Organizador</h1>
                <p className="text-sm text-gray-400">
                  Bem-vindo, {user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={() => navigate("/athlete-dashboard")}
              >
                Área do Atleta
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 pb-24 max-w-[98%] mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatsCard
            title="Total de Campeonatos"
            value={stats.totalChampionships}
            icon={Trophy}
            trend="Ativo"
          />
          <StatsCard
            title="Atletas Inscritos"
            value={stats.totalAthletes}
            icon={Users}
            trend="Confirmados"
          />
          <StatsCard
            title="Receita Total"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            trend="Líquido"
          />
        </div>

        {/* Meus Campeonatos Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">Meus Campeonatos</h2>

          {
            championships.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhum campeonato criado ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {championships.map((championship) => (
                  <Card key={championship.id} className="shadow-card transition-all hover:bg-muted/5">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold">
                              {championship.name}
                            </h3>
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                          </div>
                          <p className="text-sm text-muted-foreground">
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
                            className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
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
            )
          }
        </div>
      </div>

      {/* Floating Action Button */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <button
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D71C1D] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50"
            aria-label="Criar novo campeonato"
          >
            <Plus className="w-6 h-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Campeonato</DialogTitle>
            <DialogDescription>
              Preencha os dados básicos do seu campeonato
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChampionship} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Campeonato *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Open 2024"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Data do Evento *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="registrationDeadline">Encerramento Inscrições</Label>
                <Input
                  id="registrationDeadline"
                  name="registrationDeadline"
                  type="date"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                />
              </div>
            </div>

            {/* Address Fields - Unboxed */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Número, Bairro"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado (UF) *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva seu campeonato..."
                rows={3}
              />
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#D71C1D] hover:bg-[#d11f2d] text-white"
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
      </Dialog >

      {/* Delete Confirmation Dialog */}
      < AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} >
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
              className="bg-[#D71C1D] hover:bg-[#d11f2d] text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >
    </div >
  );
}
