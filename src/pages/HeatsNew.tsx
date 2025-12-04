import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Clock, Loader2, GripVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function HeatsNew() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWODs] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [wodResults, setWodResults] = useState<any[]>([]);
  const [heats, setHeats] = useState<any[]>([]);
  const [heatEntries, setHeatEntries] = useState<any[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWOD, setSelectedWOD] = useState<string>('');
  const [athletesPerHeat, setAthletesPerHeat] = useState<number>(4);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [transitionTime, setTransitionTime] = useState<number>(4);
  const [orderBy, setOrderBy] = useState<'number' | 'rank'>('number');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allHeatEntries, setAllHeatEntries] = useState<Map<string, any[]>>(new Map());
  const [savingEdits, setSavingEdits] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'baterias' | 'horarios'>('baterias');
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadData();
    }
  }, [selectedChampionship]);

  useEffect(() => {
    if (selectedChampionship && selectedCategory) {
      loadWodResults();
    }
  }, [selectedChampionship, selectedCategory]);

  useEffect(() => {
    if (selectedChampionship) {
      loadHeats();
    }
  }, [selectedChampionship, selectedCategory, selectedWOD]);

  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const category = categories.find(c => c.id === selectedCategory);
      if (category && category.athletes_per_heat) {
        setAthletesPerHeat(category.athletes_per_heat);
      }
    }
  }, [selectedCategory, categories]);

  useEffect(() => {
    const filteredHeats = heats.filter(h => {
      if (selectedCategory && selectedWOD) {
        return h.category_id === selectedCategory && h.wod_id === selectedWOD;
      } else if (selectedCategory) {
        return h.category_id === selectedCategory;
      } else if (selectedWOD) {
        return h.wod_id === selectedWOD;
      }
      return true;
    });
      
    if (filteredHeats.length > 0 && heatEntries.length > 0) {
      const entriesMap = new Map<string, any[]>();
      filteredHeats.forEach(heat => {
        const entries = heatEntries
          .filter(e => e.heat_id === heat.id)
          .sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0));
        entriesMap.set(heat.id, entries);
      });
      setAllHeatEntries(entriesMap);
    } else {
      setAllHeatEntries(new Map());
    }
  }, [heats, heatEntries, selectedCategory, selectedWOD]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadData = async () => {
    if (!selectedChampionship) return;
    
    setLoading(true);
    try {
      const [catsResult, wodsResult, regsResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", selectedChampionship.id).order("order_index"),
        supabase.from("wods").select("*").eq("championship_id", selectedChampionship.id).order("order_num"),
        supabase.from("registrations").select("*").eq("championship_id", selectedChampionship.id).eq("status", "approved"),
      ]);

      if (catsResult.error) throw catsResult.error;
      if (wodsResult.error) throw wodsResult.error;
      if (regsResult.error) throw regsResult.error;

      setCategories(catsResult.data || []);
      setWODs(wodsResult.data || []);
      setRegistrations(regsResult.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadWodResults = async () => {
    if (!selectedChampionship || !selectedCategory) return;

    try {
      const { data: resultsData, error: resultsError } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory);
      
      if (!resultsError) {
        setWodResults(resultsData || []);
      }
    } catch (error: any) {
      console.error("Error loading results:", error);
    }
  };

  const loadHeats = async () => {
    if (!selectedChampionship) return;

    try {
      let query = supabase
        .from("heats")
        .select("*")
        .eq("championship_id", selectedChampionship.id);

      if (selectedCategory && selectedWOD) {
        query = query.eq("category_id", selectedCategory).eq("wod_id", selectedWOD);
      } else if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      } else if (selectedWOD) {
        query = query.eq("wod_id", selectedWOD);
      }

      const { data: heatsData, error: heatsError } = await query.order("heat_number");

      if (heatsError) throw heatsError;

      setHeats(heatsData || []);

      if (heatsData && heatsData.length > 0) {
        const heatIds = heatsData.map(h => h.id);
        const { data: entriesData, error: entriesError } = await supabase
          .from("heat_entries")
          .select("*")
          .in("heat_id", heatIds)
          .order("lane_number");

        if (!entriesError) {
          setHeatEntries(entriesData || []);
        }
      } else {
        setHeatEntries([]);
      }
    } catch (error: any) {
      console.error("Error loading heats:", error);
    }
  };

  const calculateLeaderboard = () => {
    if (!selectedCategory) return [];

    const participantMap = new Map<string, any>();
    
    wodResults
      .filter(r => r.category_id === selectedCategory)
      .forEach(result => {
        const regId = result.registration_id;
        if (!regId) return;
        
        if (!participantMap.has(regId)) {
          participantMap.set(regId, {
            registrationId: regId,
            totalPoints: 0,
            results: [],
          });
        }
        
        const participant = participantMap.get(regId)!;
        participant.totalPoints += result.points || 0;
        participant.results.push(result);
      });

    return Array.from(participantMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((p, index) => ({
        ...p,
        position: index + 1,
      }));
  };

  const handleGenerateHeats = async () => {
    if (!selectedChampionship || !selectedCategory || !selectedWOD) {
      toast.error("Selecione categoria e WOD");
      return;
    }

    setGenerating(true);
    try {
      const categoryRegs = registrations.filter(r => r.category_id === selectedCategory);
      
      if (categoryRegs.length === 0) {
        toast.error("Nenhuma inscrição encontrada para esta categoria");
        setGenerating(false);
        return;
      }

      const leaderboard = calculateLeaderboard();
      const hasResults = leaderboard.length > 0 && leaderboard.some(l => l.totalPoints > 0);

      let orderedParticipants: any[];
      
      if (!hasResults) {
        orderedParticipants = categoryRegs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(reg => ({ registrationId: reg.id }));
      } else {
        const leaderboardMap = new Map(leaderboard.map(l => [l.registrationId, l]));
        orderedParticipants = categoryRegs
          .map(reg => ({
            registrationId: reg.id,
            totalPoints: leaderboardMap.get(reg.id)?.totalPoints || 0,
          }))
          .sort((a, b) => a.totalPoints - b.totalPoints);
      }

      const totalHeats = Math.ceil(orderedParticipants.length / athletesPerHeat);

      // Deletar baterias existentes
      const existingHeats = heats.filter(
        h => h.category_id === selectedCategory && h.wod_id === selectedWOD
      );

      if (existingHeats.length > 0) {
        const heatIds = existingHeats.map(h => h.id);
        
        await supabase
          .from("heat_entries")
          .delete()
          .in("heat_id", heatIds);

        await supabase
          .from("heats")
          .delete()
          .in("id", heatIds);
      }

      // Criar novas baterias
      for (let i = 0; i < totalHeats; i++) {
        const startIndex = i * athletesPerHeat;
        const endIndex = Math.min(startIndex + athletesPerHeat, orderedParticipants.length);
        const heatParticipants = orderedParticipants.slice(startIndex, endIndex);

        const { data: newHeat, error: heatError } = await supabase
          .from("heats")
          .insert({
            championship_id: selectedChampionship.id,
            category_id: selectedCategory,
            wod_id: selectedWOD,
            heat_number: i + 1,
            athletes_per_heat: athletesPerHeat,
          })
          .select()
          .single();

        if (heatError) throw heatError;

        const entries = heatParticipants.map((participant, index) => ({
          heat_id: newHeat.id,
          registration_id: participant.registrationId,
          lane_number: index + 1,
        }));

        if (entries.length > 0) {
          const { error: entriesError } = await supabase
            .from("heat_entries")
            .insert(entries);

          if (entriesError) throw entriesError;
        }
      }

      toast.success(`${totalHeats} baterias geradas com sucesso!`);
      await loadHeats();
    } catch (error: any) {
      console.error("Error generating heats:", error);
      toast.error("Erro ao gerar baterias");
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyTransition = async () => {
    toast.success(`Transição de ${transitionTime} minutos aplicada!`);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeMatch = activeId.match(/^heat-(.+?)-entry-(.+)$/);
    const overMatch = overId.match(/^heat-(.+?)-entry-(.+)$/);

    if (!activeMatch) {
      setActiveId(null);
      return;
    }

    const [, activeHeatId, activeEntryId] = activeMatch;
    const activeEntry = allHeatEntries.get(activeHeatId)?.find(e => e.id === activeEntryId);
    
    if (!activeEntry) {
      setActiveId(null);
      return;
    }

    const newEntriesMap = new Map(allHeatEntries);

    if (overMatch) {
      const [, overHeatId, overEntryId] = overMatch;
      const overHeatEntries = newEntriesMap.get(overHeatId) || [];
      const activeHeatEntries = newEntriesMap.get(activeHeatId) || [];

      const updatedActiveHeat = activeHeatEntries.filter(e => e.id !== activeEntryId);
      newEntriesMap.set(activeHeatId, updatedActiveHeat);

      const overIndex = overHeatEntries.findIndex(e => e.id === overEntryId);
      
      if (activeHeatId === overHeatId) {
        const activeIndex = activeHeatEntries.findIndex(e => e.id === activeEntryId);
        const newEntries = arrayMove(activeHeatEntries, activeIndex, overIndex);
        newEntriesMap.set(activeHeatId, newEntries);
      } else {
        const updatedOverHeat = [...overHeatEntries];
        updatedOverHeat.splice(overIndex, 0, { ...activeEntry, heat_id: overHeatId });
        newEntriesMap.set(overHeatId, updatedOverHeat);
      }
    }

    newEntriesMap.forEach((entries, heatId) => {
      const updated = entries.map((e, idx) => ({
        ...e,
        lane_number: idx + 1,
      }));
      newEntriesMap.set(heatId, updated);
    });

    setAllHeatEntries(newEntriesMap);
    setActiveId(null);

    try {
      setSavingEdits(true);
      
      const affectedHeatIds = Array.from(newEntriesMap.keys());
      await supabase
        .from("heat_entries")
        .delete()
        .in("heat_id", affectedHeatIds);

      const allEntriesToInsert: any[] = [];
      newEntriesMap.forEach((entries, heatId) => {
        entries.forEach(entry => {
          if (entry.registration_id) {
            allEntriesToInsert.push({
              heat_id: heatId,
              registration_id: entry.registration_id,
              lane_number: entry.lane_number,
            });
          }
        });
      });

      if (allEntriesToInsert.length > 0) {
        await supabase
          .from("heat_entries")
          .insert(allEntriesToInsert);
      }

      toast.success("Baterias atualizadas!");
      await loadHeats();
    } catch (error: any) {
      console.error("Error saving edits:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSavingEdits(false);
    }
  };

  function SortableParticipant({ entry, heatId, laneNumber }: { entry: any; heatId: string; laneNumber: number }) {
    const reg = registrations.find(r => r.id === entry.registration_id);
    const participantName = reg?.team_name || reg?.athlete_name || 'Aguardando';
    const leaderboard = calculateLeaderboard();
    const lbEntry = leaderboard.find(l => l.registrationId === entry.registration_id);
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `heat-${heatId}-entry-${entry.id}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 rounded border ${isDragging ? 'bg-muted' : 'bg-background'} hover:bg-accent/50 transition-colors`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-bold text-sm flex-shrink-0">{laneNumber}</span>
          <span className="text-sm truncate flex-1">{participantName}</span>
          {lbEntry && lbEntry.position && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {lbEntry.position}º
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedChampionship) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Selecione um campeonato primeiro.</p>
          <Button onClick={() => navigate("/app")}>
            Ir para Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const filteredHeats = heats.filter(h => {
    if (selectedCategory && selectedWOD) {
      return h.category_id === selectedCategory && h.wod_id === selectedWOD;
    } else if (selectedCategory) {
      return h.category_id === selectedCategory;
    } else if (selectedWOD) {
      return h.wod_id === selectedWOD;
    }
    return true;
  }).sort((a, b) => a.heat_number - b.heat_number);

  // Filtrar competidores por busca
  const filteredCompetitors = registrations.filter(reg => {
    if (!selectedCategory) return false;
    if (reg.category_id !== selectedCategory) return false;
    
    const name = (reg.team_name || reg.athlete_name || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  // Ordenar competidores
  const sortedCompetitors = orderBy === 'rank' 
    ? (() => {
        const leaderboard = calculateLeaderboard();
        return filteredCompetitors
          .map(reg => ({
            ...reg,
            position: leaderboard.find(l => l.registrationId === reg.id)?.position,
          }))
          .sort((a, b) => (a.position || 999) - (b.position || 999));
      })()
    : filteredCompetitors.sort((a, b) => {
        const nameA = (a.team_name || a.athlete_name || '').toLowerCase();
        const nameB = (b.team_name || b.athlete_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Baterias</h1>
        </div>
        <p className="text-muted-foreground">Organize as baterias e gerencie os horários</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="baterias" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            BATERIAS
          </TabsTrigger>
          <TabsTrigger value="horarios" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            HORÁRIOS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="baterias" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar: Competidores */}
            <Card className="p-4 lg:col-span-1">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Competidores</Label>
                  <p className="text-xs text-muted-foreground mb-3">Categoria e WOD</p>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mb-2">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedWOD} onValueChange={setSelectedWOD}>
                    <SelectTrigger>
                      <SelectValue placeholder="WOD" />
                    </SelectTrigger>
                    <SelectContent>
                      {wods.map(wod => (
                        <SelectItem key={wod.id} value={wod.id}>{wod.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Input
                    placeholder="Procure por nome"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <RadioGroup value={orderBy} onValueChange={(v) => setOrderBy(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="number" id="number" />
                    <Label htmlFor="number" className="text-sm cursor-pointer">Nº</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rank" id="rank" />
                    <Label htmlFor="rank" className="text-sm cursor-pointer">Rank</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <Label className="text-xs text-muted-foreground">Disponíveis</Label>
                  {sortedCompetitors.map((reg, idx) => {
                    const leaderboard = calculateLeaderboard();
                    const lbEntry = leaderboard.find(l => l.registrationId === reg.id);
                    const name = reg.team_name || reg.athlete_name;
                    
                    return (
                      <div key={reg.id} className="flex items-center gap-2 p-2 rounded border bg-background text-sm">
                        <span className="font-bold w-6">{idx + 1}</span>
                        <span className="flex-1 truncate">{name}</span>
                        {lbEntry?.position && (
                          <Badge variant="secondary" className="text-xs">{lbEntry.position}º</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Main: Baterias */}
            <div className="lg:col-span-3 space-y-6">
              {/* Controles */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startTime">Hora de Início *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transitionTime">Transição entre *</Label>
                    <Input
                      id="transitionTime"
                      type="number"
                      min="1"
                      value={transitionTime}
                      onChange={(e) => setTransitionTime(parseInt(e.target.value) || 4)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleGenerateHeats} 
                      className="w-full" 
                      disabled={generating || !selectedCategory || !selectedWOD}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? 'Gerando...' : 'Gerar Baterias'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Baterias */}
              {filteredHeats.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Nenhuma bateria gerada ainda</p>
                  <p className="text-sm text-muted-foreground">
                    Selecione categoria e WOD, depois clique em "Gerar Baterias"
                  </p>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="space-y-4">
                    {filteredHeats.map(heat => {
                      const currentEntries = allHeatEntries.get(heat.id) || [];
                      const maxAthletes = heat.athletes_per_heat || athletesPerHeat;
                      const scheduledTime = heat.scheduled_time 
                        ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : startTime;
                      
                      const wodInfo = wods.find(w => w.id === heat.wod_id);
                      const timeCap = wodInfo?.time_cap || '10min';

                      const allItemIds = currentEntries.map(e => `heat-${heat.id}-entry-${e.id}`);

                      return (
                        <Card key={heat.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="default" className="text-base px-3 py-1">
                                BATERIA {heat.heat_number}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {categories.find(c => c.id === heat.category_id)?.name} - {wodInfo?.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{scheduledTime} - {scheduledTime} | TIMECAP: {timeCap}</span>
                              <Badge variant="outline">
                                Ocupados: {currentEntries.length}/{maxAthletes}
                              </Badge>
                            </div>
                          </div>

                          <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Array.from({ length: maxAthletes }).map((_, idx) => {
                                const entry = currentEntries[idx];
                                if (entry) {
                                  return (
                                    <SortableParticipant
                                      key={entry.id}
                                      entry={entry}
                                      heatId={heat.id}
                                      laneNumber={idx + 1}
                                    />
                                  );
                                }
                                return (
                                  <div
                                    key={`empty-${idx}`}
                                    className="flex items-center gap-2 p-2 rounded border border-dashed bg-muted/20"
                                  >
                                    <span className="font-bold text-sm text-muted-foreground">{idx + 1}</span>
                                    <span className="text-sm text-muted-foreground">Arraste o competidor aqui</span>
                                  </div>
                                );
                              })}
                            </div>
                          </SortableContext>
                        </Card>
                      );
                    })}
                  </div>
                </DndContext>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="globalTransition">Transição (min)</Label>
                <Input
                  id="globalTransition"
                  type="number"
                  min="0"
                  value={transitionTime}
                  onChange={(e) => setTransitionTime(parseInt(e.target.value) || 0)}
                  className="max-w-xs"
                />
              </div>
              <Button onClick={handleApplyTransition} className="mt-6">
                APLICAR
              </Button>
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-24">Bateria</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-24">TimeCap</TableHead>
                  <TableHead className="w-24">Início</TableHead>
                  <TableHead className="w-24">Término</TableHead>
                  <TableHead className="w-24">Transição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHeats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma bateria gerada ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHeats.map(heat => {
                    const wodInfo = wods.find(w => w.id === heat.wod_id);
                    const categoryInfo = categories.find(c => c.id === heat.category_id);
                    const timeCap = wodInfo?.time_cap || '00:10';
                    const scheduledTime = heat.scheduled_time 
                      ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : startTime;
                    
                    return (
                      <TableRow key={heat.id}>
                        <TableCell>
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-bold">{heat.heat_number}</TableCell>
                        <TableCell>
                          {categoryInfo?.name} - {wodInfo?.name}
                        </TableCell>
                        <TableCell>{timeCap}</TableCell>
                        <TableCell>{scheduledTime}</TableCell>
                        <TableCell>{scheduledTime}</TableCell>
                        <TableCell>{transitionTime}min</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

