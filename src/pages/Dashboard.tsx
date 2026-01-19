import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Target, Dumbbell, Loader2, Trophy, Upload, Clock, Settings, CheckCircle2, Plus, QrCode, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/stats/StatsCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedChampionship, setSelectedChampionship, championships, loadChampionships, loading: contextLoading } = useChampionship();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editInfoData, setEditInfoData] = useState({
    name: '',
    date: '',
    description: '',
    address: '',
    city: '',
    state: '',
    registrationDeadline: '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    athletes: 0,
    categories: 0,
    wods: 0,
    teams: 0,
    revenue: 0,
  });
  const [editRegulationOpen, setEditRegulationOpen] = useState(false);
  const [regulationText, setRegulationText] = useState("");

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: '',
  });
  const [scheduleConfig, setScheduleConfig] = useState({
    startTime: '08:00',
    breakIntervalMinutes: 5,
    enableBreak: false,
    breakDurationMinutes: 30,
    breakAfterWodNumber: 1,
    totalDays: 1,
  });
  const [wods, setWods] = useState<any[]>([]);
  const [championshipDays, setChampionshipDays] = useState<any[]>([]);
  const [dayWods, setDayWods] = useState<Map<number, any[]>>(new Map());
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const autoSeededRef = useRef<Set<string>>(new Set());
  const scaleTriosEnsuredRef = useRef<Set<string>>(new Set());
  const randomResultsEnsuredRef = useRef<Set<string>>(new Set());
  const [totalDaysInput, setTotalDaysInput] = useState('1');

  useEffect(() => {
    if (selectedChampionship) {
      loadStats();
      loadScheduleConfig();
      loadWODs();
      loadChampionshipDays();
    }
  }, [selectedChampionship]);

  const loadStats = async () => {
    if (!selectedChampionship) return;

    setLoading(true);
    try {
      const [categoriesResult, wodsResult, registrationsResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, team_size, format", { count: "exact" })
          .eq("championship_id", selectedChampionship.id),
        supabase
          .from("wods")
          .select("id", { count: "exact" })
          .eq("championship_id", selectedChampionship.id),
        supabase
          .from("registrations")
          .select("id, team_name, team_members, category_id, payment_status, subtotal_cents")
          .eq("championship_id", selectedChampionship.id),
      ]);

      const categoriesData = categoriesResult.data || [];
      const categoryMap = new Map(
        categoriesData.map((category: any) => [category.id, category])
      );

      const registrations = registrationsResult.data || [];

      const totalAthletes = registrations.reduce((acc: number, registration: any) => {
        if (!registration.team_name) {
          return acc + 1;
        }

        let teamMembers = registration.team_members;
        if (typeof teamMembers === 'string') {
          try {
            teamMembers = JSON.parse(teamMembers);
          } catch {
            teamMembers = null;
          }
        }

        if (Array.isArray(teamMembers) && teamMembers.length > 0) {
          return acc + teamMembers.length;
        }

        const categoryInfo = categoryMap.get(registration.category_id);
        if (categoryInfo?.team_size && categoryInfo.team_size > 0) {
          return acc + categoryInfo.team_size;
        }

        switch (categoryInfo?.format) {
          case 'dupla':
            return acc + 2;
          case 'trio':
            return acc + 3;
          case 'time':
            return acc + 4;
          default:
            return acc + 1;
        }
      }, 0);

      const teams = registrations.filter((registration: any) => registration.team_name).length;

      const revenue = registrations
        .filter((r: any) => r.payment_status === 'approved')
        .reduce((sum: number, r: any) => sum + (r.subtotal_cents || 0), 0);

      setStats({
        categories: categoriesResult.count || 0,
        wods: wodsResult.count || 0,
        athletes: totalAthletes,
        teams: teams,
        revenue,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleConfig = async () => {
    if (!selectedChampionship) return;

    try {
      const { data, error } = await supabase
        .from("championships")
        .select("enable_break, break_duration_minutes, break_after_wod_number, total_days")
        .eq("id", selectedChampionship.id)
        .single();

      if (error) throw error;

      if (data) {
        setScheduleConfig({
          startTime: '',
          breakIntervalMinutes: 5,
          enableBreak: data.enable_break || false,
          breakDurationMinutes: data.break_duration_minutes || 30,
          breakAfterWodNumber: data.break_after_wod_number || 1,
          totalDays: data.total_days || 1,
        });
        setTotalDaysInput(String(data.total_days || 1));
      }
    } catch (error: any) {
      console.error("Error loading schedule config:", error);
    }
  };

  const loadWODs = async () => {
    if (!selectedChampionship) return;

    try {
      const { data, error } = await supabase
        .from("wods")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_num");

      if (error) throw error;
      setWods(data || []);
    } catch (error: any) {
      console.error("Error loading WODs:", error);
    }
  };

  const loadChampionshipDays = async () => {
    if (!selectedChampionship) return;

    try {
      const { data: daysData, error: daysError } = await supabase
        .from("championship_days")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("day_number");

      if (daysError) throw daysError;

      if (daysData && daysData.length > 0) {
        setChampionshipDays(daysData);

        const wodsByDay = new Map<number, any[]>();
        daysData.forEach(day => wodsByDay.set(day.day_number, []));

        const dayIds = daysData.map(d => d.id);
        const { data: wodsData, error: wodsError } = await supabase
          .from("championship_day_wods")
          .select("*, wods(*)")
          .in("championship_day_id", dayIds)
          .order("order_num");

        if (!wodsError && wodsData) {
          daysData.forEach(day => {
            const dayWodsList = wodsData
              .filter(dw => dw.championship_day_id === day.id)
              .map(dw => ({ ...dw.wods, order_num: dw.order_num }))
              .sort((a, b) => a.order_num - b.order_num);
            wodsByDay.set(day.day_number, dayWodsList);
          });
        }
        setDayWods(wodsByDay);
      } else {
        await initializeDays();
      }
    } catch (error: any) {
      console.error("Error loading championship days:", error);
    }
  };

  const initializeDays = async () => {
    if (!selectedChampionship) return;

    const days = [];
    const baseDate = new Date(selectedChampionship.date);

    for (let i = 1; i <= scheduleConfig.totalDays; i++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + (i - 1));

      const { data, error } = await supabase
        .from("championship_days")
        .insert({
          championship_id: selectedChampionship.id,
          day_number: i,
          date: dayDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (!error && data) {
        days.push(data);
      }
    }

    if (days.length > 0) {
      setChampionshipDays(days);
      const initialMap = new Map<number, any[]>();
      days.forEach(day => initialMap.set(day.day_number, []));
      setDayWods(initialMap);
    }
  };

  const updateDaysCount = async (newDays: number) => {
    if (!selectedChampionship) return;

    const currentDays = championshipDays.length;

    if (newDays > currentDays) {
      const baseDate = new Date(selectedChampionship.date);
      for (let i = currentDays + 1; i <= newDays; i++) {
        const dayDate = new Date(baseDate);
        dayDate.setDate(baseDate.getDate() + (i - 1));

        const { data, error } = await supabase
          .from("championship_days")
          .insert({
            championship_id: selectedChampionship.id,
            day_number: i,
            date: dayDate.toISOString().split('T')[0],
          })
          .select()
          .single();

        if (!error && data) {
          setChampionshipDays(prev => [...prev, data]);
          setDayWods(prev => {
            const next = new Map(prev);
            next.set(data.day_number, []);
            return next;
          });
        }
      }
    } else if (newDays < currentDays) {
      const daysToRemove = championshipDays.slice(newDays);
      for (const day of daysToRemove) {
        await supabase
          .from("championship_days")
          .delete()
          .eq("id", day.id);
      }
      setChampionshipDays(prev => prev.slice(0, newDays));
      setDayWods(prev => {
        const next = new Map(prev);
        daysToRemove.forEach(day => next.delete(day.day_number));
        return next;
      });
    }

    await loadChampionshipDays();
  };

  const addWodToDay = async (dayId: string, wodId: string) => {
    if (!selectedChampionship) return;

    const day = championshipDays.find(d => d.id === dayId);
    if (!day) return;

    const dayWodsList = dayWods.get(day.day_number) || [];
    const maxOrder = dayWodsList.length > 0
      ? Math.max(...dayWodsList.map(w => w.order_num))
      : 0;

    const { error } = await supabase
      .from("championship_day_wods")
      .insert({
        championship_day_id: dayId,
        wod_id: wodId,
        order_num: maxOrder + 1,
      });

    if (error) {
      toast.error("Erro ao adicionar prova ao dia");
      return;
    }

    await loadChampionshipDays();
  };

  const removeWodFromDay = async (dayId: string, wodId: string) => {
    const { error } = await supabase
      .from("championship_day_wods")
      .delete()
      .eq("championship_day_id", dayId)
      .eq("wod_id", wodId);

    if (error) {
      toast.error("Erro ao remover prova do dia");
      return;
    }

    await loadChampionshipDays();
    toast.success("Prova removida do dia");
  };

  const handleDayBreakToggle = async (dayId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("championship_days")
        .update({ enable_break: enabled })
        .eq("id", dayId);

      if (error) throw error;

      setChampionshipDays(prev => prev.map(day =>
        day.id === dayId ? { ...day, enable_break: enabled } : day
      ));

      toast.success(enabled ? "Pausa ativada para este dia" : "Pausa desativada para este dia");
    } catch (error: any) {
      console.error("Error updating day break:", error);
      toast.error("Erro ao atualizar configuração de pausa");
    }
  };

  const handleDayBreakUpdate = async (dayId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("championship_days")
        .update({ [field]: value })
        .eq("id", dayId);

      if (error) throw error;

      setChampionshipDays(prev => prev.map(day =>
        day.id === dayId ? { ...day, [field]: value } : day
      ));

      toast.success("Configuração atualizada!");
    } catch (error: any) {
      console.error("Error updating day break:", error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleSaveScheduleConfig = async () => {
    if (!selectedChampionship) return;

    setSavingSchedule(true);
    try {
      const { error } = await supabase
        .from("championships")
        .update({
          enable_break: scheduleConfig.enableBreak,
          break_duration_minutes: scheduleConfig.breakDurationMinutes,
          break_after_wod_number: scheduleConfig.breakAfterWodNumber,
          total_days: scheduleConfig.totalDays,
        })
        .eq("id", selectedChampionship.id);

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving schedule config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSavingSchedule(false);
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

  const handleSaveRegulation = async () => {
    try {
      if (!selectedChampionship) return;

      const { error } = await supabase
        .from('championships')
        .update({ regulation: regulationText })
        .eq('id', selectedChampionship.id);

      if (error) throw error;

      toast.success("Regulamento atualizado com sucesso!");
      setEditRegulationOpen(false);
      loadDashboardData(); // Reload to update state
    } catch (error: any) {
      console.error("Erro ao salvar regulamento:", error);
      toast.error("Erro ao salvar regulamento");
    }
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
      setIsDialogOpen(false);
      setFormData({ name: '', date: '', location: '', description: '' });

      await loadChampionships();
      if (championship) {
        setSelectedChampionship(championship);
      }
    } catch (error: any) {
      console.error("Error creating championship:", error);
      toast.error("Erro ao criar campeonato");
    } finally {
      setCreating(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (championships.length === 0 && !selectedChampionship) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nenhum campeonato criado</h3>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro campeonato para começar a gerenciar categorias, WODs e inscrições.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setFormData({ name: '', date: '', location: '', description: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-glow">
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Primeiro Campeonato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Campeonato</DialogTitle>
                  <DialogDescription>
                    Preencha os dados básicos do seu campeonato. Você poderá configurar categorias, WODs e mais depois.
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
                      <Label htmlFor="date">Data *</Label>
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
                      <Label htmlFor="location">Local *</Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ex: Box CrossFit SP"
                        required
                      />
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
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={creating}>
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
            <div className="mt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/dashboard")}
              >
                Painel do Organizador
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="flex items-start justify-between gap-4 mb-8 animate-fade-in flex-col md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            {selectedChampionship ? selectedChampionship.name : "Escolha um campeonato"}
          </h1>
          <p className="text-muted-foreground">
            Gerencie seu campeonato e visualize estatísticas detalhadas
          </p>
        </div>
        <Button
          size="lg"
          className="shadow-glow"
          onClick={() => navigate("/dashboard")}
        >
          <Settings className="w-5 h-5 mr-2" />
          Painel do Organizador
        </Button>
      </div>

      {/* Championship Selector */}
      <div className="mb-8">
        <Label className="mb-2 block">Escolha um campeonato</Label>
        <Select
          value={selectedChampionship?.id || ''}
          onValueChange={(value) => {
            const champ = championships.find(c => c.id === value);
            if (champ) {
              setSelectedChampionship(champ);
            }
          }}
        >
          <SelectTrigger className="w-full md:w-[400px] bg-card">
            <SelectValue placeholder="Escolha um campeonato">
              {selectedChampionship ? selectedChampionship.name : "Escolha um campeonato"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {championships.map((champ) => (
              <SelectItem key={champ.id} value={champ.id}>
                {champ.name} - {new Date(champ.date).toLocaleDateString('pt-BR')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedChampionship ? (
        <>
          {/* Championship Info Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedChampionship.name}</CardTitle>
                  <CardDescription className="mt-2">
                    <div className="space-y-1">
                      <p>Data: {new Date(selectedChampionship.date).toLocaleDateString('pt-BR')}</p>
                      <p>Local: {selectedChampionship.location}</p>
                      {selectedChampionship.description && (
                        <p className="mt-2">{selectedChampionship.description}</p>
                      )}
                    </div>
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/championships/${selectedChampionship.id}/links`)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Links Públicos
                  </Button>
                  <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditInfoData({
                            name: selectedChampionship.name || '',
                            date: selectedChampionship.date ? selectedChampionship.date.split('T')[0] : '',
                            description: selectedChampionship.description || '',
                            address: selectedChampionship.address || '',
                            city: selectedChampionship.city || '',
                            state: selectedChampionship.state || '',
                            registrationDeadline: selectedChampionship.registration_deadline ? selectedChampionship.registration_deadline.split('T')[0] : '',
                          });
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Editar Informações
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Informações do Campeonato</DialogTitle>
                        <DialogDescription>
                          Atualize a data, local e data de encerramento das inscrições
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-name">Nome do Campeonato *</Label>
                          <Input
                            id="edit-name"
                            value={editInfoData.name}
                            onChange={(e) => setEditInfoData({ ...editInfoData, name: e.target.value })}
                            placeholder="Ex: Open 2024"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-date">Data do Evento *</Label>
                            <Input
                              id="edit-date"
                              type="date"
                              value={editInfoData.date}
                              onChange={(e) => setEditInfoData({ ...editInfoData, date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-registrationDeadline">Encerramento Inscrições</Label>
                            <Input
                              id="edit-registrationDeadline"
                              type="date"
                              value={editInfoData.registrationDeadline}
                              onChange={(e) => setEditInfoData({ ...editInfoData, registrationDeadline: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="edit-address">Endereço *</Label>
                            <Input
                              id="edit-address"
                              value={editInfoData.address}
                              onChange={(e) => setEditInfoData({ ...editInfoData, address: e.target.value })}
                              placeholder="Rua, Número, Bairro"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-city">Cidade *</Label>
                              <Input
                                id="edit-city"
                                value={editInfoData.city}
                                onChange={(e) => setEditInfoData({ ...editInfoData, city: e.target.value })}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-state">Estado (UF) *</Label>
                              <Input
                                id="edit-state"
                                value={editInfoData.state}
                                onChange={(e) => setEditInfoData({ ...editInfoData, state: e.target.value })}
                                required
                                maxLength={2}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="edit-description">Descrição</Label>
                          <Textarea
                            id="edit-description"
                            value={editInfoData.description}
                            onChange={(e) => setEditInfoData({ ...editInfoData, description: e.target.value })}
                            placeholder="Descreva seu campeonato..."
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setEditInfoOpen(false)}
                            disabled={savingInfo}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={async () => {
                              if (!selectedChampionship?.id) return;
                              if (!editInfoData.name || !editInfoData.date || !editInfoData.address || !editInfoData.city || !editInfoData.state) {
                                toast.error('Preencha os campos obrigatórios');
                                return;
                              }

                              try {
                                setSavingInfo(true);

                                const location = `${editInfoData.address} - ${editInfoData.city}/${editInfoData.state}`;

                                const updateData: Record<string, any> = {
                                  name: editInfoData.name,
                                  date: editInfoData.date,
                                  location: location,
                                  address: editInfoData.address,
                                  city: editInfoData.city,
                                  state: editInfoData.state,
                                  description: editInfoData.description || null,
                                  registration_deadline: editInfoData.registrationDeadline || null
                                };

                                const { error } = await supabase
                                  .from('championships')
                                  .update(updateData)
                                  .eq('id', selectedChampionship.id);

                                if (error) throw error;

                                await loadChampionships();
                                const updated = championships.find(c => c.id === selectedChampionship.id) || selectedChampionship;
                                setSelectedChampionship({
                                  ...updated,
                                  ...updateData,
                                });

                                toast.success('Informações atualizadas com sucesso!');
                                setEditInfoOpen(false);
                              } catch (error: any) {
                                console.error('Error updating championship:', error);
                                toast.error('Erro ao atualizar informações');
                              } finally {
                                setSavingInfo(false);
                              }
                            }}
                            disabled={savingInfo}
                          >
                            {savingInfo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Regulation Button */}
                  <Dialog open={editRegulationOpen} onOpenChange={setEditRegulationOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRegulationText(selectedChampionship.regulation || "");
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Regulamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Editar Regulamento</DialogTitle>
                        <DialogDescription>
                          Insira o texto completo do regulamento do campeonato.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 py-4">
                        <Textarea
                          value={regulationText}
                          onChange={(e) => setRegulationText(e.target.value)}
                          className="h-full min-h-[300px] font-sans text-sm"
                          placeholder="Cole o regulamento aqui..."
                        />
                      </div>
                      <Button onClick={handleSaveRegulation} className="text-white">
                        Salvar Regulamento
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Total de Atletas"
              value={stats.athletes}
              icon={Users}
              trend="Inscritos"
            />
            <StatsCard
              title="Receita Total"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue / 100)}
              icon={DollarSign}
              trend="Faturamento"
            />
            <StatsCard
              title="WODs Criados"
              value={stats.wods}
              icon={Dumbbell}
              trend="Ativos"
            />
          </div>

          {/* Schedule Configuration */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <CardTitle>Configuração de Horários</CardTitle>
              </div>
              <CardDescription>
                Configure os horários de início, intervalos e pausas do evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="totalDays">Duração do Evento (dias)</Label>
                    <Input
                      id="totalDays"
                      type="number"
                      min="1"
                      value={totalDaysInput}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          setTotalDaysInput('');
                          return;
                        }

                        const parsed = parseInt(rawValue, 10);
                        if (Number.isNaN(parsed)) {
                          return;
                        }

                        const normalized = parsed < 1 ? 1 : parsed;
                        setTotalDaysInput(String(normalized));
                        setScheduleConfig({ ...scheduleConfig, totalDays: normalized });
                        updateDaysCount(normalized);
                      }}
                      onBlur={() => {
                        if (totalDaysInput === '') {
                          const fallback = scheduleConfig.totalDays || 1;
                          setTotalDaysInput(String(fallback));
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold">Configuração de Pausas</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure pausas específicas para cada dia do evento na seção "Distribuição de Provas por Dia" abaixo.
                        Cada dia pode ter sua própria pausa com duração e momento personalizados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Distribuição de Provas por Dia</Label>
                  </div>

                  {championshipDays.length === 0 && (
                    <div className="p-5 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        Defina a duração do evento em dias e clique em "Gerar dias" para configurar horários, intervalos e pausas.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={initializeDays}
                        >
                          Gerar dias automaticamente
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => updateDaysCount(scheduleConfig.totalDays || 1)}
                        >
                          Atualizar conforme duração escolhida
                        </Button>
                      </div>
                    </div>
                  )}

                  {championshipDays.map((day) => {
                    const dayWodsList = dayWods.get(day.day_number) || [];
                    const allAssignedWodIds = new Set(
                      Array.from(dayWods.values()).flat().map(w => w.id)
                    );
                    const availableWods = wods.filter(w => !allAssignedWodIds.has(w.id));

                    return (
                      <Card key={day.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">Dia {day.day_number}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <Label className="text-sm">Provas do Dia:</Label>
                          <div className="flex flex-wrap gap-2">
                            {dayWodsList.map((wod, idx) => (
                              <div key={wod.id} className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-md">
                                <span className="text-sm font-medium">{idx + 1}º - {wod.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => removeWodFromDay(day.id, wod.id)}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                            {dayWodsList.length === 0 && (
                              <p className="text-sm text-muted-foreground">Nenhuma prova atribuída</p>
                            )}
                          </div>
                        </div>

                        {availableWods.length > 0 && (
                          <Select
                            onValueChange={(wodId) => addWodToDay(day.id, wodId)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Adicionar prova ao dia" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableWods.map((wod) => (
                                <SelectItem key={wod.id} value={wod.id}>
                                  {wod.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {availableWods.length === 0 && dayWodsList.length < wods.length && (
                          <p className="text-sm text-muted-foreground">
                            Todas as provas já foram atribuídas a outros dias
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={day.enable_break || false}
                                onCheckedChange={(checked) => handleDayBreakToggle(day.id, checked)}
                              />
                              <div>
                                <Label className="cursor-pointer">Ativar Pausa para este Dia</Label>
                                <p className="text-xs text-muted-foreground">Configure uma pausa específica para este dia</p>
                              </div>
                            </div>
                          </div>

                          {day.enable_break && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                              <div>
                                <Label htmlFor={`breakDuration-${day.id}`}>Duração da Pausa (minutos)</Label>
                                <Input
                                  id={`breakDuration-${day.id}`}
                                  type="number"
                                  min="0"
                                  value={
                                    day.break_duration_minutes !== null && day.break_duration_minutes !== undefined
                                      ? day.break_duration_minutes
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    if (rawValue === '') {
                                      handleDayBreakUpdate(day.id, 'break_duration_minutes', null);
                                      return;
                                    }

                                    const parsed = parseInt(rawValue, 10);
                                    if (Number.isNaN(parsed)) {
                                      return;
                                    }

                                    handleDayBreakUpdate(day.id, 'break_duration_minutes', parsed);
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`breakAfterWod-${day.id}`}>Após Qual Prova</Label>
                                <Select
                                  value={day.break_after_wod_number?.toString() || '1'}
                                  onValueChange={(value) => handleDayBreakUpdate(day.id, 'break_after_wod_number', parseInt(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dayWodsList.map((wod, index) => (
                                      <SelectItem key={wod.id} value={(index + 1).toString()}>
                                        Após {wod.name} (Prova {index + 1})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  A pausa será aplicada após todas as baterias desta prova
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSaveScheduleConfig}
                    disabled={savingSchedule || loadingSchedule}
                    className="flex-1"
                  >
                    {savingSchedule || loadingSchedule ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {savingSchedule ? "Salvando..." : "Calculando..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Salvar Configuração
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Selecione um campeonato para ver as estatísticas e gerenciar.</p>
        </Card>
      )}
    </div>
  );
}
