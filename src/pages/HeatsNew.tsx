import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScheduleSettings } from '@/components/scheduling/ScheduleSettings';
import { Users, RefreshCw, Clock, Loader2, GripVertical, Calendar, Plus, Minus, ChevronDown, ChevronUp, Trash2, Edit, Settings, FileDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
  rectSortingStrategy,
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
  const [allChampionshipEntries, setAllChampionshipEntries] = useState<any[]>([]); // Todas as entries do campeonato (para verificar disponibilidade)

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWOD, setSelectedWOD] = useState<string>('');
  const [athletesPerHeat, setAthletesPerHeat] = useState<number | ''>('');

  const [transitionTime, setTransitionTime] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allHeatEntries, setAllHeatEntries] = useState<Map<string, any[]>>(new Map());
  const [heatWodMap, setHeatWodMap] = useState<Map<string, string>>(new Map());
  const [savingEdits, setSavingEdits] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'baterias' | 'horarios'>('baterias');
  const [expandedHeats, setExpandedHeats] = useState<Set<string>>(new Set());
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [heatCapacities, setHeatCapacities] = useState<Map<string, number>>(new Map());
  const [selectedHeats, setSelectedHeats] = useState<Set<string>>(new Set());
  const [editingHeat, setEditingHeat] = useState<any | null>(null);
  const [isCreatingHeat, setIsCreatingHeat] = useState(false);
  const [editHeatData, setEditHeatData] = useState({
    custom_name: '',
    category_id: '',
    wod_id: '',
    athletes_per_heat: athletesPerHeat || 0,
    scheduled_time: '',
    end_time: '',
    time_cap: '',
    heat_number: 0,
  });
  const [championshipDays, setChampionshipDays] = useState<any[]>([]);
  const [wodIntervalMinutes, setWodIntervalMinutes] = useState<number>(0);
  const [categoryIntervalMinutes, setCategoryIntervalMinutes] = useState<number>(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedDayForExport, setSelectedDayForExport] = useState<string>('all');
  const [wodVariations, setWodVariations] = useState<Map<string, any>>(new Map()); // Map de variações por wod_id-category_id
  const [transitionTimeStr, setTransitionTimeStr] = useState<string>('00:00');
  const [categoryIntervalStr, setCategoryIntervalStr] = useState<string>('00:00');
  const [wodIntervalStr, setWodIntervalStr] = useState<string>('00:00');
  const [appliedTransition, setAppliedTransition] = useState(false);
  const [appliedCategoryInterval, setAppliedCategoryInterval] = useState(false);
  const [appliedWodInterval, setAppliedWodInterval] = useState(false);

  // Category validation dialog state
  const [categoryMismatchDialog, setCategoryMismatchDialog] = useState<{
    show: boolean;
    athleteCategoryName: string;
    heatCategoryName: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Optimistic locking conflict dialog state
  const [conflictDialog, setConflictDialog] = useState<{
    show: boolean;
    onReload: () => void;
  } | null>(null);

  // Helper functions for time conversion
  const minutesToString = (minutes: number) => {
    if (isNaN(minutes)) return "00:00";
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stringToMinutes = (str: string) => {
    if (!str) return 0;
    if (!str.includes(':')) return parseInt(str) || 0;
    const [mins, secs] = str.split(':').map(Number);
    return (mins || 0) + ((secs || 0) / 60);
  };

  const handleTimeInputChange = (value: string, setter: (v: string) => void, appliedSetter: (v: boolean) => void, successSetter?: (v: boolean) => void) => {
    // Remove caracteres não numéricos exceto :
    let clean = value.replace(/[^\d:]/g, '');

    // Auto-format MM:SS
    if (clean.length === 2 && !clean.includes(':')) {
      clean += ':';
    }

    // Limitar tamanho
    if (clean.length > 5) return;

    setter(clean);
    appliedSetter(false); // Reset applied status on change
    if (successSetter) successSetter(false); // Reset success status on change
  };

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
    const filtered = heats.filter(h => {
      // Verificar se a categoria e o WOD da bateria ainda existem no campeonato (evitar eventos "fantasmas")
      const categoryExists = categories.some(c => c.id === h.category_id);
      const wodExists = wods.some(w => w.id === h.wod_id);
      if (!categoryExists || !wodExists) return false;

      // Se "all" estiver selecionado, não filtra por aquele critério
      const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
      const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;

      return categoryFilter && wodFilter;
    });

    if (filtered.length > 0 && heatEntries.length > 0) {
      const entriesMap = new Map<string, any[]>();
      filtered.forEach(heat => {
        const entries = heatEntries
          .filter(e => e.heat_id === heat.id)
          .sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0));
        entriesMap.set(heat.id, entries);
      });
      setAllHeatEntries(entriesMap);
    } else {
      setAllHeatEntries(new Map());
    }
  }, [heats, heatEntries, selectedCategory, selectedWOD, categories, wods]);

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
      const [catsResult, wodsResult, regsResult, daysResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", selectedChampionship.id).order("order_index"),
        supabase.from("wods").select("*").eq("championship_id", selectedChampionship.id).order("order_num"),
        supabase.from("registrations").select("*").eq("championship_id", selectedChampionship.id).neq("status", "cancelled").order("order_index", { ascending: true, nullsLast: true }).order("created_at", { ascending: true }),
        supabase.from("championship_days").select("*").eq("championship_id", selectedChampionship.id).order("day_number"),
      ]);

      if (catsResult.error) throw catsResult.error;
      if (wodsResult.error) throw wodsResult.error;
      if (regsResult.error) throw regsResult.error;

      setCategories(catsResult.data || []);
      setWODs(wodsResult.data || []);
      setRegistrations(regsResult.data || []);
      setCategories(catsResult.data || []);
      setWODs(wodsResult.data || []);
      setRegistrations(regsResult.data || []);
      setChampionshipDays(daysResult.data || []);

      // Carregar variações de WOD por categoria (segundo passo, após ter os WODs)
      if (wodsResult.data && wodsResult.data.length > 0) {
        const wodIds = wodsResult.data.map(w => w.id);
        const { data: variationsData } = await supabase
          .from("wod_category_variations")
          .select("*")
          .in("wod_id", wodIds);

        if (variationsData) {
          const variationsMap = new Map();
          variationsData.forEach((variation: any) => {
            const key = `${variation.wod_id}-${variation.category_id}`;
            variationsMap.set(key, variation);
          });
          setWodVariations(variationsMap);
        }
      }

      // DEBUG: Verificar contagem de atletas
      if (regsResult.data) {
        const statusCount = regsResult.data.reduce((acc: any, curr) => {
          acc[curr.status] = (acc[curr.status] || 0) + 1;
          return acc;
        }, {});
      }

      // Carregar configurações de intervalos e padrões do campeonato
      const { data: champConfig } = await supabase
        .from("championships")
        .select("transition_time_minutes, category_interval_minutes, wod_interval_minutes, start_time, default_athletes_per_heat")
        .eq("id", selectedChampionship.id)
        .single();

      // Carregar valores salvos ou usar padrões
      if (champConfig) {
        const transMin = champConfig.transition_time_minutes || 0;
        const catMin = champConfig.category_interval_minutes || 0;
        const wodMin = champConfig.wod_interval_minutes || 0;

        setTransitionTime(transMin);
        setTransitionTimeStr(minutesToString(transMin));
        setAppliedTransition(transMin > 0);
        setSuccessTransition(transMin > 0);

        setCategoryIntervalMinutes(catMin);
        setCategoryIntervalStr(minutesToString(catMin));
        setAppliedCategoryInterval(catMin > 0);
        setSuccessCategoryInterval(catMin > 0);

        setWodIntervalMinutes(wodMin);
        setWodIntervalStr(minutesToString(wodMin));
        setAppliedWodInterval(wodMin > 0);
        setSuccessWodInterval(wodMin > 0);

        if (daysResult.data && daysResult.data.length > 0) {
          const firstDay = daysResult.data[0];
          // start_time removed

          if (champConfig.default_athletes_per_heat) {
            setAthletesPerHeat(champConfig.default_athletes_per_heat);
          }
        }
      }
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

      // Só aplicar filtros se não for 'all'
      if (selectedCategory && selectedCategory !== 'all' && selectedWOD && selectedWOD !== 'all') {
        query = query.eq("category_id", selectedCategory).eq("wod_id", selectedWOD);
      } else if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq("category_id", selectedCategory);
      } else if (selectedWOD && selectedWOD !== 'all') {
        query = query.eq("wod_id", selectedWOD);
      }
      // Se ambos forem 'all' ou vazios, não aplica filtro (mostra todas)

      // ORDENAÇÃO CRONOLÓGICA: o organizador precisa ver o que acontece primeiro.
      const { data: heatsData, error: heatsError } = await query
        .order("scheduled_time", { ascending: true, nullsFirst: false })
        .order("heat_number", { ascending: true })
        .order("wod_id", { ascending: true })
        .order("category_id", { ascending: true })
        .order("created_at", { ascending: true });

      if (heatsError) throw heatsError;

      setHeats(heatsData || []);

      // SEMPRE carregar TODAS as entries do campeonato (para verificar disponibilidade)
      // Primeiro buscar todas as baterias do campeonato
      const { data: allChampionshipHeats, error: allHeatsError } = await supabase
        .from("heats")
        .select("id, wod_id")
        .eq("championship_id", selectedChampionship.id);

      if (allHeatsError) {
        console.error("Error loading all championship heats:", allHeatsError);
        setAllChampionshipEntries([]);
      } else if (allChampionshipHeats && allChampionshipHeats.length > 0) {
        // Build Map of Heat ID -> WOD ID
        const newHeatWodMap = new Map<string, string>();
        allChampionshipHeats.forEach(h => {
          if (h.wod_id) newHeatWodMap.set(h.id, h.wod_id);
        });
        setHeatWodMap(newHeatWodMap);

        const allHeatIds = allChampionshipHeats.map(h => h.id);
        const { data: allEntriesData, error: allEntriesError } = await supabase
          .from("heat_entries")
          .select("*")
          .in("heat_id", allHeatIds)
          .order("lane_number");

        if (!allEntriesError && allEntriesData) {
          setAllChampionshipEntries(allEntriesData);
        } else {
          console.error("Error loading all championship entries:", allEntriesError);
          setAllChampionshipEntries([]);
        }
      } else {
        setAllChampionshipEntries([]);
      }

      // Inicializar heatCapacities com os valores de athletes_per_heat de cada bateria
      if (heatsData && heatsData.length > 0) {
        const capacitiesMap = new Map<string, number>();
        heatsData.forEach(heat => {
          if (heat.athletes_per_heat) {
            capacitiesMap.set(heat.id, heat.athletes_per_heat);
          }
        });
        setHeatCapacities(capacitiesMap);

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
        setHeatCapacities(new Map());
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

  /**
   * Intercala as baterias para preencher todas as raias
   * Reorganiza atletas/times entre baterias do MESMO WOD para maximizar ocupação
   * Pode misturar categorias APENAS dentro do mesmo WOD
   * NÃO recalcula horários (mantém os tempos intactos)
   */
  const handleIntercalateHeats = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    setGenerating(true);
    try {
      // Buscar todas as baterias do campeonato ordenadas por WOD e heat_number
      const { data: allHeats } = await supabase
        .from("heats")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (!allHeats || allHeats.length === 0) {
        toast.error("Não há baterias para intercalar");
        setGenerating(false);
        return;
      }

      // Buscar todas as entradas de baterias
      const { data: allEntries } = await supabase
        .from("heat_entries")
        .select("*")
        .in("heat_id", allHeats.map(h => h.id));

      if (!allEntries) {
        toast.error("Erro ao buscar entradas");
        setGenerating(false);
        return;
      }

      // Agrupar entradas por bateria
      const entriesByHeat = new Map<string, any[]>();
      allEntries.forEach(entry => {
        if (!entriesByHeat.has(entry.heat_id)) {
          entriesByHeat.set(entry.heat_id, []);
        }
        entriesByHeat.get(entry.heat_id)!.push(entry);
      });

      // Agrupar baterias por WOD
      const heatsByWod = new Map<string, any[]>();
      allHeats.forEach(heat => {
        if (!heatsByWod.has(heat.wod_id)) {
          heatsByWod.set(heat.wod_id, []);
        }
        heatsByWod.get(heat.wod_id)!.push(heat);
      });

      // Processar CADA WOD separadamente
      for (const [wodId, wodHeats] of heatsByWod.entries()) {
        // Ordenar baterias deste WOD por heat_number
        const sortedHeats = [...wodHeats].sort((a, b) => a.heat_number - b.heat_number);

        // Coletar TODOS os participantes deste WOD (de todas as categorias)
        const wodParticipants: Array<{ entry: any; categoryId: string }> = [];

        sortedHeats.forEach(heat => {
          const entries = entriesByHeat.get(heat.id) || [];
          entries.forEach(entry => {
            wodParticipants.push({
              entry,
              categoryId: heat.category_id,
            });
          });
        });

        // Criar um pool de participantes disponíveis para redistribuir
        // Marcar quais já foram usados (usando registration_id como identificador único)
        const usedRegistrationIds = new Set<string>();

        // Redistribuir participantes nas baterias deste WOD
        for (const heat of sortedHeats) {
          // Usar o valor do banco primeiro, depois heatCapacities, depois padrão
          const capacity = heat.athletes_per_heat || heatCapacities.get(heat.id) || athletesPerHeat;
          const heatParticipants: any[] = [];

          // Primeiro, tentar preencher com participantes da mesma categoria
          for (const participant of wodParticipants) {
            if (heatParticipants.length >= capacity) break;
            const regId = participant.entry.registration_id;
            if (usedRegistrationIds.has(regId)) continue;

            if (participant.categoryId === heat.category_id) {
              heatParticipants.push(participant.entry);
              usedRegistrationIds.add(regId);
            }
          }

          // Se ainda faltar, preencher com participantes de outras categorias (mesmo WOD)
          for (const participant of wodParticipants) {
            if (heatParticipants.length >= capacity) break;
            const regId = participant.entry.registration_id;
            if (usedRegistrationIds.has(regId)) continue;

            heatParticipants.push(participant.entry);
            usedRegistrationIds.add(regId);
          }

          // Deletar entradas antigas desta bateria
          await supabase
            .from("heat_entries")
            .delete()
            .eq("heat_id", heat.id);

          // Criar novas entradas
          if (heatParticipants.length > 0) {
            const newEntries = heatParticipants.map((entry, index) => ({
              heat_id: heat.id,
              registration_id: entry.registration_id,
              lane_number: index + 1,
            }));

            await supabase
              .from("heat_entries")
              .insert(newEntries);
          }
        }
      }

      // Recarregar dados (SEM recalcular horários - mantém os tempos intactos)
      // loadHeats() já carrega as entradas automaticamente
      await loadHeats();

      toast.success("Baterias intercaladas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao intercalar baterias:", error);
      toast.error(`Erro ao intercalar baterias: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  // Função para CRIAR baterias do zero (primeira vez)
  const handleCreateInitialHeats = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    if (categories.length === 0 || wods.length === 0) {
      toast.error("É necessário ter categorias e WODs cadastrados");
      return;
    }

    if (!athletesPerHeat || athletesPerHeat < 1) {
      toast.error("Defina a quantidade de raias por bateria");
      return;
    }

    if (!championshipDays || championshipDays.length === 0) {
      toast.error("Configure os dias do campeonato primeiro");
      return;
    }

    setGenerating(true);
    try {
      // Determinar quais categorias e WODs processar baseado nos filtros
      const categoriesToProcess = selectedCategory && selectedCategory !== 'all'
        ? categories.filter(c => c.id === selectedCategory)
        : categories;

      const wodsToProcess = selectedWOD && selectedWOD !== 'all'
        ? wods.filter(w => w.id === selectedWOD && w.is_published)
        : wods.filter(w => w.is_published);

      if (categoriesToProcess.length === 0 || wodsToProcess.length === 0) {
        toast.error("Nenhuma categoria ou WOD selecionado");
        setGenerating(false);
        return;
      }

      // Ordenar categorias e WODs
      // Ordenar categorias e WODs estritamente numericamente
      const sortedCategories = [...categoriesToProcess].sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));
      const sortedWods = [...wodsToProcess].sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0));

      // Persistir as configurações usadas para que fiquem salvas no campeonato
      await supabase
        .from("championships")
        .update({
          // start_time removido de championships, agora é por dia
          default_athletes_per_heat: athletesPerHeat,
          transition_time_minutes: transitionTime,
          category_interval_minutes: categoryIntervalMinutes,
          wod_interval_minutes: wodIntervalMinutes
        })
        .eq("id", selectedChampionship.id);

      // Hora de início base
      // Usar do PRIMEIRO DIA por padrão para geração inicial
      const dayStartTime = championshipDays[0]?.start_time || "00:00";
      const [hours, mins] = dayStartTime.split(':');
      const baseDate = championshipDays.length > 0
        ? new Date(championshipDays[0].date)
        : new Date();

      let currentTime = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        parseInt(hours),
        parseInt(mins),
        0,
        0
      );

      let globalHeatNumber = 1;
      let totalHeatsCreated = 0;

      // Para cada WOD
      for (const wod of sortedWods) {
        // Para cada categoria
        for (const category of sortedCategories) {
          // VERIFICAR se já existem baterias para esta categoria + WOD
          const existingHeatsForCategoryWod = heats.filter(
            h => h.category_id === category.id && h.wod_id === wod.id
          );

          if (existingHeatsForCategoryWod.length > 0) {
            continue; // Não criar duplicatas
          }

          // Buscar atletas desta categoria e INVERTER a ordem
          // Primeiros inscritos -> ficam no final da lista -> caem nas últimas baterias (Vantagem)
          const categoryRegs = [...registrations].filter(r => r.category_id === category.id).reverse();

          if (categoryRegs.length === 0) {
            continue;
          }

          // Calcular quantas baterias são necessárias
          const numHeatsNeeded = Math.ceil(categoryRegs.length / athletesPerHeat);

          // Criar baterias para esta categoria/WOD
          for (let i = 0; i < numHeatsNeeded; i++) {
            // Criar bateria
            const { data: newHeat, error: heatError } = await supabase
              .from("heats")
              .insert({
                championship_id: selectedChampionship.id,
                category_id: category.id,
                wod_id: wod.id,
                heat_number: globalHeatNumber,
                scheduled_time: currentTime.toISOString(),
                athletes_per_heat: athletesPerHeat,
              })
              .select()
              .single();

            if (heatError) throw heatError;

            // Adicionar atletas a esta bateria
            const startIdx = i * athletesPerHeat;
            const endIdx = Math.min(startIdx + athletesPerHeat, categoryRegs.length);
            const heatParticipants = categoryRegs.slice(startIdx, endIdx);

            if (heatParticipants.length > 0) {
              const entries = heatParticipants.map((reg, idx) => ({
                heat_id: newHeat.id,
                registration_id: reg.id,
                lane_number: idx + 1,
              }));

              await supabase.from("heat_entries").insert(entries);
            }

            // Avançar tempo (time_cap + transição)
            const timecapMinutes = wod.estimated_duration_minutes || 10;
            currentTime = new Date(currentTime.getTime() + (timecapMinutes * 60000) + (transitionTime * 60000));

            globalHeatNumber++;
            totalHeatsCreated++;
          }

          // Adicionar intervalo entre categorias (se houver mais categorias)
          if (sortedCategories.indexOf(category) < sortedCategories.length - 1) {
            currentTime = new Date(currentTime.getTime() + (categoryIntervalMinutes * 60000));
          }
        }

        // Adicionar intervalo entre WODs (se houver mais WODs)
        if (sortedWods.indexOf(wod) < sortedWods.length - 1) {
          currentTime = new Date(currentTime.getTime() + (wodIntervalMinutes * 60000));
        }
      }

      toast.success(`✅ ${totalHeatsCreated} baterias criadas com sucesso!`);

      // Recalcular horários para garantir que todos os intervalos e pausas sejam respeitados
      await calculateAllHeatsSchedule();

      await loadHeats();

    } catch (error: any) {
      console.error("Error creating heats:", error);
      toast.error(`Erro ao criar baterias: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  // Função para ATUALIZAR baterias (reorganizar atletas baseado no ranking)
  const handleUpdateHeats = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    setGenerating(true);
    try {
      // Buscar TODOS os resultados PUBLICADOS das categorias do campeonato
      const categoryIds = categories.map(c => c.id);
      if (categoryIds.length === 0) {
        toast.info("Nenhuma categoria encontrada no campeonato");
        setGenerating(false);
        return;
      }

      const { data: publishedResults } = await supabase
        .from("wod_results")
        .select("wod_id, category_id")
        .in("category_id", categoryIds)
        .eq("is_published", true);

      const publishedWodsPerCategory = new Map<string, Set<string>>();
      (publishedResults || []).forEach(result => {
        if (!publishedWodsPerCategory.has(result.category_id)) {
          publishedWodsPerCategory.set(result.category_id, new Set());
        }
        publishedWodsPerCategory.get(result.category_id)!.add(result.wod_id);
      });

      // Se não há resultados publicados, avisar e sair (conforme IMPORTANTE: Só reorganizar categorias que TÊM resultados)
      if (publishedWodsPerCategory.size === 0) {
        toast.error("Nenhum resultado publicado encontrado. Publique resultados na aba Resultados primeiro.");
        setGenerating(false);
        return;
      }

      // Buscar TODAS as baterias existentes
      const { data: allHeats } = await supabase
        .from("heats")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      let count = 0;
      let totalHeatsUpdated = 0;
      let totalAthletesMoved = 0;

      // Para cada categoria COM resultados publicados
      for (const [categoryId, publishedWodIds] of publishedWodsPerCategory.entries()) {
        const category = categories.find(c => c.id === categoryId);
        if (!category) continue;
        const categoryName = category.name;

        // Identificar PRÓXIMA prova
        const sortedWods = [...wods].sort((a, b) => a.order_num - b.order_num);
        let nextWod = null;
        let lastPublishedWodName = "N/A";

        for (const wod of sortedWods) {
          if (publishedWodIds.has(wod.id)) {
            lastPublishedWodName = wod.name;
          } else if (!nextWod) {
            // Achou o primeiro WOD que não está publicado (a Próxima Prova)
            nextWod = wod;
          }
        }

        // Se não houver próximo WOD, ignorar categoria
        if (!nextWod) {
          continue;
        }

        const nextWodName = nextWod.name;

        // Buscar atletas e ordenar (Piores primeiro = maior order_index)
        const categoryRegs = registrations.filter(r => r.category_id === categoryId);
        const athleteCount = categoryRegs.length;

        // Piores primeiro (order_index maior -> menor)
        // Order index: 1 = Melhor/Ouro. 10 = Pior/Décimo.
        // Assim bRank - aRank -> b(1) - a(10) = -9 (A vai pra cima). Ordenação Descendente de index = piores primeiro.
        const sortedRegs = categoryRegs.sort((a, b) => {
          const aRank = a.order_index ?? 999999;
          const bRank = b.order_index ?? 999999;
          if (aRank !== bRank) return bRank - aRank;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        // Buscar baterias EXISTENTES deste Próximo WOD
        const categoryWodHeats = (allHeats || [])
          .filter(h => h.category_id === category.id && h.wod_id === nextWod!.id)
          .sort((a, b) => a.heat_number - b.heat_number); // ASC

        if (categoryWodHeats.length === 0) {
          continue;
        }

        count++;

        // Vamos buscar entries atuais para saber quantos atletas tem em cada bateria para manter a distribuição exata
        const { data: existingEntries } = await supabase
          .from("heat_entries")
          .select("heat_id")
          .in("heat_id", categoryWodHeats.map(h => h.id));

        const slotsPerHeat = new Map<string, number>();
        categoryWodHeats.forEach(h => slotsPerHeat.set(h.id, 0));
        existingEntries?.forEach(entry => {
          const current = slotsPerHeat.get(entry.heat_id) || 0;
          slotsPerHeat.set(entry.heat_id, current + 1);
        });

        let athleteIndex = 0;

        for (let i = 0; i < categoryWodHeats.length; i++) {
          const heat = categoryWodHeats[i];
          let slots = slotsPerHeat.get(heat.id) || 0;

          // Se bateria estava vazia, utiliza athletes_per_heat padrao
          if (slots === 0 && athleteIndex < sortedRegs.length) {
            slots = heat.athletes_per_heat || athletesPerHeat || 4;
          }

          const heatAthletes = [];

          // Distribuir atletas sequencialmente (como array ja tem os piores no inicio e melhores no fim, apenas varremos do indice 0 pra frente)
          for (let s = 0; s < slots; s++) {
            if (athleteIndex < sortedRegs.length) {
              heatAthletes.push(sortedRegs[athleteIndex]);
              athleteIndex++;
            }
          }

          // Deletar entries antigas desta bateria (Preservar a bateria, alterar APENAS o registration_id)
          await supabase.from("heat_entries").delete().eq("heat_id", heat.id);

          // Criar novas entries com nova ordem
          if (heatAthletes.length > 0) {
            const newEntries = heatAthletes.map((participant, idx) => ({
              heat_id: heat.id,
              registration_id: participant.id,
              lane_number: idx + 1,
            }));
            await supabase.from("heat_entries").insert(newEntries);
            totalHeatsUpdated++;
            totalAthletesMoved += heatAthletes.length;
          }
        }
      }

      if (totalHeatsUpdated > 0) {
        toast.success(`✅ ${totalHeatsUpdated} baterias reorganizadas por desempenho em ${count} categorias!`);
      } else {
        toast.info("Nenhuma bateria atendeu aos critérios para ser reorganizada.");
      }

      await loadHeats();

    } catch (error: any) {
      console.error("Error updating heats:", error);
      toast.error("Erro ao atualizar baterias");
    } finally {
      setGenerating(false);
    }
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

  const handleOpenCreateHeat = () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato primeiro");
      return;
    }

    // Buscar o time_cap do WOD selecionado (se houver)
    const preSelectedWod = selectedWOD && selectedWOD !== 'all'
      ? wods.find(w => w.id === selectedWOD)
      : null;

    setIsCreatingHeat(true);
    setEditHeatData({
      custom_name: '',
      category_id: (selectedCategory && selectedCategory !== 'all') ? selectedCategory : '',
      wod_id: (selectedWOD && selectedWOD !== 'all') ? selectedWOD : '',
      athletes_per_heat: athletesPerHeat,
      scheduled_time: championshipDays.length > 0 ? championshipDays[0].start_time : "00:00",
      end_time: championshipDays.length > 0 ? championshipDays[0].start_time : "00:00",
      time_cap: preSelectedWod?.time_cap || '10:00',
    });
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

      // Tentar remover em lotes pequenos para evitar timeout ou erros grandes
      const CHUNK_SIZE = 20;
      for (let i = 0; i < heatsToRemove.length; i += CHUNK_SIZE) {
        const chunk = heatsToRemove.slice(i, i + CHUNK_SIZE);

        // Remover entries do lote
        const { error: entriesError } = await supabase
          .from("heat_entries")
          .delete()
          .in("heat_id", chunk);

        if (entriesError) {
          console.error(`[DEBUG_REMOVE] Erro ao remover entries do lote ${i}:`, entriesError);
          throw entriesError;
        }

        // Remover baterias do lote
        const { error: heatsError } = await supabase
          .from("heats")
          .delete()
          .in("id", chunk);

        if (heatsError) {
          console.error(`[DEBUG_REMOVE] Erro ao remover heats do lote ${i}:`, heatsError);
          throw heatsError;
        }
      }

      toast.success(`${heatsToRemove.length} bateria(s) removida(s)!`);
      setSelectedHeats(new Set());
      await loadHeats();
    } catch (error: any) {
      console.error("Error removing heats:", error);
      toast.error(`Erro ao remover: ${error.message || 'Falha na exclusão'}`);
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

  const handleRemoveFromHeat = async (entryId: string, heatId: string) => {
    try {
      // Buscar info da entry antes de remover
      const entryToRemove = allChampionshipEntries.find(e => e.id === entryId);
      // Remover apenas da heat_entries (não exclui a inscrição)
      const { error } = await supabase
        .from("heat_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      // ATUALIZAR IMEDIATAMENTE o estado local ANTES de recarregar
      // Isso garante que o time apareça instantaneamente na lista lateral
      setAllChampionshipEntries(prev => {
        const newEntries = prev.filter(e => e.id !== entryId);
        return newEntries;
      });

      setHeatEntries(prev => prev.filter(e => e.id !== entryId));

      setAllHeatEntries(prev => {
        const newMap = new Map(prev);
        const currentEntries = newMap.get(heatId) || [];
        newMap.set(heatId, currentEntries.filter(e => e.id !== entryId));
        return newMap;
      });

      toast.success("Atleta removido da bateria!");

      // Recarregar em segundo plano para sincronizar com banco
      loadHeats().then(() => {
      });
    } catch (error: any) {
      console.error("Error removing from heat:", error);
      toast.error("Erro ao remover atleta da bateria");
      await loadHeats();
    }
  };

  const handleExportPDF = async () => {
    try {
      // Buscar mapeamento de WODs por dia
      const { data: dayWodsData } = await supabase
        .from("championship_day_wods")
        .select("championship_day_id, wod_id, championship_days(day_number)")
        .eq("championship_days.championship_id", selectedChampionship?.id);

      // Criar mapa de WOD -> Dia
      const wodToDayMap = new Map<string, number>();
      if (dayWodsData) {
        dayWodsData.forEach((dw: any) => {
          if (dw.championship_days && dw.wod_id) {
            wodToDayMap.set(dw.wod_id, dw.championship_days.day_number);
          }
        });
      }

      // Filtrar baterias por dia selecionado
      let heatsToExport = [...filteredHeats];
      if (selectedDayForExport !== 'all') {
        const dayNum = parseInt(selectedDayForExport);
        heatsToExport = heatsToExport.filter(heat => {
          const heatDay = wodToDayMap.get(heat.wod_id) || 1;
          return heatDay === dayNum;
        });
      }

      if (heatsToExport.length === 0) {
        toast.error("Nenhuma bateria encontrada para exportar");
        setShowExportDialog(false);
        return;
      }

      // Ordenar baterias por número
      const sortedHeats = heatsToExport.sort((a, b) => a.heat_number - b.heat_number);

      const dayLabel = selectedDayForExport === 'all'
        ? 'Todos os Dias'
        : `Dia ${selectedDayForExport}`;

      // Criar conteúdo do PDF como HTML
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Baterias - ${selectedChampionship?.name || 'Campeonato'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            h2 { text-align: center; color: #666; font-size: 18px; }
            .heat { page-break-inside: avoid; margin-bottom: 30px; border: 2px solid #333; padding: 15px; }
            .heat-header { background: #e63946; color: white; padding: 10px; margin: -15px -15px 15px -15px; }
            .heat-title { font-size: 20px; font-weight: bold; margin: 0; }
            .heat-info { font-size: 14px; margin: 5px 0 0 0; }
            .participant { padding: 8px; margin: 5px 0; background: #f8f9fa; border-left: 3px solid #e63946; }
            .lane { font-weight: bold; color: #e63946; margin-right: 10px; }
            @media print { .heat { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <h1>Baterias - ${selectedChampionship?.name || 'Campeonato'}</h1>
          <h2>${dayLabel}</h2>
          <p style="text-align: center; color: #666;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      `;

      sortedHeats.forEach(heat => {
        const entries = allHeatEntries.get(heat.id) || [];
        const categoryInfo = categories.find(c => c.id === heat.category_id);
        const wodInfo = wods.find(w => w.id === heat.wod_id);
        const scheduledTime = heat.scheduled_time
          ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '--:--';

        // Usar custom_name se existir, senão usar o padrão (igual na tela)
        const heatDisplayName = heat.custom_name ||
          (categoryInfo && wodInfo ? `${categoryInfo.name} - ${wodInfo.name}` : `BATERIA ${heat.heat_number}`);

        htmlContent += `
          <div class="heat">
            <div class="heat-header">
              <p class="heat-title">BATERIA ${heat.heat_number}</p>
              <p class="heat-info">${heatDisplayName}</p>
              <p class="heat-info">Horário: ${scheduledTime} | TimeCap: ${wodInfo?.time_cap || '--:--'}</p>
            </div>
        `;

        entries.forEach((entry, idx) => {
          const reg = registrations.find(r => r.id === entry.registration_id);
          const participantName = reg?.team_name || reg?.athlete_name || 'Aguardando';

          // Buscar categoria do participante
          const participantCategory = reg?.category_id ? categories.find(c => c.id === reg.category_id) : null;
          const categoryName = participantCategory?.name || '';
          const fullName = categoryName ? `${participantName} - ${categoryName}` : participantName;

          htmlContent += `
            <div class="participant">
              <span class="lane">Raia ${entry.lane_number}:</span>
              <span>${fullName}</span>
            </div>
          `;
        });

        htmlContent += `</div>`;
      });

      htmlContent += `
        </body>
        </html>
      `;

      // Criar um Blob e fazer download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `baterias-${selectedChampionship?.name || 'campeonato'}-${dayLabel.replace(' ', '-')}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Arquivo HTML gerado! Abra e imprima como PDF no navegador (Ctrl+P)");
      setShowExportDialog(false);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar baterias");
    }
  };

  const handleGenerateByCategoryAndWod = async () => {
    if (!selectedChampionship || !selectedCategory || !selectedWOD) {
      toast.error("Selecione categoria e WOD primeiro");
      return;
    }

    if (!athletesPerHeat || athletesPerHeat < 1) {
      toast.error("Defina a quantidade de raias por bateria");
      return;
    }

    setGenerating(true);
    try {
      // Persistir as configurações usadas para que fiquem salvas no campeonato
      await supabase
        .from("championships")
        .update({
          default_athletes_per_heat: athletesPerHeat
        })
        .eq("id", selectedChampionship.id);

      // Verificar se já tem resultados publicados (não pode gerar)
      const { data: publishedResults } = await supabase
        .from("wod_results")
        .select("id")
        .eq("wod_id", selectedWOD)
        .eq("category_id", selectedCategory)
        .eq("is_published", true)
        .limit(1);

      if (publishedResults && publishedResults.length > 0) {
        toast.error("Este WOD já tem resultados publicados. Não é possível gerar baterias.");
        setGenerating(false);
        return;
      }

      const categoryRegs = registrations.filter(r => r.category_id === selectedCategory);

      if (categoryRegs.length === 0) {
        toast.error("Nenhuma inscrição encontrada para esta categoria");
        setGenerating(false);
        return;
      }

      // Ordenar por order_index CRESCENTE (piores primeiro)
      const sortedParticipants = categoryRegs.sort((a, b) => {
        if (a.order_index !== null && a.order_index !== undefined &&
          b.order_index !== null && b.order_index !== undefined) {
          return a.order_index - b.order_index;
        }
        if (a.order_index !== null && a.order_index !== undefined) return -1;
        if (b.order_index !== null && b.order_index !== undefined) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }).reverse(); // INVERTER para que os melhores/primeiros fiquem nas últimas baterias (Vantagem)

      const totalHeats = Math.ceil(sortedParticipants.length / athletesPerHeat);

      // Buscar maior heat_number existente para continuar a numeração
      const { data: maxHeatData } = await supabase
        .from("heats")
        .select("heat_number")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number", { ascending: false })
        .limit(1);

      let nextHeatNumber = (maxHeatData && maxHeatData.length > 0) ? maxHeatData[0].heat_number + 1 : 1;

      // Deletar baterias existentes desta categoria e WOD (se houver)
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
        const endIndex = Math.min(startIndex + athletesPerHeat, sortedParticipants.length);
        const heatParticipants = sortedParticipants.slice(startIndex, endIndex);

        const { data: newHeat, error: heatError } = await supabase
          .from("heats")
          .insert({
            championship_id: selectedChampionship.id,
            category_id: selectedCategory,
            wod_id: selectedWOD,
            heat_number: nextHeatNumber + i,
            athletes_per_heat: athletesPerHeat,
          })
          .select()
          .single();

        if (heatError) {
          console.error(`Erro ao criar bateria ${i + 1}:`, heatError);
          throw heatError;
        }

        const entries = heatParticipants.map((reg, index) => ({
          heat_id: newHeat.id,
          registration_id: reg.id,
          lane_number: index + 1,
        }));

        if (entries.length > 0) {
          const { error: entriesError } = await supabase
            .from("heat_entries")
            .insert(entries);

          if (entriesError) {
            console.error(`Erro ao adicionar atletas na bateria ${i + 1}:`, entriesError);
            throw entriesError;
          }
        }

      }

      toast.success(`✅ ${totalHeats} baterias geradas para ${categories.find(c => c.id === selectedCategory)?.name}!`);

      // Recalcular horários para garantir integridade com o resto do cronograma
      await calculateAllHeatsSchedule();

      await loadHeats();
    } catch (error: any) {
      console.error("Error generating heats by category:", error);
      toast.error(`Erro ao gerar baterias: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenEditHeat = (heat: any) => {
    setEditingHeat(heat);
    const scheduledTime = heat.scheduled_time
      ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : (championshipDays.length > 0 ? championshipDays[0].start_time : "00:00");

    // Gerar nome padrão se não houver custom_name
    const categoryInfo = categories.find(c => c.id === heat.category_id);
    const wodInfo = wods.find(w => w.id === heat.wod_id);
    const defaultName = categoryInfo && wodInfo
      ? `${categoryInfo.name} - ${wodInfo.name}`
      : `BATERIA ${heat.heat_number}`;

    setEditHeatData({
      custom_name: heat.custom_name || defaultName,
      category_id: heat.category_id || '',
      wod_id: heat.wod_id || '',
      athletes_per_heat: heat.athletes_per_heat || athletesPerHeat,
      scheduled_time: scheduledTime,
      end_time: scheduledTime,
      time_cap: wodInfo?.time_cap || '10:00',
      heat_number: heat.heat_number || 0,
    });
  };

  const [successTransition, setSuccessTransition] = useState(false);

  const handleApplyTransition = async () => {
    if (!selectedChampionship) return;

    const minutes = stringToMinutes(transitionTimeStr);

    try {
      const { error } = await supabase
        .from("championships")
        .update({ transition_time_minutes: minutes })
        .eq("id", selectedChampionship.id);

      if (error) throw error;
      setTransitionTime(minutes);
      setAppliedTransition(true);
      setSuccessTransition(true);

      // Recalcular horários de todas as baterias ao aplicar novo intervalo
      // toast.info("Intervalos atualizados. Recalculando cronograma...");

      // Buscar primeira bateria do campeonato para usar como referência
      const { data: firstHeat } = await supabase
        .from("heats")
        .select("id")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number")
        .limit(1)
        .single();

      if (firstHeat) {
        await recalculateScheduleAfterHeat(firstHeat.id);
        await validateNoDuplicateScheduleTimes();
      }

      // toast.success("Intervalo entre baterias salvo e cronograma atualizado!");
    } catch (error) {
      console.error("Error saving transition:", error);
      toast.error("Erro ao salvar intervalo");
    }
  };

  const [successCategoryInterval, setSuccessCategoryInterval] = useState(false);

  const handleApplyCategoryInterval = async () => {
    if (!selectedChampionship) return;

    const minutes = stringToMinutes(categoryIntervalStr);

    try {
      const { error } = await supabase
        .from("championships")
        .update({ category_interval_minutes: minutes })
        .eq("id", selectedChampionship.id);

      if (error) throw error;
      setCategoryIntervalMinutes(minutes);
      setAppliedCategoryInterval(true);
      setSuccessCategoryInterval(true);

      // Recalcular horários de todas as baterias ao aplicar novo intervalo
      // toast.info("Intervalos atualizados. Recalculando cronograma...");

      const { data: firstHeat } = await supabase
        .from("heats")
        .select("id")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number")
        .limit(1)
        .single();

      if (firstHeat) {
        await recalculateScheduleAfterHeat(firstHeat.id);
        await validateNoDuplicateScheduleTimes();
      }

      // toast.success("Intervalo entre categorias salvo e cronograma atualizado!");
    } catch (error) {
      console.error("Error saving category interval:", error);
      toast.error("Erro ao salvar intervalo");
    }
  };

  const handleOpenBreakDialog = () => {
    if (!selectedChampionship) return;

    // Tentar pegar a configuração do primeiro dia ou do dia selecionado para exportação
    // Se tivermos dias carregados
    if (championshipDays.length > 0) {
      const dayToEdit = selectedDayForExport !== 'all'
        ? championshipDays.find(d => d.day_number === parseInt(selectedDayForExport))
        : championshipDays[0];

      if (dayToEdit) {
        setBreakConfig({
          dayId: dayToEdit.id,
          enableBreak: dayToEdit.enable_break || false,
          breakDuration: dayToEdit.break_duration_minutes || 60,
          breakAfterWod: dayToEdit.break_after_wod_number || 1
        });
      }
    }
    setShowBreakDialog(true);
  };

  const handleSaveBreakConfig = async () => {
    if (!selectedChampionship || !breakConfig.dayId) return;

    try {
      setSavingEdits(true);

      const { error } = await supabase
        .from("championship_days")
        .update({
          enable_break: breakConfig.enableBreak,
          break_duration_minutes: breakConfig.breakDuration,
          break_after_wod_number: breakConfig.breakAfterWod
        })
        .eq("id", breakConfig.dayId);

      if (error) throw error;

      toast.success("Configuração de pausa salva!");
      setShowBreakDialog(false);

      // Recarregar os dias para atualizar o estado local
      const { data: daysResult } = await supabase
        .from("championship_days")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("day_number");

      if (daysResult) setChampionshipDays(daysResult);

      // Recalcular cronograma
      toast.info("Recalculando cronograma com as novas pausas...");
      await calculateAllHeatsSchedule();
      await loadHeats();

    } catch (error: any) {
      console.error("Error saving break config:", error);
      toast.error("Erro ao salvar configuração de pausa");
    } finally {
      setSavingEdits(false);
    }
  };

  const [successWodInterval, setSuccessWodInterval] = useState(false);

  const handleApplyWodInterval = async () => {
    if (!selectedChampionship) return;

    const minutes = stringToMinutes(wodIntervalStr);

    try {
      const { error } = await supabase
        .from("championships")
        .update({ wod_interval_minutes: minutes })
        .eq("id", selectedChampionship.id);

      if (error) throw error;
      setWodIntervalMinutes(minutes);
      setAppliedWodInterval(true);
      setSuccessWodInterval(true);

      // Recalcular horários de todas as baterias ao aplicar novo intervalo
      // toast.info("Intervalos atualizados. Recalculando cronograma...");

      const { data: firstHeat } = await supabase
        .from("heats")
        .select("id")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number")
        .limit(1)
        .single();

      if (firstHeat) {
        await recalculateScheduleAfterHeat(firstHeat.id);
        await validateNoDuplicateScheduleTimes();
      }

      // toast.success("Intervalo entre provas salvo e cronograma atualizado!");
    } catch (error) {
      console.error("Error saving wod interval:", error);
      toast.error("Erro ao salvar intervalo");
    }
  };

  /**
   * Calcula os horários de TODAS as baterias respeitando:
   * - Hora de início
   * - Transição entre baterias (do mesmo WOD e categoria)
   * - Tempo entre categorias (quando muda categoria no mesmo WOD)
   * - Intervalo entre provas (quando muda de WOD)
   * - Duração da pausa (após WOD específico configurado)
   */
  const calculateAllHeatsSchedule = async () => {
    if (!selectedChampionship) return;

    try {
      // Usar os valores DO STATE (Text Inputs) convertidos para minutos
      // Isso garante que o cálculo use exatamente o que o usuário vê na tela
      const transicaoBateriaMin = stringToMinutes(transitionTimeStr);
      const transicaoCategoriaMin = stringToMinutes(categoryIntervalStr);
      const transicaoWodMin = stringToMinutes(wodIntervalStr);

      // 1. Buscar TODAS as baterias ordenadas
      const { data: allHeats, error: heatsError } = await supabase
        .from("heats")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (heatsError) throw heatsError;
      if (!allHeats || allHeats.length === 0) return;

      // 2. Configurar horário inicial
      // Buscar dias e configuração
      const { data: championshipDaysData } = await supabase
        .from("championship_days")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("day_number");

      const currentDays = championshipDaysData || [];

      // FIX: Buscar relação WOD -> Dia -> Ordem para cálculo preciso
      const dayIds = currentDays.map(d => d.id);
      const { data: dayWodsData } = await supabase
        .from("championship_day_wods")
        .select("*")
        .in("championship_day_id", dayIds);

      // Mapa: wod_id -> { day_id, day_number, order_num_in_day, day_date }
      const wodDayMap = new Map();
      if (dayWodsData) {
        dayWodsData.forEach(dw => {
          const dayInfo = currentDays.find(d => d.id === dw.championship_day_id);
          if (dayInfo) {
            wodDayMap.set(dw.wod_id, {
              dayId: dayInfo.id,
              dayNumber: dayInfo.day_number,
              date: dayInfo.date,
              orderNumInDay: dw.order_num
            });
          }
        });
      }

      // 2. Configurar horário inicial
      // A lógica abaixo determina o horário de início baseado no DIA da bateria

      // Inicializar variáveis de controle do loop
      let currentDayNumber: number | null = null;
      let tempoAtual: Date = new Date(); // Será setado no loop
      let wodAnteriorId: string | null = null;
      let categoriaAnteriorId: string | null = null;
      let terminoAnterior: Date = new Date();

      const updatesPromise = allHeats.map(async (heat, index) => {
        // Encontrar objetos completos para acessar propriedades (order_num, etc)
        const currentWod = wods.find(w => w.id === heat.wod_id);
        const previousWod = wods.find(w => w.id === wodAnteriorId);

        // Informações do Dia deste WOD
        const wodDayInfo = wodDayMap.get(heat.wod_id);

        // Se não achar o dia no mapa (ex: wod não alocado), fallback para logica antiga ou dia 1
        const thisDayNumber = wodDayInfo?.dayNumber || 1;
        const thisDayDateStr = wodDayInfo?.date || (currentDays[0]?.date);
        const thisDayId = wodDayInfo?.dayId;

        // --- DETECTAR MUDANÇA DE DIA ---
        const isNewDay = currentDayNumber !== thisDayNumber;

        if (isNewDay) {
          currentDayNumber = thisDayNumber;

          // Resetar horário para o início deste dia CONFIGURADO EM CHAMPIONSHIP_DAYS
          // Buscar start_time do dia
          const dayConfig = currentDays.find(d => d.id === thisDayId);
          const dayStartTime = dayConfig?.start_time || "08:00"; // Fallback
          const [hours, mins] = dayStartTime.split(':');

          // Método robusto: String ISO
          const dateStr = `${thisDayDateStr}T${hours.padStart(2, '0')}:${mins.padStart(2, '0')}:00`;
          tempoAtual = new Date(dateStr);

          // Fallback se data inválida
          if (isNaN(tempoAtual.getTime())) {
            const today = new Date();
            tempoAtual = new Date(today.setHours(parseInt(hours), parseInt(mins), 0, 0));
          }

          terminoAnterior = new Date(tempoAtual); // Reinicia referência
        }

        // --- CALCULAR INTERVALO A ADICIONAR ---
        let intervaloMinutos = 0;

        if (!isNewDay && index > 0) {
          // Regra 1: Mudou de WOD?
          if (heat.wod_id !== wodAnteriorId) {
            intervaloMinutos = transicaoWodMin;

            // Verificar Pausa Programada (após o WOD ANTERIOR)
            if (previousWod) {
              const prevWodInfo = wodDayMap.get(previousWod.id);

              if (prevWodInfo) {
                // Buscar config do dia do WOD anterior
                const dayConfig = currentDays.find(d => d.id === prevWodInfo.dayId);

                if (dayConfig && dayConfig.enable_break) {
                  // Verificar se a pausa é após O NÚMERO DE ORDEM deste wod nesse dia
                  if (Number(dayConfig.break_after_wod_number) === Number(prevWodInfo.orderNumInDay)) {
                    intervaloMinutos += (dayConfig.break_duration_minutes || 0);
                  }
                }
              }
            }
          }
          // Regra 2: Mesmo WOD, mas mudou de Categoria?
          else if (heat.category_id !== categoriaAnteriorId) {
            intervaloMinutos = transicaoCategoriaMin;
          }
          // Regra 3: Mesmo WOD e mesma Categoria (apenas nova bateria)
          else {
            intervaloMinutos = transicaoBateriaMin;
          }
        }

        // Aplicar intervalo ao término da bateria anterior para achar o novo início
        if (!isNewDay && index > 0) {
          tempoAtual = new Date(terminoAnterior.getTime() + intervaloMinutos * 60000);
        }

        // --- DEFINIR TIMECAP DESTA BATERIA ---
        let timeCapMinutos = 10; // Default
        const variationKey = `${heat.wod_id}-${heat.category_id}`;
        const variation = wodVariations.get(variationKey);
        const timeCapStr = variation?.time_cap || currentWod?.time_cap || '10:00';

        if (timeCapStr.includes(':')) {
          const [tcMins, tcSecs] = timeCapStr.split(':').map(Number);
          timeCapMinutos = (tcMins || 0) + ((tcSecs || 0) / 60);
        } else {
          timeCapMinutos = parseInt(timeCapStr) || 10;
        }

        // --- PREPARAR ATUALIZAÇÃO ---
        const novoHorarioInicio = tempoAtual.toISOString();

        // Calcular término para a próxima iteração
        terminoAnterior = new Date(tempoAtual.getTime() + timeCapMinutos * 60000);

        // Atualizar referências para próxima iteração
        wodAnteriorId = heat.wod_id;
        categoriaAnteriorId = heat.category_id;

        // Só atualizar no banco se mudou
        if (heat.scheduled_time !== novoHorarioInicio) {
          return supabase
            .from("heats")
            .update({ scheduled_time: novoHorarioInicio })
            .eq("id", heat.id);
        }
        return Promise.resolve(null);
      });

      await Promise.all(updatesPromise);

      // await loadHeats(); // Opcional: recarregar para ter certeza (pode causar loop se não cuidar)

    } catch (error) {
      console.error("Erro ao recalcular horários:", error);
      toast.error("Erro ao recalcular cronograma");
    }
  };


  /**
   * Renumera as baterias seguintes após alterar o heat_number de uma bateria
   * IMPORTANTE: Renumera apenas baterias VISÍVEIS na tela (com filtros aplicados)
   */
  /**
   * Reordena as baterias de forma inteligente
   * Ex: Mover 17 -> 20
   * - Bateria 17 vira 20
   * - Baterias 18, 19, 20 viram 17, 18, 19
   */
  const reorderHeats = async (editedHeatId: string, oldNumber: number, newNumber: number) => {
    if (!selectedChampionship) return;

    try {
      // 1. Buscar baterias visíveis e ordenar
      const { data: allHeats } = await supabase
        .from("heats")
        .select("id, heat_number, scheduled_time, wod_id, category_id")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (!allHeats) return;

      // Filtrar conforme a tela
      const visibleHeats = allHeats.filter(h => {
        const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
        const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;
        return categoryFilter && wodFilter;
      });

      // 2. Determinar range e direção
      const isMovingForward = newNumber > oldNumber;
      const minNum = Math.min(oldNumber, newNumber);
      const maxNum = Math.max(oldNumber, newNumber);

      // 3. Mover a bateria alvo para um número temporário
      await supabase.from("heats").update({ heat_number: 999999 }).eq("id", editedHeatId);

      // 4. Lógica Híbrida de Deslocamento
      // Separar as baterias em dois grupos: as que devem "subir" e as que devem "descer"

      const heatsToUpdate = visibleHeats.filter(h => h.id !== editedHeatId);

      for (const heat of heatsToUpdate) {
        let shouldUpdate = false;
        let newHeatNum = heat.heat_number;

        if (isMovingForward) {
          // Ex: 17 -> 20 (Forward)
          // Baterias entre 17 e 20 (18, 19, 20) devem virar (17, 18, 19) -> Deslocar -1 (PULL)
          // Range: > oldNumber AND <= newNumber
          if (heat.heat_number > oldNumber && heat.heat_number <= newNumber) {
            newHeatNum = heat.heat_number - 1;
            shouldUpdate = true;
          }
        } else {
          // Ex: 20 -> 17 (Backward)
          // Baterias entre 17 e 20 (17, 18, 19) devem virar (18, 19, 20) -> Deslocar +1 (PUSH)
          // Range: >= newNumber AND < oldNumber
          if (heat.heat_number >= newNumber && heat.heat_number < oldNumber) {
            newHeatNum = heat.heat_number + 1;
            shouldUpdate = true;
          }
        }

        if (shouldUpdate) {
          await supabase.from("heats").update({ heat_number: newHeatNum }).eq("id", heat.id);
        }
      }

      // 5. Mover a bateria alvo para o destino final
      await supabase.from("heats").update({ heat_number: newNumber }).eq("id", editedHeatId);

      return minNum; // Retorna o menor número afetado para iniciar o recálculo de tempo
    } catch (error) {
      console.error("Erro ao reordenar:", error);
      toast.error("Erro ao reordenar baterias");
      return null;
    }
  };

  /**
   * Valida se existem baterias com horário duplicado
   * Deve ser chamada após recalculateScheduleAfterHeat
   */
  const validateNoDuplicateScheduleTimes = async () => {
    if (!selectedChampionship) return;

    try {
      // Buscar todas as baterias do campeonato
      const { data: allHeats, error } = await supabase
        .from("heats")
        .select("id, heat_number, scheduled_time")
        .eq("championship_id", selectedChampionship.id);

      if (error || !allHeats) {
        console.error("Erro ao validar horários:", error);
        return;
      }

      // Agrupar por scheduled_time
      const timeMap = new Map<string, string[]>();

      allHeats.forEach(heat => {
        if (heat.scheduled_time) {
          const timeKey = heat.scheduled_time;
          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, []);
          }
          timeMap.get(timeKey)!.push(heat.id);
        }
      });

      // Verificar se algum horário tem mais de uma bateria
      const conflicts = Array.from(timeMap.entries()).filter(([_, heatIds]) => heatIds.length > 1);

      if (conflicts.length > 0) {
        console.warn("⚠️ CONFLITOS DE HORÁRIO DETECTADOS:", conflicts);
        toast.error("Atenção: existem baterias com horário duplicado. Verifique o cronograma.");
      }
    } catch (error) {
      console.error("Erro na validação de horários:", error);
    }
  };

  /**
   * Recalcula os horários de todas as baterias APÓS a bateria editada
   * IMPORTANTE: Recalcula apenas baterias VISÍVEIS na tela (com filtros aplicados)
   * Abrange TODAS as categorias exibidas na tela
   */
  const recalculateScheduleAfterHeat = async (editedHeatId: string, fixedHeatId?: string) => {
    if (!selectedChampionship) return;

    try {
      // Recarregar configurações de intervalos do campeonato ANTES de calcular
      const { data: champConfig } = await supabase
        .from("championships")
        .select("transition_time_minutes, category_interval_minutes, wod_interval_minutes")
        .eq("id", selectedChampionship.id)
        .single();

      const currentTransitionTime = champConfig?.transition_time_minutes ?? transitionTime ?? 0;
      // Se intervalos estiverem em 0 ou não definidos, usar o intervalo entre baterias para tudo
      const categoryIntervalRaw = champConfig?.category_interval_minutes ?? categoryIntervalMinutes ?? 0;
      const wodIntervalRaw = champConfig?.wod_interval_minutes ?? wodIntervalMinutes ?? 0;
      const currentCategoryInterval = (categoryIntervalRaw && categoryIntervalRaw > 0) ? categoryIntervalRaw : currentTransitionTime;
      const currentWodInterval = (wodIntervalRaw && wodIntervalRaw > 0) ? wodIntervalRaw : currentTransitionTime;

      // Obter bateria base - usar maybeSingle para detectar se não existe
      const { data: editedHeat } = await supabase
        .from("heats")
        .select("*")
        .eq("id", editedHeatId)
        .maybeSingle();

      // BUSCAR TODAS AS BATERIAS DO BANCO (GARANTIR ORDEM ATUALIZADA E INTEGRIDADE DO CRONOGRAMA)
      // Não podemos depender do estado 'heats' da UI, pois ele pode estar desatualizado após a reordenação.
      // Também não devemos filtrar (visibleHeats), pois o cronograma é único e sequencial para todas as categorias.

      const { data: allHeatsOrdered } = await supabase
        .from("heats")
        .select("*, wods(*)")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (!allHeatsOrdered || allHeatsOrdered.length === 0) {
        return;
      }

      // Se a bateria editada não existe mais (foi deletada), usar a primeira bateria como âncora
      let anchorHeat = editedHeat;
      let anchorHeatId = editedHeatId;

      if (!editedHeat) {
        anchorHeat = allHeatsOrdered[0];
        anchorHeatId = anchorHeat.id;
      }

      // Encontrar a posição da bateria de referência (Predecessora ou Editada) na lista ATUALIZADA
      const editedHeatIndex = allHeatsOrdered.findIndex(h => h.id === anchorHeatId);

      if (editedHeatIndex === -1) {
        return;
      }

      // Pegar apenas as baterias SEGUINTES na ordem da listagem
      const followingHeats = allHeatsOrdered.slice(editedHeatIndex + 1);

      if (followingHeats.length === 0) {
        return;
      }

      // 1. Buscar dias e mapeamento Dia-WOD (Para suporte a multi-dias)
      const { data: championshipDaysData } = await supabase
        .from("championship_days")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("day_number");

      const currentDays = championshipDaysData || [];
      const dayIds = currentDays.map(d => d.id);

      const { data: dayWodsData } = await supabase
        .from("championship_day_wods")
        .select("*")
        .in("championship_day_id", dayIds);

      const wodDayMap = new Map();
      if (dayWodsData) {
        dayWodsData.forEach(dw => {
          const dayInfo = currentDays.find(d => d.id === dw.championship_day_id);
          if (dayInfo) {
            wodDayMap.set(dw.wod_id, {
              dayId: dayInfo.id,
              dayNumber: dayInfo.day_number,
              date: dayInfo.date,
              orderNumInDay: dw.order_num
            });
          }
        });
      }

      // 2. Buscar WODs e Variações
      // Otimização: Buscar apenas dos envolvidos
      const relevantWodIds = [...new Set([anchorHeat.wod_id, ...followingHeats.map(h => h.wod_id)])];

      const { data: wodsData } = await supabase
        .from("wods")
        .select("id, estimated_duration_minutes, time_cap")
        .in("id", relevantWodIds);

      const wodsMap = new Map((wodsData || []).map(w => [w.id, w]));

      const { data: variationsData } = await supabase
        .from("wod_category_variations")
        .select("*")
        .in("wod_id", relevantWodIds);

      const localVariationsMap = new Map();
      if (variationsData) {
        variationsData.forEach((variation: any) => {
          const key = `${variation.wod_id}-${variation.category_id}`;
          localVariationsMap.set(key, variation);
        });
      }

      // Buscar TODOS os resultados publicados
      const { data: allPublishedResults } = await supabase
        .from("wod_results")
        .select("wod_id, category_id")
        .eq("is_published", true);

      const publishedResultsSet = new Set<string>();
      (allPublishedResults || []).forEach(r => {
        publishedResultsSet.add(`${r.wod_id}_${r.category_id}`);
      });

      // INICIALIZAR VARIÁVEIS DE CONTROLE
      // Precisamos da hora de término da bateria "Editada/Referência" para calcular a próxima
      const referenceWod = wodsMap.get(editedHeat.wod_id);
      let referenceDuration = 0;
      if (referenceWod) {
        // Tentar pegar timecap específico da categoria
        const variation = localVariationsMap.get(`${editedHeat.wod_id}-${editedHeat.category_id}`);
        const timeCap = variation?.time_cap || referenceWod.time_cap || "0";

        if (typeof timeCap === 'string' && timeCap.includes(':')) {
          const [mm, ss] = timeCap.split(':').map(Number);
          referenceDuration = mm + (ss / 60);
        } else {
          referenceDuration = Number(timeCap);
        }
      }

      let lastHeatEndTime = new Date(new Date(editedHeat.scheduled_time).getTime() + (referenceDuration * 60000));

      // Ajuste de "Start Time" global do dia da bateria de referência para saber trocas de dia
      // Inicializar o "heat anterior" com a âncora (ou referência inicial)
      let lastProcessedHeat = anchorHeat;

      // Inicializar currentDayNumber com base no anchorHeat
      const refWodInfo = wodDayMap.get(anchorHeat.wod_id);
      let currentDayNumber = refWodInfo?.dayNumber || 1;

      // Set para controlar quais pausas já foram aplicadas neste recálculo
      const pausasAplicadas = new Set<string>();

      // LOOP DE RECÁLCULO
      for (const heat of followingHeats) {
        // --- LOGICA DE FIXED HEAT ---
        if (heat.id === fixedHeatId) {
          const fixedTime = new Date(heat.scheduled_time);

          // Mas precisamos atualizar lastHeatEndTime para a próxima iteração!
          const heatWod = wodsMap.get(heat.wod_id);
          let heatDuration = 0;
          if (heatWod) {
            const variation = localVariationsMap.get(`${heat.wod_id}-${heat.category_id}`);
            const timeCap = variation?.time_cap || heatWod.time_cap || "0";
            if (typeof timeCap === 'string' && timeCap.includes(':')) {
              const [mm, ss] = timeCap.split(':').map(Number);
              heatDuration = mm + (ss / 60);
            } else {
              heatDuration = Number(timeCap);
            }
          }
          lastHeatEndTime = new Date(fixedTime.getTime() + (heatDuration * 60000));

          // Atualizar o "heat anterior" para o atual, para a próxima iteração
          lastProcessedHeat = heat;
          continue;
        }

        // --- LÓGICA NORMAL DE RECÁLCULO ---
        // Usar a variável de estado que rastreia o heat anterior cronologicamente
        const previousHeat = lastProcessedHeat;
        const previousWodId = previousHeat.wod_id;
        const previousCategoryId = previousHeat.category_id;

        const resultKey = `${heat.wod_id}-${heat.category_id}`;
        if (publishedResultsSet.has(resultKey)) {
          break;
        }

        const wodDayInfo = wodDayMap.get(heat.wod_id);
        const thisDayNumber = wodDayInfo?.dayNumber || 1;
        const thisDayDateStr = wodDayInfo?.date || (currentDays[0]?.date);

        const isNewDay = currentDayNumber !== thisDayNumber;

        let shouldResetDay = false;

        if (isNewDay) {
          if (thisDayNumber > currentDayNumber) {
            const remainingHeats = followingHeats.slice(followingHeats.indexOf(heat) + 1);
            const hasReturnToPast = remainingHeats.some(h => {
              const hWodInfo = wodDayMap.get(h.wod_id);
              const hDay = hWodInfo?.dayNumber || 1;
              return hDay < thisDayNumber;
            });

            if (!hasReturnToPast) {
              shouldResetDay = true;
            } else {
            }
          }
        }

        let nextStartTime: Date;

        if (shouldResetDay) {
          // Buscar start_time do dia específico
          const dayConfigThisDay = currentDays.find(d => d.id === wodDayInfo?.dayId);
          currentDayNumber = thisDayNumber;

          const startTimeGlobal = dayConfigThisDay?.start_time || "00:00";
          const [h, m] = startTimeGlobal.split(':');
          const dateStr = `${thisDayDateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
          nextStartTime = new Date(dateStr);

          if (isNaN(nextStartTime.getTime())) {
            const d = new Date(thisDayDateStr + 'T00:00:00');
            d.setHours(parseInt(h), parseInt(m));
            nextStartTime = d;
          }
        } else {
          // FLUXO CONTÍNUO
          nextStartTime = new Date(lastHeatEndTime.getTime());

          if (heat.wod_id !== previousWodId) {
            nextStartTime = new Date(nextStartTime.getTime() + (currentWodInterval * 60000));
            const prevWodInfo = wodDayMap.get(previousWodId);
            if (prevWodInfo) {
              const dayConfig = currentDays.find(d => d.id === prevWodInfo.dayId);


              const prevWodBelongsToCurrentTimeline = prevWodInfo.dayNumber === currentDayNumber;
              const currentWodInfo = wodDayMap.get(heat.wod_id);
              const currentWodBelongsToCurrentTimeline = currentWodInfo?.dayNumber === currentDayNumber;

              const pausaKey = `dia_${prevWodInfo.dayNumber}_wod_${prevWodInfo.orderNumInDay}`;
              const shouldApplyPause = prevWodBelongsToCurrentTimeline &&
                currentWodBelongsToCurrentTimeline &&
                dayConfig &&
                dayConfig.enable_break &&
                Number(dayConfig.break_after_wod_number) === Number(prevWodInfo.orderNumInDay);

              if (shouldApplyPause) {
                if (!pausasAplicadas.has(pausaKey)) {
                  nextStartTime = new Date(nextStartTime.getTime() + ((dayConfig.break_duration_minutes || 0) * 60000));
                  pausasAplicadas.add(pausaKey);
                } else {
                }
              }
            }
          } else if (heat.category_id !== previousCategoryId) {
            nextStartTime = new Date(nextStartTime.getTime() + (currentCategoryInterval * 60000));
          } else {
            nextStartTime = new Date(nextStartTime.getTime() + (currentTransitionTime * 60000));
          }
        }

        // Atualizar lastProcessedHeat para o heat atual (será o anterior na próxima volta)
        lastProcessedHeat = heat;

        // ATUALIZAR BATERIA
        await supabase.from("heats").update({ scheduled_time: nextStartTime.toISOString() }).eq("id", heat.id);

        // ATUALIZAR Reference para próxima iteração
        const heatWod = wodsMap.get(heat.wod_id);
        let heatDuration = 0;
        if (heatWod) {
          const variation = localVariationsMap.get(`${heat.wod_id}-${heat.category_id}`);
          const timeCap = variation?.time_cap || heatWod.time_cap || "0";
          if (typeof timeCap === 'string' && timeCap.includes(':')) {
            const [mm, ss] = timeCap.split(':').map(Number);
            heatDuration = mm + (ss / 60);
          } else {
            heatDuration = Number(timeCap);
          }
        }
        lastHeatEndTime = new Date(nextStartTime.getTime() + (heatDuration * 60000));

        // Atualizar contexto de dia atual (se não foi resetado acima, pode ser atualizado aqui se mudamos de wod mas sem reset)
        // Se shouldResetDay=true, já atualizamos. Se não, mantemos ou atualizamos?
        // Se estamos em fluxo contínuo (bateria intercalada), currentDayNumber deve permanecer o "lógico".
        // O código original não atualizava currentDayNumber no else. Mantemos assim.
      }

    } catch (error: any) {
      console.error("Erro no recálculo em cascata:", error);
      toast.error("Erro ao recalcular horários das baterias seguintes");
    }
  };

  const handleSaveEditHeat = async () => {
    if (!editingHeat || !selectedChampionship) return;

    // Calcular data combinada
    // Se o input for do tipo time, ele devolve "HH:mm". Se for text, pode variar.
    // O estado inicial define como string vazia, presumimos que o input controlled atualize isso.
    const timeValue = editHeatData.scheduled_time || "00:00";
    const [hours, minutes] = timeValue.split(":").map(Number);

    // Obter data base correta do dia do WOD
    let dayDateStr = (championshipDays.find(d => d.day_number === 1)?.date) || new Date().toISOString().split('T')[0];

    // Tentar buscar informações do dia do WOD
    const { data: dayWodEntry } = await supabase
      .from('championship_day_wods')
      .select('championship_day_id')
      .eq('wod_id', editHeatData.wod_id)
      .limit(1)
      .maybeSingle();

    if (dayWodEntry) {
      const foundDay = championshipDays.find(d => d.id === dayWodEntry.championship_day_id);
      if (foundDay) dayDateStr = foundDay.date;
    }

    // Construir data usando values corretos
    const scheduledDate = new Date(`${dayDateStr}T${timeValue}:00`);
    if (isNaN(scheduledDate.getTime())) {
      toast.error("Horário inválido");
      return;
    }

    try {
      const heatNumberChanged = editHeatData.heat_number !== editingHeat.heat_number;
      let startRecalculateFromId = editingHeat.id;
      let targetTimeFromSlot: string | null = null;

      if (heatNumberChanged) {
        // 0. CAPTURAR O HORÁRIO DO SLOT ALVO (Se existir)
        const { data: targetHeat } = await supabase
          .from("heats")
          .select("scheduled_time")
          .eq("championship_id", selectedChampionship.id)
          .eq("heat_number", editHeatData.heat_number) // Quem está lá agora
          .limit(1)
          .single();

        if (targetHeat) {
          targetTimeFromSlot = targetHeat.scheduled_time;
        }

        // 1. Executar Reordenação Inteligente
        const firstAffectedNumber = await reorderHeats(editingHeat.id, editingHeat.heat_number, editHeatData.heat_number);

        // Se reordenação funcionou, precisamos descobrir de onde começar o recálculo.
        if (firstAffectedNumber !== null) {
          if (firstAffectedNumber !== null) {
            if (firstAffectedNumber > 1) {
              const { data: prevHeat, error: prevError } = await supabase
                .from("heats")
                .select("id")
                .eq("championship_id", selectedChampionship.id)
                .eq("heat_number", firstAffectedNumber - 1)
                .maybeSingle(); // Changed from single() to maybeSingle()

              if (prevError) console.error("Erro ao buscar bateria anterior:", prevError);

              if (prevHeat) {
                startRecalculateFromId = prevHeat.id;
              }
            } else {
              const { data: firstHeat, error: firstError } = await supabase
                .from("heats")
                .select("id")
                .eq("championship_id", selectedChampionship.id)
                .eq("heat_number", 1)
                .maybeSingle(); // Changed from single() to maybeSingle()

              if (firstError) console.error("Erro ao buscar primeira bateria:", firstError);

              if (firstHeat) {
                startRecalculateFromId = firstHeat.id;

                const startTimeGlobal = (championshipDays.length > 0 ? championshipDays[0].start_time : "00:00") || "00:00";
                const [h, m] = startTimeGlobal.split(':');
                const day1 = championshipDays.find(d => d.day_number === 1);
                const baseDatePrefix = day1 ? day1.date : (new Date().toISOString().split('T')[0]);
                const newStartDate = new Date(`${baseDatePrefix}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`);

                const { error: resetError } = await supabase.from("heats").update({ scheduled_time: newStartDate.toISOString() }).eq("id", firstHeat.id);
                if (resetError) console.error("Erro ao resetar bateria 1:", resetError);

              }
            }
          }
        }
      }

      // 2. Atualizar dados da bateria
      // Se tivermos capturado um horário alvo E mudou o número, usamos ele.
      // Caso contrário, usamos o scheduledDate calculado do formulário (que o user pode ter editado tbm).
      const finalScheduledTime = (heatNumberChanged && targetTimeFromSlot) ? targetTimeFromSlot : scheduledDate.toISOString();

      await supabase
        .from("heats")
        .update({
          custom_name: editHeatData.custom_name.trim() || null,
          athletes_per_heat: editHeatData.athletes_per_heat,
          scheduled_time: finalScheduledTime,
          heat_number: editHeatData.heat_number,
        })
        .eq("id", editingHeat.id);

      toast.success(heatNumberChanged ? "Bateria reordenada e horários ajustados!" : "Bateria salva! Recalculando...");

      // Atualizar heatCapacities imediatamente
      setHeatCapacities(prev => {
        const updated = new Map(prev);
        updated.set(editingHeat.id, editHeatData.athletes_per_heat);
        return updated;
      });

      // 3. Recalcular (Passando a bateria editada como FIXED se mudou de posição)
      // Se mudou numero, a bateria editada DEVE manter o "targetTimeFromSlot" e não ser recalculada pela cascata.
      const fixedHeatId = heatNumberChanged ? editingHeat.id : undefined;

      await recalculateScheduleAfterHeat(startRecalculateFromId, fixedHeatId);

      await loadHeats();
      setEditingHeat(null);
      // 3. Recalcular Cronograma
      // Se não mudou número, usa o ID da própria bateria.
      // Se mudou, usa o ID da primeira bateria afetada (calculado acima).
      await recalculateScheduleAfterHeat(startRecalculateFromId);

      await loadHeats();
    } catch (error: any) {
      console.error("Error saving heat:", error);
      toast.error("Erro ao salvar bateria");
    }
  };

  const handleCreateHeat = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato primeiro");
      return;
    }

    if (!editHeatData.category_id || !editHeatData.wod_id) {
      toast.error("Selecione categoria e WOD");
      return;
    }

    try {
      // Buscar TODAS as baterias do campeonato para pegar o maior número
      const { data: allHeats } = await supabase
        .from("heats")
        .select("heat_number")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number", { ascending: false })
        .limit(1);

      const maxHeatNumber = allHeats && allHeats.length > 0 ? allHeats[0].heat_number : 0;

      // Converter horário para ISO
      const [hours, mins] = editHeatData.scheduled_time.split(':');
      const baseDate = championshipDays.length > 0
        ? new Date(championshipDays[0].date)
        : new Date();

      const scheduledDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        parseInt(hours),
        parseInt(mins),
        0,
        0
      );

      const { data: newHeat, error } = await supabase
        .from("heats")
        .insert({
          championship_id: selectedChampionship.id,
          category_id: editHeatData.category_id,
          wod_id: editHeatData.wod_id,
          heat_number: maxHeatNumber + 1,
          custom_name: editHeatData.custom_name.trim() || null,
          athletes_per_heat: editHeatData.athletes_per_heat,
          scheduled_time: scheduledDate.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Bateria criada com sucesso!");

      // Recalcular horários de todas as baterias após esta
      if (newHeat) {
        await recalculateScheduleAfterHeat(newHeat.id);
      }

      setIsCreatingHeat(false);
      await loadHeats();
    } catch (error: any) {
      console.error("Error creating heat:", error);
      toast.error("Erro ao criar bateria");
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

    // Verificar se são baterias sendo arrastadas (reordenar baterias)
    if (activeId.startsWith('heat-card-') && overId.startsWith('heat-card-')) {
      const activeHeatId = activeId.replace('heat-card-', '');
      const overHeatId = overId.replace('heat-card-', '');

      if (activeHeatId === overHeatId) {
        setActiveId(null);
        return;
      }

      try {
        // Calcular filtros atuais e baterias filtradas
        const hasCategoryFilter = selectedCategory && selectedCategory !== 'all';
        const hasWodFilter = selectedWOD && selectedWOD !== 'all';
        const hasFilters = hasCategoryFilter || hasWodFilter;

        // Calcular filteredHeats dentro da função para ter acesso aos valores atuais
        const currentFilteredHeats = heats.filter(h => {
          const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
          const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;
          return categoryFilter && wodFilter;
        }).sort((a, b) => a.heat_number - b.heat_number);

        // ATUALIZAÇÃO OTIMISTA: Atualizar estado local IMEDIATAMENTE antes de salvar no banco
        let newOrderedHeats: any[] = [];

        if (hasFilters) {
          // Se há filtros aplicados
          const activeIndex = currentFilteredHeats.findIndex(h => h.id === activeHeatId);
          const overIndex = currentFilteredHeats.findIndex(h => h.id === overHeatId);

          if (activeIndex === -1 || overIndex === -1) {
            setActiveId(null);
            return;
          }

          // ATUALIZAÇÃO OTIMISTA: Atualizar visual IMEDIATAMENTE
          setHeats(prevHeats => {
            const sorted = [...prevHeats].sort((a, b) => a.heat_number - b.heat_number);
            const filteredIds = new Set(currentFilteredHeats.map(h => h.id));

            // Separar filtradas e não filtradas
            const filtered = sorted.filter(h => filteredIds.has(h.id));
            const nonFiltered = sorted.filter(h => !filteredIds.has(h.id));

            // Reordenar apenas as filtradas
            const activeIdx = filtered.findIndex(h => h.id === activeHeatId);
            const overIdx = filtered.findIndex(h => h.id === overHeatId);

            if (activeIdx === -1 || overIdx === -1) return prevHeats;

            const reorderedFiltered = arrayMove(filtered, activeIdx, overIdx);

            // Combinar mantendo ordem relativa
            const minHeatNum = Math.min(...filtered.map(h => h.heat_number));
            const before = nonFiltered.filter(h => h.heat_number < minHeatNum);
            const after = nonFiltered.filter(h => h.heat_number >= minHeatNum);

            const combined = [...before, ...reorderedFiltered, ...after];

            // Atualizar heat_number localmente
            return combined.map((heat, idx) => ({
              ...heat,
              heat_number: idx + 1
            }));
          });

          // Buscar todas do banco para persistir
          const { data: allHeats } = await supabase
            .from("heats")
            .select("*")
            .eq("championship_id", selectedChampionship?.id)
            .order("heat_number");

          if (!allHeats) {
            await loadHeats();
            setActiveId(null);
            return;
          }

          const filteredHeatIds = new Set(currentFilteredHeats.map(h => h.id));
          const reorderedFiltered = arrayMove(currentFilteredHeats, activeIndex, overIndex);
          const nonFilteredHeats = allHeats.filter(h => !filteredHeatIds.has(h.id));

          const minFilteredHeatNumber = Math.min(...currentFilteredHeats.map(h => h.heat_number));
          const maxFilteredHeatNumber = Math.max(...currentFilteredHeats.map(h => h.heat_number));
          const sortedNonFiltered = nonFilteredHeats.sort((a, b) => a.heat_number - b.heat_number);

          const allHeatsReordered: any[] = [];
          for (const heat of sortedNonFiltered) {
            if (heat.heat_number < minFilteredHeatNumber) {
              allHeatsReordered.push(heat);
            }
          }
          allHeatsReordered.push(...reorderedFiltered);
          for (const heat of sortedNonFiltered) {
            if (heat.heat_number > maxFilteredHeatNumber) {
              allHeatsReordered.push(heat);
            }
          }

          newOrderedHeats = allHeatsReordered;
        } else {
          // Sem filtros: reordenar todas normalmente

          // ATUALIZAÇÃO OTIMISTA: Atualizar visual IMEDIATAMENTE
          setHeats(prevHeats => {
            const sorted = [...prevHeats].sort((a, b) => a.heat_number - b.heat_number);
            const activeIdx = sorted.findIndex(h => h.id === activeHeatId);
            const overIdx = sorted.findIndex(h => h.id === overHeatId);

            if (activeIdx === -1 || overIdx === -1) return prevHeats;

            const reordered = arrayMove(sorted, activeIdx, overIdx);

            return reordered.map((heat, idx) => ({
              ...heat,
              heat_number: idx + 1
            }));
          });

          const { data: allHeatsOrdered } = await supabase
            .from("heats")
            .select("*")
            .eq("championship_id", selectedChampionship?.id)
            .order("heat_number");

          if (!allHeatsOrdered) {
            await loadHeats();
            setActiveId(null);
            return;
          }

          const activeIndex = allHeatsOrdered.findIndex(h => h.id === activeHeatId);
          const overIndex = allHeatsOrdered.findIndex(h => h.id === overHeatId);

          if (activeIndex === -1 || overIndex === -1) {
            await loadHeats();
            setActiveId(null);
            return;
          }

          newOrderedHeats = arrayMove(allHeatsOrdered, activeIndex, overIndex);
        }

        // Persistir no banco
        setActiveId(null); // Liberar imediatamente para melhor UX

        // Toast IMEDIATO
        toast.success("🔄 Reorganizando...", {
          description: "Salvando nova ordem",
          duration: 1500,
        });

        const updatePromises = newOrderedHeats.map((heat, idx) => {
          return supabase
            .from("heats")
            .update({ heat_number: idx + 1 })
            .eq("id", heat.id);
        });

        Promise.all(updatePromises).then(async (results) => {
          // Verificar se houve erros
          const errors = results.filter(r => r.error);
          if (errors.length > 0) {
            console.error("❌ Erros ao salvar ordem das baterias:");
            errors.forEach((err, idx) => {
              console.error(`  Erro ${idx + 1}:`, err.error);
            });

            // Verificar sessão
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              console.error('❌ SESSÃO EXPIRADA!');
              toast.error("❌ Sessão expirada. Faça login novamente.");
            } else {
              toast.error("❌ Erro ao salvar - verifique permissões");
            }

            await loadHeats(); // Reverter
            return;
          }

          // --- LÓGICA DE PREDECESSOR RECALCULATION ---
          // Em vez de forçar o horário do slot alvo, recalcular dinamicamente a partir do PREDECESSOR.
          // Isso garante que se a bateria mudou de WOD (ex: Event 4 -> Event 1), ela receba os intervalos corretos (WOD Interval e Pausas).

          // Buscar bateria movida na nova lista ordenada
          const movedHeat = newOrderedHeats.find(h => h.id === activeHeatId);
          const movedHeatIndex = newOrderedHeats.findIndex(h => h.id === activeHeatId);

          if (movedHeat && movedHeatIndex !== -1) {
            if (movedHeatIndex > 0) {
              // Tem predecessor? Recalcular a partir DELE.
              // Isso fará com que a bateria MOVIDA seja a primeira a ser recalculada na loop do 'followingHeats',
              // garantindo que ela verifique seus intervalos em relação ao novo vizinho anterior.
              const predecessorHeat = newOrderedHeats[movedHeatIndex - 1];
              await recalculateScheduleAfterHeat(predecessorHeat.id);
            } else {
              // É a primeira bateria do dia/lista?
              // Resetar para horário inicial do dia e recalcular o resto.
              const day1 = championshipDays.find(d => d.day_number === 1);
              const startDateTimeStr = day1 ? day1.start_time : "00:00";
              const [h, m] = startDateTimeStr.split(':');
              const baseDatePrefix = day1 ? day1.date : (new Date().toISOString().split('T')[0]);
              const newStartDate = new Date(`${baseDatePrefix}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`);

              // Atualizar a própria bateria movida
              await supabase
                .from("heats")
                .update({ scheduled_time: newStartDate.toISOString() })
                .eq("id", activeHeatId);

              // Recalcular TUDO a partir dela
              await recalculateScheduleAfterHeat(activeHeatId);
            }

            // Validar se há horários duplicados após recálculo
            await validateNoDuplicateScheduleTimes();
            toast.success("Cronograma recalculado e intervalos aplicados!");
          }

          await loadHeats(); // Sincronizar
          toast.success("✅ Baterias reorganizadas!", {
            description: "Nova ordem salva com sucesso",
            duration: 3000,
          });
        }).catch((error) => {
          console.error("❌ Erro ao persistir:", error);
          loadHeats(); // Reverter
          toast.error("❌ Erro ao salvar nova ordem");
        });

        toast.success("Reorganizando...");
      } catch (error) {
        console.error("Erro ao reordenar baterias:", error);
        // Reverter estado em caso de erro
        await loadHeats();
        toast.error("Erro ao reorganizar baterias");
        setActiveId(null);
      }
      return;
    }

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

        // Buscar a bateria para obter sua capacidade
        const targetHeat = heats.find(h => h.id === targetHeatId);
        if (!targetHeat) {
          toast.error("Bateria não encontrada");
          setActiveId(null);
          return;
        }

        const currentEntries = allHeatEntries.get(targetHeatId) || [];

        // Verificar capacidade máxima
        const maxAthletes = targetHeat.athletes_per_heat || heatCapacities.get(targetHeatId) || athletesPerHeat;

        if (currentEntries.length >= maxAthletes) {
          toast.error(`Bateria já está cheia (${maxAthletes}/${maxAthletes})`);
          setActiveId(null);
          return;
        }

        // Verificar se o atleta já está nesta bateria
        const alreadyInHeat = currentEntries.some(e => e.registration_id === registrationId);
        if (alreadyInHeat) {
          toast.error("Este atleta já está nesta bateria");
          setActiveId(null);
          return;
        }

        // VALIDAÇÃO DE CATEGORIA: Buscar categoria do atleta e da bateria
        const { data: registration, error: regError } = await supabase
          .from('registrations')
          .select('category_id')
          .eq('id', registrationId)
          .single();

        if (regError || !registration) {
          toast.error("Erro ao verificar categoria do atleta");
          setActiveId(null);
          setSavingEdits(false);
          return;
        }

        // Se as categorias são diferentes, mostrar confirmação
        if (registration.category_id !== targetHeat.category_id) {
          const athleteCategory = categories.find(c => c.id === registration.category_id);
          const heatCategory = categories.find(c => c.id === targetHeat.category_id);

          // Criar promise para aguardar confirmação do usuário
          const confirmed = await new Promise<boolean>((resolve) => {
            setCategoryMismatchDialog({
              show: true,
              athleteCategoryName: athleteCategory?.name || 'Desconhecida',
              heatCategoryName: heatCategory?.name || 'Desconhecida',
              onConfirm: () => {
                setCategoryMismatchDialog(null);
                resolve(true);
              },
              onCancel: () => {
                setCategoryMismatchDialog(null);
                resolve(false);
              }
            });
          });

          if (!confirmed) {
            setActiveId(null);
            setSavingEdits(false);
            return;
          }
        }

        // VALIDAÇÃO DE CONFLITO DE HORÁRIO: Verificar se atleta já está em outra bateria no mesmo horário
        if (targetHeat.scheduled_time) {
          const { data: existingEntries, error: entriesError } = await supabase
            .from('heat_entries')
            .select('heat_id, heats(scheduled_time)')
            .eq('registration_id', registrationId);

          if (entriesError) {
            toast.error("Erro ao verificar conflitos de horário");
            setActiveId(null);
            setSavingEdits(false);
            return;
          }

          if (existingEntries && existingEntries.length > 0) {
            const targetTime = new Date(targetHeat.scheduled_time);

            for (const entry of existingEntries) {
              if (entry.heats && entry.heats.scheduled_time) {
                const existingTime = new Date(entry.heats.scheduled_time);
                const diffMinutes = Math.abs(targetTime.getTime() - existingTime.getTime()) / 60000;

                if (diffMinutes < 15) {
                  toast.error("Atleta já está em outra bateria neste horário.");
                  setActiveId(null);
                  setSavingEdits(false);
                  return;
                }
              }
            }
          }
        }

        const maxLaneNumber = currentEntries.length > 0
          ? Math.max(...currentEntries.map(e => e.lane_number || 0))
          : 0;

        const { data: newEntry, error: insertError } = await supabase
          .from("heat_entries")
          .insert({
            heat_id: targetHeatId,
            registration_id: registrationId,
            lane_number: maxLaneNumber + 1,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Toast IMEDIATO
        toast.success("✅ Atleta adicionado!", {
          description: "Sincronizando...",
          duration: 1000,
        });

        // ATUALIZAÇÃO OTIMISTA DO ESTADO LOCAL
        if (newEntry) {
          // 1. Atualizar allChampionshipEntries (para sumir da lista lateral)
          setAllChampionshipEntries(prev => [...prev, newEntry]);

          // 2. Atualizar allHeatEntries (para aparecer na bateria)
          setAllHeatEntries(prev => {
            const newMap = new Map(prev);
            const currentEntries = newMap.get(targetHeatId) || [];
            newMap.set(targetHeatId, [...currentEntries, newEntry]);
            return newMap;
          });

          // 3. Atualizar heatEntries atual (se aplicável)
          setHeatEntries(prev => {
            // Verificar se a bateria atual está entre as carregadas
            const exists = heats.some(h => h.id === targetHeatId);
            if (exists) return [...prev, newEntry];
            return prev;
          });
        }

        // Recarregar em background para garantir consistência
        loadHeats().catch(console.error);
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

      // Se estiver movendo para bateria diferente, verificar capacidade e categoria
      if (activeHeatId !== overHeatId) {
        const targetHeat = heats.find(h => h.id === overHeatId);
        if (!targetHeat) {
          setActiveId(null);
          return;
        }

        const maxAthletes = targetHeat.athletes_per_heat || heatCapacities.get(overHeatId) || athletesPerHeat;

        // Se a bateria de destino já está cheia (sem contar o atleta que está sendo movido da origem)
        if (overHeatEntries.length >= maxAthletes) {
          toast.error(`Bateria já está cheia (${maxAthletes}/${maxAthletes})`);
          setActiveId(null);
          return;
        }

        // VALIDAÇÃO DE CATEGORIA: Buscar categoria do atleta e da bateria de destino
        if (activeEntry.registration_id) {
          const { data: registration, error: regError } = await supabase
            .from('registrations')
            .select('category_id')
            .eq('id', activeEntry.registration_id)
            .single();

          if (regError || !registration) {
            toast.error("Erro ao verificar categoria do atleta");
            setActiveId(null);
            return;
          }

          // Se as categorias são diferentes, mostrar confirmação
          if (registration.category_id !== targetHeat.category_id) {
            const athleteCategory = categories.find(c => c.id === registration.category_id);
            const heatCategory = categories.find(c => c.id === targetHeat.category_id);

            // Criar promise para aguardar confirmação do usuário
            const confirmed = await new Promise<boolean>((resolve) => {
              setCategoryMismatchDialog({
                show: true,
                athleteCategoryName: athleteCategory?.name || 'Desconhecida',
                heatCategoryName: heatCategory?.name || 'Desconhecida',
                onConfirm: () => {
                  setCategoryMismatchDialog(null);
                  resolve(true);
                },
                onCancel: () => {
                  setCategoryMismatchDialog(null);
                  resolve(false);
                }
              });
            });

            if (!confirmed) {
              setActiveId(null);
              return;
            }
          }
        }

        // VALIDAÇÃO DE CONFLITO DE HORÁRIO: Verificar se atleta já está em outra bateria no mesmo horário
        if (targetHeat.scheduled_time && activeEntry.registration_id) {
          const { data: existingEntries, error: entriesError } = await supabase
            .from('heat_entries')
            .select('heat_id, heats(scheduled_time)')
            .eq('registration_id', activeEntry.registration_id);

          if (entriesError) {
            toast.error("Erro ao verificar conflitos de horário");
            setActiveId(null);
            return;
          }

          if (existingEntries && existingEntries.length > 0) {
            const targetTime = new Date(targetHeat.scheduled_time);

            for (const entry of existingEntries) {
              // Excluir a bateria de origem (pois o atleta está sendo movido DE lá)
              if (entry.heat_id === activeHeatId) continue;

              if (entry.heats && entry.heats.scheduled_time) {
                const existingTime = new Date(entry.heats.scheduled_time);
                const diffMinutes = Math.abs(targetTime.getTime() - existingTime.getTime()) / 60000;

                if (diffMinutes < 15) {
                  toast.error("Atleta já está em outra bateria neste horário.");
                  setActiveId(null);
                  return;
                }
              }
            }
          }
        }
      }

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

      // Verificar capacidade máxima da bateria de destino
      const targetHeat = heats.find(h => h.id === overHeatId);
      if (!targetHeat) {
        setActiveId(null);
        return;
      }

      const activeHeatEntries = newEntriesMap.get(activeHeatId) || [];
      const overHeatEntries = newEntriesMap.get(overHeatId) || [];

      // Se estiver movendo para a mesma bateria, não precisa verificar capacidade (é apenas reordenação)
      if (activeHeatId !== overHeatId) {
        const maxAthletes = targetHeat.athletes_per_heat || heatCapacities.get(overHeatId) || athletesPerHeat;

        if (overHeatEntries.length >= maxAthletes) {
          toast.error(`Bateria já está cheia (${maxAthletes}/${maxAthletes})`);
          setActiveId(null);
          return;
        }

        // VALIDAÇÃO DE CATEGORIA: Buscar categoria do atleta e da bateria de destino
        if (activeEntry.registration_id) {
          const { data: registration, error: regError } = await supabase
            .from('registrations')
            .select('category_id')
            .eq('id', activeEntry.registration_id)
            .single();

          if (regError || !registration) {
            toast.error("Erro ao verificar categoria do atleta");
            setActiveId(null);
            return;
          }

          // Se as categorias são diferentes, mostrar confirmação
          if (registration.category_id !== targetHeat.category_id) {
            const athleteCategory = categories.find(c => c.id === registration.category_id);
            const heatCategory = categories.find(c => c.id === targetHeat.category_id);

            // Criar promise para aguardar confirmação do usuário
            const confirmed = await new Promise<boolean>((resolve) => {
              setCategoryMismatchDialog({
                show: true,
                athleteCategoryName: athleteCategory?.name || 'Desconhecida',
                heatCategoryName: heatCategory?.name || 'Desconhecida',
                onConfirm: () => {
                  setCategoryMismatchDialog(null);
                  resolve(true);
                },
                onCancel: () => {
                  setCategoryMismatchDialog(null);
                  resolve(false);
                }
              });
            });

            if (!confirmed) {
              setActiveId(null);
              return;
            }
          }
        }

        // VALIDAÇÃO DE CONFLITO DE HORÁRIO: Verificar se atleta já está em outra bateria no mesmo horário
        if (targetHeat.scheduled_time && activeEntry.registration_id) {
          const { data: existingEntries, error: entriesError } = await supabase
            .from('heat_entries')
            .select('heat_id, heats(scheduled_time)')
            .eq('registration_id', activeEntry.registration_id);

          if (entriesError) {
            toast.error("Erro ao verificar conflitos de horário");
            setActiveId(null);
            return;
          }

          if (existingEntries && existingEntries.length > 0) {
            const targetTime = new Date(targetHeat.scheduled_time);

            for (const entry of existingEntries) {
              // Excluir a bateria de origem (pois o atleta está sendo movido DE lá)
              if (entry.heat_id === activeHeatId) continue;

              if (entry.heats && entry.heats.scheduled_time) {
                const existingTime = new Date(entry.heats.scheduled_time);
                const diffMinutes = Math.abs(targetTime.getTime() - existingTime.getTime()) / 60000;

                if (diffMinutes < 15) {
                  toast.error("Atleta já está em outra bateria neste horário.");
                  setActiveId(null);
                  return;
                }
              }
            }
          }
        }
      }

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

      // Deletar todas as entries das baterias afetadas
      const { error: deleteError } = await supabase
        .from("heat_entries")
        .delete()
        .in("heat_id", affectedHeatIds);

      if (deleteError) {
        console.error('[DEBUG DRAG] Erro ao deletar entries:', deleteError);
        throw deleteError;
      }

      // Preparar entries para inserir
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

      // Verificar se há duplicatas antes de inserir
      const uniqueEntries = new Map<string, any>();
      allEntriesToInsert.forEach(entry => {
        const key = `${entry.heat_id}-${entry.registration_id}`;
        if (!uniqueEntries.has(key)) {
          uniqueEntries.set(key, entry);
        } else {
          console.warn('[DEBUG DRAG] Duplicata detectada:', entry);
        }
      });

      const entriesToInsert = Array.from(uniqueEntries.values());

      if (entriesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("heat_entries")
          .insert(entriesToInsert);

        if (insertError) {
          console.error('[DEBUG DRAG] Erro ao inserir entries:', insertError);
          throw insertError;
        }
      }

      toast.success("Baterias atualizadas!");
      await loadHeats();
    } catch (error: any) {
      console.error("Error saving edits:", error);
      toast.error("Erro ao salvar alterações");
      await loadHeats(); // Reverter para estado do banco
    } finally {
      setSavingEdits(false);
    }
  };

  function SidebarAthlete({ reg, index }: { reg: any; index: number }) {
    const leaderboard = calculateLeaderboard();
    const lbEntry = leaderboard.find(l => l.registrationId === reg.id);
    const name = reg.team_name || reg.athlete_name;

    // Buscar categoria do registro
    const participantCategory = reg?.category_id ? categories.find(c => c.id === reg.category_id) : null;
    const categoryName = participantCategory?.name || '';
    const fullName = categoryName ? `${name} - ${categoryName}` : name;

    // Se o atleta está sendo renderizado aqui, ele já passou pelo filtro de disponibilidade do WOD atual
    // Portanto, não precisamos verificar allChampionshipEntries globalmente para "esmaecer"
    // Ele deve aparecer sempre disponível (opacidade 1)

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `sidebar-athlete-${reg.id}`,
      // Removed disabled: isInHeat
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1, // Always 1 unless dragging
      boxShadow: isDragging ? '0 12px 24px rgba(0,0,0,0.35)' : 'none',
      scale: isDragging ? '1.05' : '1',
      zIndex: isDragging ? 1000 : 'auto',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 rounded border text-sm transition-all duration-200 ${isDragging
          ? 'bg-primary/20 border-primary border-2 shadow-2xl'
          : 'bg-background cursor-grab active:cursor-grabbing hover:bg-accent/50 hover:border-accent'
          }`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className={`w-3 h-3 flex-shrink-0 ${isDragging ? 'text-primary' : ''}`} />
        <span className="font-bold w-6">{index + 1}</span>
        <span className="flex-1 truncate">{fullName}</span>
        {lbEntry?.position && (
          <Badge variant="secondary" className="text-xs">{lbEntry.position}º</Badge>
        )}
      </div>
    );
  }

  function SortableHeatCard({ heat, children }: {
    heat: any;
    children: (listeners: any, attributes: any) => React.ReactNode;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `heat-card-${heat.id}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition,
      opacity: isDragging ? 0.9 : 1,
      zIndex: isDragging ? 999 : 1,
      boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.4)' : 'none',
      scale: isDragging ? '1.03' : '1',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`transition-all duration-200 ${isDragging ? 'ring-4 ring-primary ring-offset-4 shadow-2xl rotate-2' : 'hover:shadow-md'}`}
      >
        {children(listeners, attributes)}
      </div>
    );
  }

  function SortableTableRow({ heat, heatDisplayName, timeCap, scheduledTime, endTime, transitionTime }: {
    heat: any;
    heatDisplayName: string;
    timeCap: string;
    scheduledTime: string;
    endTime: string;
    transitionTime: number;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `heat-${heat.id}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow ref={setNodeRef} style={style}>
        <TableCell>
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </TableCell>
        <TableCell className="font-bold">{heat.heat_number}</TableCell>
        <TableCell className="font-medium">
          {heatDisplayName}
        </TableCell>
        <TableCell>{timeCap}</TableCell>
        <TableCell>{scheduledTime}</TableCell>
        <TableCell>{endTime}</TableCell>
        <TableCell>{transitionTime}min</TableCell>
      </TableRow>
    );
  }

  function HeatDropZone({ heatId, children }: { heatId: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
      id: `heat-dropzone-${heatId}`,
    });

    return (
      <div
        ref={setNodeRef}
        className={`min-h-[100px] rounded-lg border-2 border-dashed p-3 transition-all duration-300 relative ${isOver
          ? 'border-primary bg-primary/10 shadow-lg scale-[1.02] animate-pulse'
          : 'border-muted-foreground/20 bg-muted/5'
          }`}
      >
        {children}
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-primary/5 rounded-lg">
            <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-2xl font-semibold animate-bounce text-lg">
              ⬇️ Solte aqui!
            </div>
          </div>
        )}
      </div>
    );
  }

  function SortableParticipant({ entry, heatId, laneNumber }: { entry: any; heatId: string; laneNumber: number }) {
    const reg = registrations.find(r => r.id === entry.registration_id);
    const participantName = reg?.team_name || reg?.athlete_name || 'Aguardando';

    // Buscar categoria do registro
    const participantCategory = reg?.category_id ? categories.find(c => c.id === reg.category_id) : null;
    const categoryName = participantCategory?.name || '';
    const fullName = categoryName ? `${participantName} - ${categoryName}` : participantName;

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

    const handleRemoveClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      await handleRemoveFromHeat(entry.id, heatId);
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 rounded border ${isDragging ? 'bg-muted' : 'bg-background'} hover:bg-accent/50 transition-colors`}
      >
        <div {...attributes} {...listeners} className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-bold text-sm flex-shrink-0">{laneNumber}</span>
          <span className="text-sm truncate flex-1">{fullName}</span>
          {lbEntry && lbEntry.position && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {lbEntry.position}º
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemoveClick}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          title="Remover da bateria"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedChampionship) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Selecione um campeonato primeiro.</p>
          <Button onClick={() => navigate("/app")}>
            Ir para Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Ordenação determinística e estável para filteredHeats
  const filteredHeats = heats.filter(h => {
    // Se "all" estiver selecionado, não filtra por aquele critério
    const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
    const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;

    return categoryFilter && wodFilter;
  }).sort((a, b) => {
    // NOVA ORDENAÇÃO: Prioridade total para heat_number (Sequencial)
    // Se heat_number for igual (não deve acontecer), usa scheduled_time

    // 1) heat_number (Sequência visual principal)
    const heatNumDiff = a.heat_number - b.heat_number;
    if (heatNumDiff !== 0) return heatNumDiff;

    // 2) scheduled_time (Cronológico)
    if (a.scheduled_time && b.scheduled_time) {
      const timeDiff = new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
      if (timeDiff !== 0) return timeDiff;
    } else if (a.scheduled_time && !b.scheduled_time) {
      return -1;
    } else if (!a.scheduled_time && b.scheduled_time) {
      return 1;
    }

    // 3) wod_id e category_id como desempate final
    const wodCompare = a.wod_id.localeCompare(b.wod_id);
    if (wodCompare !== 0) return wodCompare;

    return a.id.localeCompare(b.id);
  });

  // Filtrar competidores por busca
  // IMPORTANTE: Mostrar apenas atletas que NÃO estão em nenhuma bateria
  // Se selectedCategory estiver vazio, tratar como 'all' para mostrar todos
  const effectiveCategory = selectedCategory || 'all';

  const filteredCompetitors = registrations.filter(reg => {
    // DEBUG: Log para verificar se está filtrando corretamente
    const name = reg.team_name || reg.athlete_name || '';

    // Verificar se o atleta já está em alguma bateria (em TODAS as baterias do campeonato)
    // CORREÇÃO: Verificar se já está em bateria DO WOD SELECIONADO (se houver seleção de WOD)
    // Se não houver seleção de WOD (all), "Available" mostra quem não está em NENHUMA bateria
    const isInHeat = allChampionshipEntries.some(e => {
      if (e.registration_id !== reg.id) return false;

      // Se temos um WOD selecionado, só esconde se o atleta estiver em bateria DESTE WOD
      if (selectedWOD && selectedWOD !== 'all') {
        const entryHeatWodId = heatWodMap.get(e.heat_id);
        // Se não achou o wodId da bateria, assume conflito por segurança (ou ignora?)
        // Se entryHeatWodId for igual ao selectedWod, então está ocupado NESTE WOD
        return entryHeatWodId === selectedWOD;
      }

      // Se NÃO temos WOD selecionado (vendo todos), esconde se estiver em qualquer bateria
      return true;
    });

    if (name.toLowerCase().includes('fé') || name.toLowerCase().includes('alpha')) {
    }

    // Se está em bateria, não mostrar na lista lateral (só mostra os disponíveis)
    if (isInHeat) return false;

    // Aplicar filtro de categoria
    if (effectiveCategory !== 'all') {
      // Se categoria específica selecionada, filtrar por categoria
      if (reg.category_id !== effectiveCategory) return false;
    }
    // Se "all" estiver selecionado (ou vazio), não filtra por categoria (mostra todos os disponíveis)

    // Aplicar filtro de busca por nome (se houver busca)
    if (searchTerm && searchTerm.trim() !== '') {
      const searchName = (reg.team_name || reg.athlete_name || '').toLowerCase();
      if (!searchName.includes(searchTerm.toLowerCase())) return false;
    }

    return true;
  });

  // Ordenar competidores: 
  // 1. Ordem da categoria (Menor order_index primeiro: Iniciante -> Elite)
  // 2. Data de inscrição DECRESCENTE (Novos primeiro). 
  //    POR QUE? Porque a geração de baterias pega do FINAL da lista para colocar nas últimas baterias.
  //    Se Novatos (Novos) ficarem no TOPO da lista e Elite (Antigos) no FINAL,
  //    a geração pegará os Antigos (Elite) para as ÚLTIMAS baterias (Vantagem).
  //    Não, espere.
  //    Geração pega ordenado: Pior -> Melhor.
  //    Distribuição nas baterias:
  //      Bateria 1 (Piores): Pega do início da lista ordenada?
  //      Não, a lógica de geração inverteu o array `sortedParticipants` antes de distribuir.
  //      `orderedParticipants = [...sortedParticipants].reverse()`
  //      `sortedParticipants` estava: Menor order_index (Pior/Novo) -> Maior order_index (Melhor/Antigo).
  //      `orderedParticipants` ficou: Melhor/Antigo -> Pior/Novo.
  //      Loop do `updateHeats`:
  //        `reverseStartIdx = total - (i+1)*cap` (Pega do final de orderedParticipants = Pior/Novo)
  //        `heatParticipants` recebe o slice do final.
  //      Ou seja, Heat 1 recebe os do FINAL de `orderedParticipants`.
  //      Final de `orderedParticipants` = Pior/Novo.
  //      Heat Last recebe os do INÍCIO de `orderedParticipants`.
  //      Início de `orderedParticipants` = Melhor/Antigo.
  //
  //    VISUALMENTE na lista lateral:
  //    O usuário arrasta o topo para Heat 1?
  //    Geralmente sim.
  //    Então o TOPO da lista deve ser "Quem vai para Heat 1" (Piores/Novos).
  //    O FINAL da lista deve ser "Quem vai para Heat Last" (Melhores/Antigos).
  //
  //    Então a ordenação da lista deve ser:
  //    1. Categoria: 1 (Iniciante) -> 5 (Elite). (Isso agrupa por categoria).
  //    2. Dentro da categoria: Piores (Novos) -> Melhores (Antigos).
  //       Novos têm `created_at` MAIOR (mais recente).
  //       Antigos têm `created_at` MENOR (mais antigo).
  //       Então queremos: `created_at` DESC (Recente -> Antigo).

  const sortedCompetitors = filteredCompetitors.sort((a, b) => {
    // 1. Por Categoria (usando order_index)
    const catA = categories.find(c => c.id === a.category_id);
    const catB = categories.find(c => c.id === b.category_id);
    const orderA = catA?.order_index ?? 999;
    const orderB = catB?.order_index ?? 999;

    if (orderA !== orderB) return orderA - orderB;

    // 2. Por Data de Inscrição (Decrescente: Mais novos/Piores primeiro)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar: Competidores */}
              <Card className="p-4 lg:col-span-1">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Competidores</Label>
                    <p className="text-xs text-muted-foreground mb-3">Categoria e WOD</p>

                    <Select
                      value={selectedCategory || 'all'}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                      }}
                    >
                      <SelectTrigger className="mb-2">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Categorias</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedWOD} onValueChange={setSelectedWOD}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os Eventos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Eventos</SelectItem>
                        {wods.filter(w => w.is_published).map(wod => (
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
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-40">
                      <Label htmlFor="athletesPerHeat">Raias *</Label>
                      <Input
                        id="athletesPerHeat"
                        type="number"
                        min="1"
                        max="20"
                        value={athletesPerHeat}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAthletesPerHeat(val === '' ? '' : parseInt(val));
                        }}
                        onBlur={async () => {
                          if (selectedChampionship && athletesPerHeat && athletesPerHeat > 0) {
                            await supabase
                              .from("championships")
                              .update({ default_athletes_per_heat: athletesPerHeat })
                              .eq("id", selectedChampionship.id);
                          }
                        }}
                        placeholder="Qtd de raias"
                      />
                    </div>
                    <div className="flex-1 flex flex-row gap-2">
                      <Button
                        onClick={handleCreateInitialHeats}
                        className="flex-1"
                        disabled={generating}
                        variant="default"
                      >
                        {generating ? 'Criando...' : 'Gerar Baterias Geral'}
                      </Button>
                      <Button
                        onClick={handleGenerateByCategoryAndWod}
                        className="flex-1"
                        disabled={generating || !selectedCategory || !selectedWOD}
                        variant="outline"
                      >
                        {generating ? 'Gerando...' : 'Gerar Baterias'}
                      </Button>
                      <Button
                        onClick={handleUpdateHeats}
                        className="flex-1"
                        disabled={generating}
                        variant="secondary"
                      >
                        {generating ? 'Atualizando...' : 'Atualizar Baterias'}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Controles de gerenciamento de baterias - SEMPRE VISÍVEL */}
                <Card className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {filteredHeats.length > 0 && (
                      <>
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
                      </>
                    )}

                    <div className="flex gap-2 ml-auto">
                      {filteredHeats.length > 0 && (
                        <>
                          <Button
                            onClick={() => setShowExportDialog(true)}
                            variant="default"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar PDF
                          </Button>
                          <Button
                            onClick={handleRemoveSelectedHeats}
                            variant="destructive"
                            size="sm"
                            disabled={selectedHeats.size === 0}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir Selecionadas
                          </Button>
                        </>
                      )}

                      <Button
                        onClick={handleIntercalateHeats}
                        variant="outline"
                        size="sm"
                        disabled={generating || filteredHeats.length === 0}
                      >
                        Intercalar
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
                      Clique em "Gerar Baterias" para gerar todas ou use o botão flutuante no canto inferior direito para criar manualmente
                    </p>
                  </Card>
                ) : (
                  <SortableContext
                    items={filteredHeats.map(h => `heat-card-${h.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {filteredHeats.map(heat => {
                        const currentEntries = allHeatEntries.get(heat.id) || [];
                        // Usar sempre o valor do banco primeiro, depois heatCapacities, depois padrão
                        const maxAthletes = heat.athletes_per_heat || heatCapacities.get(heat.id) || athletesPerHeat;
                        const scheduledTime = heat.scheduled_time
                          ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                          : (championshipDays[0]?.start_time || "08:00");

                        const wodInfo = wods.find(w => w.id === heat.wod_id);

                        // Buscar variação específica da categoria, se existir
                        const variationKey = `${heat.wod_id}-${heat.category_id}`;
                        const variation = wodVariations.get(variationKey);

                        // Priorizar time_cap da variação, depois do WOD global
                        let timeCap = variation?.time_cap || wodInfo?.time_cap || '10:00';

                        // Formatar para mm:ss se vier apenas mm
                        if (!timeCap.includes(':')) {
                          timeCap = `${timeCap.padStart(2, '0')}:00`;
                        } else {
                          const [mm, ss] = timeCap.split(':');
                          timeCap = `${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
                        }

                        // Calcular horário de término
                        const timecapMinutes = timeCap.includes(':')
                          ? parseInt(timeCap.split(':')[0]) + (parseInt(timeCap.split(':')[1]) / 60)
                          : parseInt(timeCap) || 10;

                        const startDate = heat.scheduled_time ? new Date(heat.scheduled_time) : new Date();
                        const endDate = new Date(startDate.getTime() + timecapMinutes * 60000);
                        const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

                        // Nome da bateria (custom ou padrão)
                        const categoryInfo = categories.find(c => c.id === heat.category_id);
                        const heatDisplayName = heat.custom_name ||
                          (categoryInfo && wodInfo ? `${categoryInfo.name} - ${wodInfo.name}` : `BATERIA ${heat.heat_number}`);

                        const allItemIds = currentEntries.map(e => `heat-${heat.id}-entry-${e.id}`);
                        const isExpanded = expandedHeats.has(heat.id);

                        return (
                          <SortableHeatCard
                            key={heat.id}
                            heat={heat}
                          >
                            {(listeners, attributes) => (
                              <Card className="p-4 relative">
                                <div
                                  {...attributes}
                                  {...listeners}
                                  className="absolute left-2 top-4 z-20 cursor-grab active:cursor-grabbing p-2 hover:bg-accent/50 rounded transition-colors"
                                  title="Arrastar para reorganizar"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                                </div>
                                <Collapsible open={isExpanded} onOpenChange={() => toggleHeatExpand(heat.id)}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1 pl-8">
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
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                          {heatDisplayName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {scheduledTime} - {endTime} | TimeCap: {timeCap}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                        onClick={() => handleOpenEditHeat(heat)}
                                        className="h-8 w-8 p-0"
                                        title="Editar bateria"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveHeat(heat.id)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        title="Remover bateria"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <CollapsibleContent>
                                    <HeatDropZone heatId={heat.id}>
                                      <SortableContext items={allItemIds} strategy={rectSortingStrategy}>
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
                            )}
                          </SortableHeatCard>
                        );
                      })}
                    </div>
                  </SortableContext>
                )}
              </div>
            </div>
          </DndContext>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-6">
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="globalTransition">Intervalo Entre Baterias</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="globalTransition"
                      type="text"
                      placeholder="00:00"
                      maxLength={5}
                      value={transitionTimeStr}
                      onChange={(e) => handleTimeInputChange(e.target.value, setTransitionTimeStr, setAppliedTransition, setSuccessTransition)}
                      className=""
                    />
                    <Clock className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-[#D71C1D] pointer-events-none" />
                  </div>
                  <Button
                    onClick={() => handleApplyTransition()}
                    size="sm"
                    disabled={successTransition}
                    className={`text-white ${successTransition ? "bg-[#D71C1D] hover:bg-[#D71C1D]/90" : "bg-[#D71C1D] hover:bg-[#D71C1D]/90"}`}
                  >
                    {successTransition ? "APLICADO" : "APLICAR"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo entre uma bateria e outra do mesmo WOD
                </p>
              </div>

              <div>
                <Label htmlFor="categoryInterval">Intervalo Entre Categorias</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="categoryInterval"
                      type="text"
                      placeholder="00:00"
                      maxLength={5}
                      value={categoryIntervalStr}
                      onChange={(e) => handleTimeInputChange(e.target.value, setCategoryIntervalStr, setAppliedCategoryInterval, setSuccessCategoryInterval)}
                      className=""
                    />
                    <Clock className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-[#D71C1D] pointer-events-none" />
                  </div>
                  <Button
                    onClick={() => handleApplyCategoryInterval()}
                    size="sm"
                    disabled={successCategoryInterval}
                    className={`text-white ${successCategoryInterval ? "bg-[#D71C1D] hover:bg-[#D71C1D]/90" : "bg-[#D71C1D] hover:bg-[#D71C1D]/90"}`}
                  >
                    {successCategoryInterval ? "APLICADO" : "APLICAR"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo entre categorias diferentes no mesmo WOD
                </p>
              </div>

              <div>
                <Label htmlFor="wodInterval">Intervalo Entre Provas</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="wodInterval"
                      type="text"
                      placeholder="00:00"
                      maxLength={5}
                      value={wodIntervalStr}
                      onChange={(e) => handleTimeInputChange(e.target.value, setWodIntervalStr, setAppliedWodInterval, setSuccessWodInterval)}
                      className=""
                    />
                    <Clock className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-[#D71C1D] pointer-events-none" />
                  </div>
                  <Button
                    onClick={() => handleApplyWodInterval()}
                    size="sm"
                    disabled={successWodInterval}
                    className={`text-white ${successWodInterval ? "bg-[#D71C1D] hover:bg-[#D71C1D]/90" : "bg-[#D71C1D] hover:bg-[#D71C1D]/90"}`}
                  >
                    {successWodInterval ? "APLICADO" : "APLICAR"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo entre o fim de um WOD e início do próximo
                </p>
              </div>
            </div>
          </Card>

          <ScheduleSettings
            championshipId={selectedChampionship?.id || ''}
            days={championshipDays}
            onUpdate={async () => {
              await calculateAllHeatsSchedule();
              await loadHeats();
            }}
          />

          {/* Dialog de Edição de Heat (Move it here or keep inside) */}

          <Card>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={async (event: DragEndEvent) => {
                const { active, over } = event;

                if (!over || active.id === over.id) return;

                const activeId = active.id.toString();
                const overId = over.id.toString();

                // Verificar se são IDs de baterias (formato: heat-{id})
                if (activeId.startsWith('heat-') && overId.startsWith('heat-')) {
                  const activeHeatId = activeId.replace('heat-', '');
                  const overHeatId = overId.replace('heat-', '');

                  // Buscar TODAS as baterias ordenadas por heat_number
                  // Usar estado local se possível para otimismo, mas aqui buscamos do banco atualizado
                  // O ideal é usar filteredHeats se estiver tudo carregado

                  // ATUALIZAÇÃO OTIMISTA
                  setHeats(prevHeats => {
                    const sorted = [...prevHeats].sort((a, b) => a.heat_number - b.heat_number);
                    const activeIdx = sorted.findIndex(h => h.id === activeHeatId);
                    const overIdx = sorted.findIndex(h => h.id === overHeatId);

                    if (activeIdx === -1 || overIdx === -1) return prevHeats;

                    const reordered = arrayMove(sorted, activeIdx, overIdx);

                    return reordered.map((heat, idx) => ({
                      ...heat,
                      heat_number: idx + 1
                    }));
                  });

                  // Lógica de persistência
                  const { data: allHeatsOrdered } = await supabase
                    .from("heats")
                    .select("*")
                    .eq("championship_id", selectedChampionship?.id)
                    .order("heat_number");

                  if (!allHeatsOrdered) return;

                  const activeIndex = allHeatsOrdered.findIndex(h => h.id === activeHeatId);
                  const overIndex = allHeatsOrdered.findIndex(h => h.id === overHeatId);

                  if (activeIndex === -1 || overIndex === -1) return;

                  // Reordenar array original
                  const newHeats = arrayMove(allHeatsOrdered, activeIndex, overIndex);

                  // Toast IMEDIATO
                  toast.success("🔄 Reorganizando horários...", {
                    description: "Salvando nova ordem",
                    duration: 1500,
                  });

                  // Atualizar heat_number no banco para TODAS as baterias
                  try {
                    const updatePromises = newHeats.map((heat, i) =>
                      supabase.from("heats").update({ heat_number: i + 1 }).eq("id", heat.id)
                    );

                    await Promise.all(updatePromises);

                    // --- LOGICA TIME SLOT TAKEOVER ---
                    // A bateria movida (activeHeatId) assume o horário da que estava lá (overHeatId)
                    // Mas cuidado: overHeatId é o ID da bateria que estava na posição visual DE DESTINO.
                    // Na lista original (allHeatsOrdered), overIndex é a posição de destino.

                    const originalTargetHeat = allHeatsOrdered[overIndex]; // A que estava lá
                    if (originalTargetHeat) {
                      const targetTime = originalTargetHeat.scheduled_time;
                      await supabase
                        .from('heats')
                        .update({ scheduled_time: targetTime })
                        .eq('id', activeHeatId);

                      await recalculateScheduleAfterHeat(activeHeatId, activeHeatId);
                    }

                    await loadHeats();
                    toast.success("Horários atualizados!");
                  } catch (error) {
                    console.error("Erro ao reordenar baterias:", error);
                    toast.error("Erro ao reorganizar baterias");
                    await loadHeats(); // Reverter
                  }
                }
              }}
            >
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
                    <SortableContext items={filteredHeats.map(h => `heat-${h.id}`)} strategy={verticalListSortingStrategy}>
                      {filteredHeats.map(heat => {
                        const wodInfo = wods.find(w => w.id === heat.wod_id);
                        const categoryInfo = categories.find(c => c.id === heat.category_id);

                        // Buscar variação específica da categoria, se existir
                        const variationKey = `${heat.wod_id}-${heat.category_id}`;
                        const variation = wodVariations.get(variationKey);

                        // Priorizar time_cap da variação, depois do WOD global
                        let timeCap = variation?.time_cap || wodInfo?.time_cap || '10:00';

                        // Formatar para mm:ss
                        if (!timeCap.includes(':')) {
                          timeCap = `${timeCap.padStart(2, '0')}:00`;
                        } else {
                          const [mm, ss] = timeCap.split(':');
                          timeCap = `${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
                        }

                        // Calcular horário de término
                        const timecapMinutes = timeCap.includes(':')
                          ? parseInt(timeCap.split(':')[0]) + (parseInt(timeCap.split(':')[1]) / 60)
                          : parseInt(timeCap) || 10;

                        const startDate = heat.scheduled_time ? new Date(heat.scheduled_time) : new Date();
                        const endDate = new Date(startDate.getTime() + timecapMinutes * 60000);

                        const scheduledTime = heat.scheduled_time
                          ? new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                          : startTime;
                        const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

                        // Nome da bateria (custom ou padrão)
                        const heatDisplayName = heat.custom_name ||
                          (categoryInfo && wodInfo ? `${categoryInfo.name} - ${wodInfo.name}` : `BATERIA ${heat.heat_number}`);

                        return (
                          <SortableTableRow key={heat.id} heat={heat} heatDisplayName={heatDisplayName} timeCap={timeCap} scheduledTime={scheduledTime} endTime={endTime} transitionTime={transitionTime} />
                        );
                      })}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição de Bateria */}
      <Dialog open={!!editingHeat} onOpenChange={(open) => !open && setEditingHeat(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Bateria #{editingHeat?.heat_number}</DialogTitle>
            <DialogDescription>
              Edite os detalhes da bateria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-custom-name">Nome da Bateria</Label>
              <Input
                id="edit-custom-name"
                type="text"
                placeholder="Ex: INICIANTE FEMININO - EVENTO 1: IZABEL"
                value={editHeatData.custom_name}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  custom_name: e.target.value
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ideal para baterias mistas ou com nomes personalizados
              </p>
            </div>

            <div>
              <Label htmlFor="edit-athletes-per-heat">Número de Raias</Label>
              <Input
                id="edit-athletes-per-heat"
                type="number"
                min="1"
                value={editHeatData.athletes_per_heat}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  athletes_per_heat: parseInt(e.target.value) || 1
                }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-heat-number">Número da Bateria</Label>
              <Input
                id="edit-heat-number"
                type="number"
                min="1"
                value={editHeatData.heat_number}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  heat_number: parseInt(e.target.value) || 0
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                As baterias seguintes serão renumeradas automaticamente (26, 27, 28...)
              </p>
            </div>

            <div>
              <Label htmlFor="edit-scheduled-time">Horário de Início</Label>
              <Input
                id="edit-scheduled-time"
                type="time"
                value={editHeatData.scheduled_time}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  scheduled_time: e.target.value
                }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-time-cap">TimeCap</Label>
              <Input
                id="edit-time-cap"
                type="text"
                placeholder="10:00"
                value={editHeatData.time_cap}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  time_cap: e.target.value
                }))}
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                TimeCap é definido no WOD
              </p>
            </div>

            {editingHeat && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Categoria:</strong> {categories.find(c => c.id === editingHeat.category_id)?.name || 'Múltiplas'}</p>
                <p className="text-sm"><strong>WOD:</strong> {wods.find(w => w.id === editingHeat.wod_id)?.name || 'Múltiplos'}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHeat(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditHeat}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação de Bateria */}
      <Dialog open={isCreatingHeat} onOpenChange={(open) => !open && setIsCreatingHeat(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Bateria</DialogTitle>
            <DialogDescription>
              Configure os detalhes da nova bateria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="create-category">Categoria *</Label>
              <Select
                value={editHeatData.category_id}
                onValueChange={(value) => setEditHeatData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger id="create-category">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="create-wod">WOD/Evento *</Label>
              <Select
                value={editHeatData.wod_id}
                onValueChange={(value) => {
                  const selectedWod = wods.find(w => w.id === value);

                  setEditHeatData(prev => ({
                    ...prev,
                    wod_id: value,
                    time_cap: selectedWod?.time_cap || '10:00'
                  }));
                }}
              >
                <SelectTrigger id="create-wod">
                  <SelectValue placeholder="Selecione o WOD" />
                </SelectTrigger>
                <SelectContent>
                  {wods.map(wod => (
                    <SelectItem key={wod.id} value={wod.id}>{wod.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="create-custom-name">Nome da Bateria (opcional)</Label>
              <Input
                id="create-custom-name"
                type="text"
                placeholder="Ex: INICIANTE FEMININO - EVENTO 1: IZABEL"
                value={editHeatData.custom_name}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  custom_name: e.target.value
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para usar o nome padrão (Categoria - WOD)
              </p>
            </div>

            <div>
              <Label htmlFor="create-athletes-per-heat">Número de Raias</Label>
              <Input
                id="create-athletes-per-heat"
                type="number"
                min="1"
                value={editHeatData.athletes_per_heat}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  athletes_per_heat: parseInt(e.target.value) || 1
                }))}
              />
            </div>

            <div>
              <Label htmlFor="create-scheduled-time">Horário de Início</Label>
              <Input
                id="create-scheduled-time"
                type="time"
                value={editHeatData.scheduled_time}
                onChange={(e) => setEditHeatData(prev => ({
                  ...prev,
                  scheduled_time: e.target.value
                }))}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm"><strong>TimeCap:</strong> {editHeatData.time_cap}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Definido automaticamente pelo WOD selecionado
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingHeat(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateHeat} disabled={!editHeatData.category_id || !editHeatData.wod_id}>
              Criar Bateria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Dialog de Exportação de PDF */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Baterias em PDF</DialogTitle>
            <DialogDescription>
              Selecione qual dia deseja exportar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="export-day">Dia do Campeonato</Label>
              <Select
                value={selectedDayForExport}
                onValueChange={setSelectedDayForExport}
              >
                <SelectTrigger id="export-day">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Dias</SelectItem>
                  {championshipDays.map(day => (
                    <SelectItem key={day.id} value={day.day_number.toString()}>
                      Dia {day.day_number} - {new Date(day.date).toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Formato:</strong> HTML (pronto para impressão em PDF)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Após baixar, abra o arquivo no navegador e pressione Ctrl+P para salvar como PDF
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Categoria Diferente */}
      <Dialog open={categoryMismatchDialog?.show || false} onOpenChange={(open) => !open && categoryMismatchDialog?.onCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atenção: Categorias Diferentes</DialogTitle>
            <DialogDescription>
              Este atleta pertence a uma categoria diferente da bateria de destino.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Categoria do Atleta:</strong> {categoryMismatchDialog?.athleteCategoryName}
              </p>
              <p className="text-sm">
                <strong>Categoria da Bateria:</strong> {categoryMismatchDialog?.heatCategoryName}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Deseja mover este atleta mesmo assim?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={categoryMismatchDialog?.onCancel}>
              Cancelar
            </Button>
            <Button onClick={categoryMismatchDialog?.onConfirm}>
              Confirmar Movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Conflito de Edição Concorrente (Optimistic Locking) */}
      <Dialog open={conflictDialog?.show || false} onOpenChange={(open) => !open && setConflictDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>⚠️ Bateria Editada</DialogTitle>
            <DialogDescription>
              Esta bateria foi editada por outro usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              As alterações que você está tentando fazer não puderam ser salvas porque outro usuário modificou esta bateria recentemente.
            </p>
            <p className="text-sm font-medium">
              Deseja recarregar o cronograma para ver as alterações mais recentes?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={conflictDialog?.onReload}>
              Recarregar Cronograma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <button
        onClick={handleOpenCreateHeat}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D71C1D] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50"
        aria-label="Adicionar bateria"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
