import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Clock, Loader2, GripVertical, Calendar, Plus, Minus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [expandedHeats, setExpandedHeats] = useState<Set<string>>(new Set());
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [heatCapacities, setHeatCapacities] = useState<Map<string, number>>(new Map());
  const [selectedHeats, setSelectedHeats] = useState<Set<string>>(new Set());
  
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
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    if (categories.length === 0 || wods.length === 0) {
      toast.error("É necessário ter categorias e WODs cadastrados");
      return;
    }

    setGenerating(true);
    try {
      let totalHeatsGenerated = 0;

      // Deletar TODAS as baterias existentes do campeonato
      const { data: existingHeats } = await supabase
        .from("heats")
        .select("id")
        .eq("championship_id", selectedChampionship.id);

      if (existingHeats && existingHeats.length > 0) {
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

      // Iterar sobre TODAS as categorias
      for (const category of categories) {
        const categoryRegs = registrations.filter(r => r.category_id === category.id);
        
        if (categoryRegs.length === 0) {
          console.log(`Categoria ${category.name} sem inscrições, pulando...`);
          continue;
        }

        // Ordenar por ordem de inscrição
        // IMPORTANTE: Quem se inscreveu PRIMEIRO fica nas ÚLTIMAS baterias (vantagem estratégica)
        const orderedParticipants = categoryRegs
          .sort((a, b) => {
            // Mais recente primeiro, mais antigo por último
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
          .map(reg => ({ registrationId: reg.id }));

        // Iterar sobre TODOS os WODs
        for (const wod of wods) {
          const athletesPerHeatValue = category.athletes_per_heat || athletesPerHeat;
          const totalHeats = Math.ceil(orderedParticipants.length / athletesPerHeatValue);

          // Criar baterias para esta combinação categoria + WOD
          for (let i = 0; i < totalHeats; i++) {
            const startIndex = i * athletesPerHeatValue;
            const endIndex = Math.min(startIndex + athletesPerHeatValue, orderedParticipants.length);
            const heatParticipants = orderedParticipants.slice(startIndex, endIndex);

            const { data: newHeat, error: heatError } = await supabase
              .from("heats")
              .insert({
                championship_id: selectedChampionship.id,
                category_id: category.id,
                wod_id: wod.id,
                heat_number: totalHeatsGenerated + i + 1,
                athletes_per_heat: athletesPerHeatValue,
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

            totalHeatsGenerated++;
          }
        }
      }

      toast.success(`${totalHeatsGenerated} baterias geradas para todas as categorias e WODs!`);
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

  const toggleHeatExpand = (heatId: string) => {
    setExpandedHeats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(heatId)) {
        newSet.delete(heatId);
      } else {
        newSet.add(heatId);
      }
      return newSet;
    });
  };

  const handleAddHeat = async () => {
    if (!selectedChampionship || !selectedCategory || !selectedWOD) {
      toast.error("Selecione categoria e WOD primeiro");
      return;
    }

    try {
      const maxHeatNumber = Math.max(...filteredHeats.map(h => h.heat_number), 0);
      
      const { data: newHeat, error } = await supabase
        .from("heats")
        .insert({
          championship_id: selectedChampionship.id,
          category_id: selectedCategory,
          wod_id: selectedWOD,
          heat_number: maxHeatNumber + 1,
          athletes_per_heat: athletesPerHeat,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Bateria adicionada!");
      await loadHeats();
    } catch (error: any) {
      console.error("Error adding heat:", error);
      toast.error("Erro ao adicionar bateria");
    }
  };

  const handleRemoveHeat = async (heatId: string) => {
    try {
      // Remover entries primeiro
      await supabase
        .from("heat_entries")
        .delete()
        .eq("heat_id", heatId);

      // Remover bateria
      await supabase
        .from("heats")
        .delete()
        .eq("id", heatId);

      toast.success("Bateria removida!");
      await loadHeats();
    } catch (error: any) {
      console.error("Error removing heat:", error);
      toast.error("Erro ao remover bateria");
    }
  };

  const toggleHeatSelection = (heatId: string) => {
    setSelectedHeats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(heatId)) {
        newSet.delete(heatId);
      } else {
        newSet.add(heatId);
      }
      return newSet;
    });
  };

  const handleSelectAllHeats = () => {
    if (selectedHeats.size === filteredHeats.length) {
      setSelectedHeats(new Set());
    } else {
      setSelectedHeats(new Set(filteredHeats.map(h => h.id)));
    }
  };

  const handleRemoveSelectedHeats = async () => {
    if (selectedHeats.size === 0) {
      toast.error("Selecione pelo menos uma bateria");
      return;
    }

    try {
      const heatsToRemove = Array.from(selectedHeats);

      // Remover entries primeiro
      await supabase
        .from("heat_entries")
        .delete()
        .in("heat_id", heatsToRemove);

      // Remover baterias
      await supabase
        .from("heats")
        .delete()
        .in("id", heatsToRemove);

      toast.success(`${heatsToRemove.length} bateria(s) removida(s)!`);
      setSelectedHeats(new Set());
      await loadHeats();
    } catch (error: any) {
      console.error("Error removing heats:", error);
      toast.error("Erro ao remover baterias");
    }
  };

  const handleUpdateHeatCapacity = async (heatId: string, newCapacity: number) => {
    try {
      await supabase
        .from("heats")
        .update({ athletes_per_heat: newCapacity })
        .eq("id", heatId);

      setHeatCapacities(prev => {
        const newMap = new Map(prev);
        newMap.set(heatId, newCapacity);
        return newMap;
      });

      toast.success("Capacidade atualizada!");
      await loadHeats();
    } catch (error: any) {
      console.error("Error updating capacity:", error);
      toast.error("Erro ao atualizar capacidade");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Verificar se é um atleta da sidebar sendo arrastado
    const isSidebarAthlete = activeId.startsWith('sidebar-athlete-');
    const activeMatch = activeId.match(/^heat-(.+?)-entry-(.+)$/);
    const overMatch = overId.match(/^heat-(.+?)-entry-(.+)$/);
    const overHeatMatch = overId.match(/^heat-dropzone-(.+)$/);

    if (isSidebarAthlete) {
      // Atleta da sidebar sendo arrastado para uma bateria
      const registrationId = activeId.replace('sidebar-athlete-', '');
      let targetHeatId: string | null = null;

      if (overMatch) {
        targetHeatId = overMatch[1];
      } else if (overHeatMatch) {
        targetHeatId = overHeatMatch[1];
      }

      if (!targetHeatId) {
        setActiveId(null);
        return;
      }

      try {
        setSavingEdits(true);

        const currentEntries = allHeatEntries.get(targetHeatId) || [];
        const maxLaneNumber = currentEntries.length > 0 
          ? Math.max(...currentEntries.map(e => e.lane_number || 0))
          : 0;

        await supabase
          .from("heat_entries")
          .insert({
            heat_id: targetHeatId,
            registration_id: registrationId,
            lane_number: maxLaneNumber + 1,
          });

        toast.success("Atleta adicionado à bateria!");
        await loadHeats();
      } catch (error: any) {
        console.error("Error adding athlete:", error);
        toast.error("Erro ao adicionar atleta");
      } finally {
        setSavingEdits(false);
        setActiveId(null);
      }
      return;
    }

    // Lógica existente para mover atletas entre baterias
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
    } else if (overHeatMatch) {
      // Arrastando para área vazia da bateria
      const overHeatId = overHeatMatch[1];
      const activeHeatEntries = newEntriesMap.get(activeHeatId) || [];
      const overHeatEntries = newEntriesMap.get(overHeatId) || [];

      const updatedActiveHeat = activeHeatEntries.filter(e => e.id !== activeEntryId);
      newEntriesMap.set(activeHeatId, updatedActiveHeat);

      const updatedOverHeat = [...overHeatEntries, { ...activeEntry, heat_id: overHeatId }];
      newEntriesMap.set(overHeatId, updatedOverHeat);
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

  function SidebarAthlete({ reg, index }: { reg: any; index: number }) {
    const leaderboard = calculateLeaderboard();
    const lbEntry = leaderboard.find(l => l.registrationId === reg.id);
    const name = reg.team_name || reg.athlete_name;

    // Verificar se o atleta já está em alguma bateria
    const isInHeat = Array.from(allHeatEntries.values()).some(entries => 
      entries.some(e => e.registration_id === reg.id)
    );
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `sidebar-athlete-${reg.id}`,
      disabled: isInHeat,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : (isInHeat ? 0.4 : 1),
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 rounded border text-sm ${
          isInHeat 
            ? 'bg-muted text-muted-foreground cursor-not-allowed' 
            : 'bg-background cursor-grab active:cursor-grabbing hover:bg-accent/50'
        } transition-colors`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3 flex-shrink-0" />
        <span className="font-bold w-6">{index + 1}</span>
        <span className="flex-1 truncate">{name}</span>
        {lbEntry?.position && (
          <Badge variant="secondary" className="text-xs">{lbEntry.position}º</Badge>
        )}
      </div>
    );
  }

  function HeatDropZone({ heatId, children }: { heatId: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
      id: `heat-dropzone-${heatId}`,
    });

    return (
      <div
        ref={setNodeRef}
        className={`transition-colors ${isOver ? 'bg-primary/10 rounded-lg' : ''}`}
      >
        {children}
      </div>
    );
  }

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

                <SortableContext 
                  items={sortedCompetitors.map(r => `sidebar-athlete-${r.id}`)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <Label className="text-xs text-muted-foreground">Disponíveis (arraste para as baterias)</Label>
                    {sortedCompetitors.map((reg, idx) => (
                      <SidebarAthlete key={reg.id} reg={reg} index={idx} />
                    ))}
                  </div>
                </SortableContext>
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
                    <Label htmlFor="athletesPerHeat">Raias *</Label>
                    <Input
                      id="athletesPerHeat"
                      type="number"
                      min="1"
                      max="20"
                      value={athletesPerHeat}
                      onChange={(e) => setAthletesPerHeat(parseInt(e.target.value) || 4)}
                      placeholder="Quantidade de raias por bateria"
                    />
                  </div>
                  <div>
                    <Label htmlFor="generateBtn" className="text-xs text-muted-foreground mb-1 block">
                      Gera todas as baterias de todas as categorias
                    </Label>
                    <Button 
                      id="generateBtn"
                      onClick={handleGenerateHeats} 
                      className="w-full" 
                      disabled={generating}
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
                    {/* Controles de gerenciamento de baterias */}
                    <Card className="p-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="select-all-heats"
                            checked={filteredHeats.length > 0 && selectedHeats.size === filteredHeats.length}
                            onChange={handleSelectAllHeats}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          />
                          <Label htmlFor="select-all-heats" className="text-sm cursor-pointer">
                            Selecionar Todas
                          </Label>
                        </div>
                        
                        {selectedHeats.size > 0 && (
                          <Badge variant="secondary">
                            {selectedHeats.size} selecionada(s)
                          </Badge>
                        )}

                        <div className="flex gap-2 ml-auto">
                          <Button 
                            onClick={handleRemoveSelectedHeats}
                            variant="destructive"
                            size="sm"
                            disabled={selectedHeats.size === 0}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir Selecionadas
                          </Button>
                          
                          <Button 
                            onClick={handleAddHeat} 
                            variant="outline" 
                            size="sm"
                            disabled={!selectedCategory || !selectedWOD}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Bateria
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {filteredHeats.map(heat => {
                      const currentEntries = allHeatEntries.get(heat.id) || [];
                      const maxAthletes = heatCapacities.get(heat.id) || heat.athletes_per_heat || athletesPerHeat;
                      const scheduledTime = heat.scheduled_time 
                        ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : startTime;
                      
                      const wodInfo = wods.find(w => w.id === heat.wod_id);
                      const timeCap = wodInfo?.time_cap || '10min';
                      const allItemIds = currentEntries.map(e => `heat-${heat.id}-entry-${e.id}`);
                      const isExpanded = expandedHeats.has(heat.id);

                      return (
                        <Card key={heat.id} className="p-4">
                          <Collapsible open={isExpanded} onOpenChange={() => toggleHeatExpand(heat.id)}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedHeats.has(heat.id)}
                                  onChange={() => toggleHeatSelection(heat.id)}
                                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="p-1">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <Badge variant="default" className="text-base px-3 py-1">
                                  BATERIA {heat.heat_number}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {categories.find(c => c.id === heat.category_id)?.name} - {wodInfo?.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {scheduledTime} | TC: {timeCap}
                                </span>
                                {editingCapacity === heat.id ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min="1"
                                      max="20"
                                      value={maxAthletes}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 1;
                                        setHeatCapacities(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(heat.id, newValue);
                                          return newMap;
                                        });
                                      }}
                                      onBlur={() => {
                                        handleUpdateHeatCapacity(heat.id, maxAthletes);
                                        setEditingCapacity(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateHeatCapacity(heat.id, maxAthletes);
                                          setEditingCapacity(null);
                                        }
                                      }}
                                      className="w-16 h-8 text-sm"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => setEditingCapacity(heat.id)}
                                  >
                                    Ocupados: {currentEntries.length}/{maxAthletes}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveHeat(heat.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <CollapsibleContent>
                              <HeatDropZone heatId={heat.id}>
                                <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
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
                                          className="flex items-center gap-2 p-2 rounded border border-dashed bg-muted/20 hover:bg-accent/20 transition-colors"
                                        >
                                          <span className="font-bold text-sm text-muted-foreground">{idx + 1}</span>
                                          <span className="text-sm text-muted-foreground">Arraste aqui</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </SortableContext>
                              </HeatDropZone>
                            </CollapsibleContent>
                          </Collapsible>
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

