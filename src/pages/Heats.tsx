import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Download, Clock, Loader2, Edit2, X, Plus, ArrowUp, ArrowDown, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
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

export default function Heats() {
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
  const [athletesPerHeat, setAthletesPerHeat] = useState<number>(10);
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  const [allHeatEntries, setAllHeatEntries] = useState<Map<string, any[]>>(new Map());
  const [savingEdits, setSavingEdits] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingHeatsOrder, setEditingHeatsOrder] = useState<any[]>([]);
  
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
    if (selectedCategory && selectedWOD) {
      loadHeats();
    }
  }, [selectedCategory, selectedWOD]);

  // Carregar athletes_per_heat da categoria quando ela for selecionada
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const category = categories.find(c => c.id === selectedCategory);
      if (category && category.athletes_per_heat) {
        setAthletesPerHeat(category.athletes_per_heat);
      }
    }
  }, [selectedCategory, categories]);

  // Inicializar entries quando heats são carregados
  useEffect(() => {
    const filteredHeats = selectedCategory && selectedWOD
      ? heats.filter(h => h.category_id === selectedCategory && h.wod_id === selectedWOD)
          .sort((a, b) => a.heat_number - b.heat_number)
      : [];
      
    if (filteredHeats.length > 0 && heatEntries.length > 0) {
      const entriesMap = new Map<string, any[]>();
      filteredHeats.forEach(heat => {
        const entries = heatEntries
          .filter(e => e.heat_id === heat.id)
          .sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0));
        entriesMap.set(heat.id, entries);
      });
      setAllHeatEntries(entriesMap);
    }
    
    // Inicializar ordem das baterias
    if (filteredHeats.length > 0) {
      setEditingHeatsOrder([...filteredHeats]);
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
    if (!selectedCategory || !selectedWOD) return;

    try {
      const { data: heatsData, error: heatsError } = await supabase
        .from("heats")
        .select("*")
        .eq("category_id", selectedCategory)
        .eq("wod_id", selectedWOD)
        .order("heat_number");

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
      }
    } catch (error: any) {
      console.error("Error loading heats:", error);
    }
  };

  const calculateLeaderboard = () => {
    if (!selectedCategory) return [];

    // Agrupar resultados por registration_id
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

    // Ordenar por pontos (mais pontos primeiro)
    const sorted = Array.from(participantMap.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return 0;
      })
      .map((p, index) => ({
        ...p,
        position: index + 1,
      }));

    return sorted;
  };

  const handleGenerateHeats = async () => {
    if (!selectedChampionship || !selectedCategory || !selectedWOD) {
      toast.error("Selecione categoria e WOD");
      return;
    }

    setGenerating(true);
    try {
      // Buscar registrações da categoria
      const categoryRegs = registrations.filter(r => r.category_id === selectedCategory);
      
      if (categoryRegs.length === 0) {
        toast.error("Nenhuma inscrição nesta categoria");
        setGenerating(false);
        return;
      }
    
    // Calcular leaderboard atual
      const leaderboard = calculateLeaderboard();
      const hasResults = leaderboard.length > 0 && leaderboard.some(l => l.totalPoints > 0);

      // Ordenar participantes
      let orderedParticipants: any[];
      
      if (!hasResults) {
        // Primeira prova: ordem de inscrição (created_at) - mais antigas por último
        // Isso garante que quem se inscreveu primeiro fica nas ÚLTIMAS baterias
        // (vantagem estratégica: pode ver os resultados dos outros antes de competir)
        orderedParticipants = categoryRegs
          .sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return timeB - timeA; // Ordem decrescente: mais antigas por último
          })
          .map(reg => ({
            registrationId: reg.id,
            name: reg.team_name || reg.athlete_name,
            totalPoints: 0,
            position: undefined,
          }));
    } else {
        // Próximas provas: ordenar por pontos (menos pontos primeiro, mais pontos por último)
        // Quem tem mais pontos fica na última bateria
        const leaderboardMap = new Map(leaderboard.map(l => [l.registrationId, l]));
        
        orderedParticipants = categoryRegs.map(reg => {
          const lbEntry = leaderboardMap.get(reg.id);
          return {
            registrationId: reg.id,
            name: reg.team_name || reg.athlete_name,
            totalPoints: lbEntry?.totalPoints || 0,
            position: lbEntry?.position,
          };
        }).sort((a, b) => {
          // Ordenar por pontos (menos pontos primeiro, mais pontos por último)
          // Isso faz com que os líderes fiquem na última bateria
          if (a.totalPoints !== b.totalPoints) {
            return a.totalPoints - b.totalPoints;
          }
          // Se empate, manter ordem de inscrição
          return 0;
        });
      }

      // Calcular número de baterias
      const totalHeats = Math.ceil(orderedParticipants.length / athletesPerHeat);

      // Deletar baterias existentes
      const existingHeats = heats.filter(
        h => h.category_id === selectedCategory && h.wod_id === selectedWOD
      );

      if (existingHeats.length > 0) {
        const heatIds = existingHeats.map(h => h.id);
        
        // Deletar entries primeiro
        await supabase
          .from("heat_entries")
          .delete()
          .in("heat_id", heatIds);

        // Deletar heats
        await supabase
          .from("heats")
          .delete()
          .in("id", heatIds);
      }

      // Criar novas baterias
      const newHeats: any[] = [];
      
      for (let i = 0; i < totalHeats; i++) {
        const startIndex = i * athletesPerHeat;
        const endIndex = Math.min(startIndex + athletesPerHeat, orderedParticipants.length);
        const heatParticipants = orderedParticipants.slice(startIndex, endIndex);

        // Criar heat
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

        // Criar entries para cada participante
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

        newHeats.push(newHeat);
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

  const handleTimeUpdate = async (heatId: string, time: string) => {
    try {
      const timeValue = time ? new Date(`2000-01-01T${time}`).toISOString() : null;
      
      const { error } = await supabase
        .from("heats")
        .update({ scheduled_time: timeValue })
        .eq("id", heatId);

      if (error) throw error;
      
      await loadHeats();
    } catch (error: any) {
      console.error("Error updating time:", error);
      toast.error("Erro ao atualizar horário");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleHeatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = editingHeatsOrder.findIndex(h => h.id === active.id);
    const newIndex = editingHeatsOrder.findIndex(h => h.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedHeats = arrayMove(editingHeatsOrder, oldIndex, newIndex);
      // Atualizar heat_number baseado na nova ordem
      const updatedHeats = reorderedHeats.map((heat, index) => ({
        ...heat,
        heat_number: index + 1,
      }));
      setEditingHeatsOrder(updatedHeats);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Formato: "heat-{heatId}-entry-{entryId}"
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
      // Movendo para outra posição (mesma bateria ou diferente)
      const [, overHeatId, overEntryId] = overMatch;
      const overHeatEntries = newEntriesMap.get(overHeatId) || [];
      const activeHeatEntries = newEntriesMap.get(activeHeatId) || [];

      // Remover da bateria original
      const updatedActiveHeat = activeHeatEntries.filter(e => e.id !== activeEntryId);
      newEntriesMap.set(activeHeatId, updatedActiveHeat);

      // Encontrar índice de destino
      const overIndex = overHeatEntries.findIndex(e => e.id === overEntryId);
      
      // Inserir na nova posição
      if (activeHeatId === overHeatId) {
        // Mesma bateria - reordenar
        const activeIndex = activeHeatEntries.findIndex(e => e.id === activeEntryId);
        const newEntries = arrayMove(activeHeatEntries, activeIndex, overIndex);
        newEntriesMap.set(activeHeatId, newEntries);
      } else {
        // Bateria diferente - mover
        const updatedOverHeat = [...overHeatEntries];
        updatedOverHeat.splice(overIndex, 0, { ...activeEntry, heat_id: overHeatId });
        newEntriesMap.set(overHeatId, updatedOverHeat);
      }
    } else if (overId.startsWith('heat-drop-')) {
      // Movendo para uma bateria vazia (drop zone)
      const overHeatId = overId.replace('heat-drop-', '');
      const overHeatEntries = newEntriesMap.get(overHeatId) || [];
      const activeHeatEntries = newEntriesMap.get(activeHeatId) || [];

      // Remover da bateria original
      const updatedActiveHeat = activeHeatEntries.filter(e => e.id !== activeEntryId);
      newEntriesMap.set(activeHeatId, updatedActiveHeat);

      // Adicionar ao final da bateria de destino
      const updatedOverHeat = [...overHeatEntries, { ...activeEntry, heat_id: overHeatId }];
      newEntriesMap.set(overHeatId, updatedOverHeat);
    } else {
      setActiveId(null);
      return;
    }

    // Atualizar lane_numbers de todas as baterias afetadas
    newEntriesMap.forEach((entries, heatId) => {
      const updated = entries.map((e, idx) => ({
        ...e,
        lane_number: idx + 1,
      }));
      newEntriesMap.set(heatId, updated);
    });

    setAllHeatEntries(newEntriesMap);
    setActiveId(null);
  };

  const handleSaveAllEdits = async () => {
    const filteredHeats = selectedCategory && selectedWOD
      ? heats.filter(h => h.category_id === selectedCategory && h.wod_id === selectedWOD)
          .sort((a, b) => a.heat_number - b.heat_number)
      : [];

    if (filteredHeats.length === 0) return;

    setSavingEdits(true);
    try {
      // Atualizar ordem das baterias (heat_number)
      const heatUpdatePromises = editingHeatsOrder.map(heat => 
        supabase
          .from("heats")
          .update({ heat_number: heat.heat_number })
          .eq("id", heat.id)
      );
      
      await Promise.all(heatUpdatePromises);

      // Deletar todas as entries das baterias filtradas
      const heatIds = filteredHeats.map(h => h.id);
      
      const { error: deleteError } = await supabase
        .from("heat_entries")
        .delete()
        .in("heat_id", heatIds);

      if (deleteError) throw deleteError;

      // Inserir todas as entries atualizadas
      const allEntriesToInsert: any[] = [];
      
      allHeatEntries.forEach((entries, heatId) => {
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
        const { error: insertError } = await supabase
          .from("heat_entries")
          .insert(allEntriesToInsert);

        if (insertError) throw insertError;
      }

      toast.success("Todas as baterias foram atualizadas com sucesso!");
      setIsGlobalEditMode(false);
      await loadHeats();
    } catch (error: any) {
      console.error("Error saving edits:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSavingEdits(false);
    }
  };

  const handleCancelEdit = () => {
    // Recarregar entries originais
    const filteredHeats = selectedCategory && selectedWOD
      ? heats.filter(h => h.category_id === selectedCategory && h.wod_id === selectedWOD)
          .sort((a, b) => a.heat_number - b.heat_number)
      : [];
    
    const entriesMap = new Map<string, any[]>();
    filteredHeats.forEach(heat => {
      const entries = heatEntries
        .filter(e => e.heat_id === heat.id)
        .sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0));
      entriesMap.set(heat.id, entries);
    });
    setAllHeatEntries(entriesMap);
    setEditingHeatsOrder([...filteredHeats]);
    setIsGlobalEditMode(false);
    setActiveId(null);
  };

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

  const filteredHeats = selectedCategory && selectedWOD
    ? heats.filter(h => h.category_id === selectedCategory && h.wod_id === selectedWOD)
        .sort((a, b) => a.heat_number - b.heat_number)
    : [];

  // Componente Sortable para bateria
  function SortableHeat({ heat, isEditing, children }: { heat: any; isEditing: boolean; children: any }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: heat.id,
      disabled: !isEditing,
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
        className={isDragging ? 'opacity-50 z-50' : ''}
      >
        {isEditing && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded">
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Arraste para reordenar as baterias</span>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Componente Droppable para bateria
  function HeatDropZone({ heatId, isEmpty, isEditing, children }: { heatId: string; isEmpty: boolean; isEditing: boolean; children: any }) {
    const { setNodeRef, isOver } = useDroppable({
      id: `heat-drop-${heatId}`,
      disabled: !isEditing,
    });

    return (
      <div
        ref={setNodeRef}
        className={isOver && isEmpty ? 'bg-primary/10 rounded-lg p-2' : ''}
      >
        {children}
      </div>
    );
  }

  // Componente Sortable para participante
  function SortableParticipant({ entry, heatId, isEditing }: { entry: any; heatId: string; isEditing: boolean }) {
    const reg = registrations.find(r => r.id === entry.registration_id);
    const lbEntry = calculateLeaderboard().find(l => l.registrationId === entry.registration_id);
    const participantName = reg?.team_name || reg?.athlete_name || 'Desconhecido';
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `heat-${heatId}-entry-${entry.id}`,
      disabled: !isEditing,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    if (!isEditing) {
      return (
        <TableRow>
          <TableCell className="font-semibold">{entry.lane_number}</TableCell>
          <TableCell className="font-semibold">{participantName}</TableCell>
          <TableCell>
            {lbEntry?.position ? (
              <span className="text-sm font-semibold">{lbEntry.position}º</span>
            ) : (
              <span className="text-xs text-muted-foreground">Sem ranking</span>
            )}
          </TableCell>
          <TableCell>
            {lbEntry?.totalPoints && lbEntry.totalPoints > 0 ? (
              <span className="font-bold text-primary">{lbEntry.totalPoints} pts</span>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        className={isDragging ? 'bg-muted' : ''}
      >
        <TableCell className="font-semibold">
          <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            {entry.lane_number}
          </div>
        </TableCell>
        <TableCell className="font-semibold">{participantName}</TableCell>
        <TableCell>
          {lbEntry?.position ? (
            <span className="text-sm font-semibold">{lbEntry.position}º</span>
          ) : (
            <span className="text-xs text-muted-foreground">Sem ranking</span>
          )}
        </TableCell>
        <TableCell>
          {lbEntry?.totalPoints && lbEntry.totalPoints > 0 ? (
            <span className="font-bold text-primary">{lbEntry.totalPoints} pts</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Organização de Baterias</h1>
        </div>
        <p className="text-muted-foreground">Geração automática com semeadura baseada no ranking</p>
      </div>

      <Card className="p-6 shadow-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="wod">WOD</Label>
            <Select value={selectedWOD} onValueChange={setSelectedWOD}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {wods.map(wod => (
                  <SelectItem key={wod.id} value={wod.id}>{wod.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="athletesPerHeat">Atletas/Times por Bateria</Label>
            <Input
              id="athletesPerHeat"
              type="number"
              value={athletesPerHeat}
              onChange={async (e) => {
                const newValue = parseInt(e.target.value) || 10;
                setAthletesPerHeat(newValue);
                // Salvar automaticamente na categoria
                if (selectedCategory) {
                  try {
                    await supabase
                      .from("categories")
                      .update({ athletes_per_heat: newValue })
                      .eq("id", selectedCategory);
                  } catch (error) {
                    console.error("Erro ao salvar athletes_per_heat:", error);
                  }
                }
              }}
              min={1}
              max={30}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este valor é salvo automaticamente na categoria. O sistema calculará quantas baterias serão necessárias.
            </p>
          </div>

          <div className="flex items-end gap-2">
            {filteredHeats.length > 0 && (
              <Button 
                onClick={() => setIsGlobalEditMode(!isGlobalEditMode)}
                variant={isGlobalEditMode ? "default" : "outline"}
                className="flex-1"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isGlobalEditMode ? 'Sair da Edição' : 'Editar Baterias'}
              </Button>
            )}
            <Button 
              onClick={handleGenerateHeats} 
              className="flex-1 shadow-glow" 
              disabled={generating || isGlobalEditMode}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Gerando...' : 'Gerar Baterias'}
            </Button>
          </div>
        </div>
        {isGlobalEditMode && filteredHeats.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button 
              onClick={handleSaveAllEdits}
              disabled={savingEdits}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingEdits ? 'Salvando...' : 'Salvar Todas as Alterações'}
            </Button>
            <Button
              onClick={handleCancelEdit}
              variant="outline"
              className="flex-1"
              disabled={savingEdits}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        )}
      </Card>

      {filteredHeats.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={(event) => {
            // Verificar se é drag de bateria ou de participante
            const activeId = event.active.id as string;
            // Se o ID contém '-entry-', é um participante, senão é uma bateria
            if (typeof activeId === 'string' && activeId.includes('-entry-')) {
              handleDragEnd(event);
            } else {
              handleHeatDragEnd(event);
            }
          }}
        >
          {isGlobalEditMode ? (
            <SortableContext 
              items={editingHeatsOrder.map(h => h.id)} 
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {editingHeatsOrder.map(heat => {
                  const currentEntries = allHeatEntries.get(heat.id) || [];
                  const scheduledTime = heat.scheduled_time 
                    ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : '';
                  const allItemIds = currentEntries.map(e => `heat-${heat.id}-entry-${e.id}`);
                  
                  return (
                    <SortableHeat key={heat.id} heat={heat} isEditing={isGlobalEditMode}>
                      <Card className="p-6 shadow-card animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="default" className="text-lg px-4 py-2">
                              Bateria {heat.heat_number}
                            </Badge>
                            <span className="text-muted-foreground">
                              {currentEntries.length} atletas/times
                            </span>
                            {scheduledTime && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{scheduledTime}</span>
                              </div>
                            )}
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Arraste participantes para reorganizar
                            </Badge>
                          </div>
                        </div>

                        <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                          <HeatDropZone heatId={heat.id} isEmpty={currentEntries.length === 0} isEditing={isGlobalEditMode}>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Raia</TableHead>
                                  <TableHead>Atleta/Time</TableHead>
                                  <TableHead>Posição Atual</TableHead>
                                  <TableHead>Pontos Totais</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {currentEntries.length === 0 ? (
                                  <TableRow>
                                    <TableCell 
                                      colSpan={4} 
                                      className="text-center text-muted-foreground py-8"
                                    >
                                      Arraste participantes aqui
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  currentEntries.map(entry => (
                                    <SortableParticipant
                                      key={entry.id}
                                      entry={entry}
                                      heatId={heat.id}
                                      isEditing={isGlobalEditMode}
                                    />
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </HeatDropZone>
                        </SortableContext>
                      </Card>
                    </SortableHeat>
                  );
                })}
              </div>
            </SortableContext>
          ) : (
        <div className="space-y-4">
              {filteredHeats.map(heat => {
                const currentEntries = heatEntries.filter(e => e.heat_id === heat.id).sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0));
                const scheduledTime = heat.scheduled_time 
                  ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  : '';

                return (
            <Card key={heat.id} className="p-6 shadow-card animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-lg px-4 py-2">
                          Bateria {heat.heat_number}
                  </Badge>
                  <span className="text-muted-foreground">
                          {currentEntries.length} atletas/times
                  </span>
                </div>
                
                {scheduledTime && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{scheduledTime}</span>
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                          <TableHead>Raia</TableHead>
                    <TableHead>Atleta/Time</TableHead>
                    <TableHead>Posição Atual</TableHead>
                    <TableHead>Pontos Totais</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                        {currentEntries.length === 0 ? (
                          <TableRow>
                            <TableCell 
                              colSpan={4} 
                              className="text-center text-muted-foreground py-8"
                            >
                              Nenhum participante
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentEntries.map(entry => {
                            const reg = registrations.find(r => r.id === entry.registration_id);
                            const lbEntry = calculateLeaderboard().find(l => l.registrationId === entry.registration_id);
                            const participantName = reg?.team_name || reg?.athlete_name || 'Desconhecido';
                            
                            return (
                              <TableRow key={entry.id}>
                                <TableCell className="font-semibold">{entry.lane_number}</TableCell>
                                <TableCell className="font-semibold">{participantName}</TableCell>
                      <TableCell>
                                  {lbEntry?.position ? (
                                    <span className="text-sm font-semibold">{lbEntry.position}º</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem ranking</span>
                        )}
                      </TableCell>
                      <TableCell>
                                  {lbEntry?.totalPoints && lbEntry.totalPoints > 0 ? (
                                    <span className="font-bold text-primary">{lbEntry.totalPoints} pts</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                            );
                          })
                        )}
                </TableBody>
              </Table>
            </Card>
                );
              })}
        </div>
          )}
        </DndContext>
      )}

      {selectedCategory && selectedWOD && filteredHeats.length === 0 && (
        <Card className="p-12 text-center shadow-card">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Nenhuma bateria gerada para este WOD ainda.
          </p>
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar Baterias" para organizar automaticamente.
          </p>
        </Card>
      )}

      <Card className="mt-8 p-6 shadow-card bg-primary/5">
        <h3 className="font-bold mb-3">Sobre a Semeadura Automática</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong>Primeiro WOD:</strong> Distribuição por ordem de inscrição (quem se inscreveu primeiro fica nas últimas baterias - vantagem estratégica)</li>
          <li>• <strong>WODs seguintes:</strong> Ordenação por pontuação acumulada</li>
          <li>• <strong>Líderes na última bateria:</strong> Atletas com mais pontos competem por último (vantagem estratégica)</li>
          <li>• <strong>Edição Manual:</strong> Clique em "Editar Baterias" para ativar o modo de edição. Arraste e solte participantes entre baterias ou dentro da mesma bateria para reorganizar</li>
        </ul>
      </Card>
    </div>
  );
}
