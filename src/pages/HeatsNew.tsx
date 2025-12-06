import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Clock, Loader2, GripVertical, Calendar, Plus, Minus, ChevronDown, ChevronUp, Trash2, Edit, Settings, FileDown } from 'lucide-react';
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
  const [athletesPerHeat, setAthletesPerHeat] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('');
  const [transitionTime, setTransitionTime] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allHeatEntries, setAllHeatEntries] = useState<Map<string, any[]>>(new Map());
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
    athletes_per_heat: 4,
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
    const filteredHeats = heats.filter(h => {
      // Se "all" estiver selecionado, não filtra por aquele critério
      const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
      const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;
      
      return categoryFilter && wodFilter;
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
      const [catsResult, wodsResult, regsResult, daysResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", selectedChampionship.id).order("order_index"),
        supabase.from("wods").select("*").eq("championship_id", selectedChampionship.id).order("order_num"),
        supabase.from("registrations").select("*").eq("championship_id", selectedChampionship.id).eq("status", "approved").order("order_index", { ascending: true, nullsLast: true }).order("created_at", { ascending: true }),
        supabase.from("championship_days").select("*").eq("championship_id", selectedChampionship.id).order("day_number"),
      ]);

      if (catsResult.error) throw catsResult.error;
      if (wodsResult.error) throw wodsResult.error;
      if (regsResult.error) throw regsResult.error;

      setCategories(catsResult.data || []);
      setWODs(wodsResult.data || []);
      setRegistrations(regsResult.data || []);
      setChampionshipDays(daysResult.data || []);
      
      // Carregar configurações de intervalos do campeonato
      const { data: champConfig } = await supabase
        .from("championships")
        .select("transition_time_minutes, category_interval_minutes, wod_interval_minutes")
        .eq("id", selectedChampionship.id)
        .single();
      
      // Carregar valores salvos ou usar 0 como padrão
      if (champConfig) {
        setTransitionTime(champConfig.transition_time_minutes || 0);
        setCategoryIntervalMinutes(champConfig.category_interval_minutes || 0);
        setWodIntervalMinutes(champConfig.wod_interval_minutes || 0);
      } else {
        // Se não houver configuração, tentar carregar do primeiro dia (compatibilidade)
        if (daysResult.data && daysResult.data.length > 0) {
          const firstDay = daysResult.data[0];
          setWodIntervalMinutes(firstDay.wod_interval_minutes || 0);
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

      const { data: heatsData, error: heatsError } = await query.order("heat_number");

      if (heatsError) throw heatsError;

      setHeats(heatsData || []);

      // SEMPRE carregar TODAS as entries do campeonato (para verificar disponibilidade)
      // Primeiro buscar todas as baterias do campeonato
      const { data: allChampionshipHeats, error: allHeatsError } = await supabase
        .from("heats")
        .select("id")
        .eq("championship_id", selectedChampionship.id);

      if (allHeatsError) {
        console.error("Error loading all championship heats:", allHeatsError);
        setAllChampionshipEntries([]);
      } else if (allChampionshipHeats && allChampionshipHeats.length > 0) {
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

    if (!startTime) {
      toast.error("Defina a hora de início");
      return;
    }

    setGenerating(true);
    try {
      // Determinar quais categorias e WODs processar baseado nos filtros
      const categoriesToProcess = selectedCategory && selectedCategory !== 'all' 
        ? categories.filter(c => c.id === selectedCategory)
        : categories;
      
      const wodsToProcess = selectedWOD && selectedWOD !== 'all'
        ? wods.filter(w => w.id === selectedWOD)
        : wods;

      if (categoriesToProcess.length === 0 || wodsToProcess.length === 0) {
        toast.error("Nenhuma categoria ou WOD selecionado");
        setGenerating(false);
        return;
      }

      console.log("🏁 Criando baterias do zero...");

      // Ordenar categorias e WODs
      const sortedCategories = [...categoriesToProcess].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const sortedWods = [...wodsToProcess].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // Hora de início base
      const [hours, mins] = startTime.split(':');
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
            console.log(`⏭️ Pulando ${category.name} - ${wod.name}: já existem ${existingHeatsForCategoryWod.length} baterias`);
            continue; // Não criar duplicatas
          }

          // Buscar atletas desta categoria
          const categoryRegs = registrations.filter(r => r.category_id === category.id);
          
          if (categoryRegs.length === 0) {
            console.log(`⚠️ Nenhum atleta em ${category.name}`);
            continue;
          }

          // Calcular quantas baterias são necessárias
          const numHeatsNeeded = Math.ceil(categoryRegs.length / athletesPerHeat);
          
          console.log(`📝 Criando ${numHeatsNeeded} baterias para ${category.name} - ${wod.name}`);

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

    if (categories.length === 0 || wods.length === 0) {
      toast.error("É necessário ter categorias e WODs cadastrados");
      return;
    }

    setGenerating(true);
    try {
      // Determinar quais categorias e WODs processar baseado nos filtros
      const categoriesToProcess = selectedCategory && selectedCategory !== 'all' 
        ? categories.filter(c => c.id === selectedCategory)
        : categories;
      
      const wodsToProcess = selectedWOD && selectedWOD !== 'all'
        ? wods.filter(w => w.id === selectedWOD)
        : wods;

      if (categoriesToProcess.length === 0 || wodsToProcess.length === 0) {
        toast.error("Nenhuma categoria ou WOD selecionado");
        setGenerating(false);
        return;
      }

      // Buscar TODOS os resultados PUBLICADOS do campeonato
      const { data: publishedResults } = await supabase
        .from("wod_results")
        .select("wod_id, category_id")
        .eq("is_published", true);

      // Criar set de WODs que JÁ TEM resultados publicados (não podem ser reorganizados)
      const wodsWithResults = new Set<string>();
      (publishedResults || []).forEach(result => {
        wodsWithResults.add(`${result.wod_id}_${result.category_id}`);
      });

      // Buscar TODAS as baterias existentes
      const { data: allHeats } = await supabase
        .from("heats")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (!allHeats || allHeats.length === 0) {
        toast.error("Nenhuma bateria encontrada. Use 'Gerar Baterias' para criar do zero.");
        setGenerating(false);
        return;
      }

      let totalHeatsUpdated = 0;
      let totalHeatsSkipped = 0;

      // Para cada categoria selecionada
      for (const category of categoriesToProcess) {
        // Para cada WOD selecionado
        for (const wod of wodsToProcess) {
          
          // VERIFICAR se este WOD + categoria JÁ TEM resultados publicados
          const hasPublishedResults = wodsWithResults.has(`${wod.id}_${category.id}`);
          
          if (hasPublishedResults) {
            console.log(`⏭️ Pulando ${category.name} + ${wod.name} - JÁ TEM RESULTADOS PUBLICADOS`);
            
            // Contar quantas baterias foram puladas
            const skippedHeats = allHeats.filter(h => h.category_id === category.id && h.wod_id === wod.id);
            totalHeatsSkipped += skippedHeats.length;
            continue; // NÃO REORGANIZAR!
          }
          
          // Buscar baterias EXISTENTES desta categoria + WOD
          let categoryWodHeats = allHeats
            .filter(h => h.category_id === category.id && h.wod_id === wod.id)
            .sort((a, b) => a.heat_number - b.heat_number);

          // Se não tem baterias, CRIAR novas baseado no ranking
          if (categoryWodHeats.length === 0) {
            console.log(`📝 Criando baterias para ${category.name} + ${wod.name} (não existiam)`);
            
            const categoryRegs = registrations.filter(r => r.category_id === category.id);
            
            if (categoryRegs.length === 0) {
              console.log(`⚠️ Nenhum atleta encontrado para ${category.name}`);
              continue;
            }

            // Ordenar atletas por order_index CRESCENTE (piores primeiro)
            const sortedRegs = categoryRegs.sort((a, b) => {
              if (a.order_index !== null && a.order_index !== undefined && 
                  b.order_index !== null && b.order_index !== undefined) {
                return a.order_index - b.order_index;
              }
              if (a.order_index !== null && a.order_index !== undefined) return -1;
              if (b.order_index !== null && b.order_index !== undefined) return 1;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            // INVERTER para colocar melhores nas últimas baterias
            const orderedRegs = [...sortedRegs].reverse();

            const numHeatsNeeded = Math.ceil(orderedRegs.length / athletesPerHeat);
            
            // Buscar próximo heat_number disponível
            const { data: maxHeatData } = await supabase
              .from("heats")
              .select("heat_number")
              .eq("championship_id", selectedChampionship.id)
              .order("heat_number", { ascending: false })
              .limit(1);

            let nextHeatNumber = (maxHeatData && maxHeatData.length > 0) ? maxHeatData[0].heat_number + 1 : 1;

            // Criar baterias - distribuir de TRÁS pra FRENTE (melhores nas últimas)
            // orderedRegs está: [melhor (order_index=11), ..., pior (order_index=1)]
            // Criamos baterias na ordem normal (1, 2, 3...) mas preenchemos de trás pra frente
            for (let i = 0; i < numHeatsNeeded; i++) {
              // Calcular índice reverso: última bateria recebe primeiros atletas (melhores)
              const reverseIdx = numHeatsNeeded - 1 - i;
              const startIdx = reverseIdx * athletesPerHeat;
              const endIdx = Math.min(startIdx + athletesPerHeat, orderedRegs.length);
              const heatParticipants = orderedRegs.slice(startIdx, endIdx);

              const { data: newHeat, error: heatError } = await supabase
                .from("heats")
                .insert({
                  championship_id: selectedChampionship.id,
                  category_id: category.id,
                  wod_id: wod.id,
                  heat_number: nextHeatNumber + i,
                  athletes_per_heat: athletesPerHeat,
                })
                .select()
                .single();

              if (heatError) {
                console.error(`Erro ao criar bateria:`, heatError);
                continue;
              }

              if (heatParticipants.length > 0) {
                const entries = heatParticipants.map((reg, idx) => ({
                  heat_id: newHeat.id,
                  registration_id: reg.id,
                  lane_number: idx + 1,
                }));

                await supabase.from("heat_entries").insert(entries);
              }
            }

            // Buscar as baterias recém criadas
            const { data: newHeats } = await supabase
              .from("heats")
              .select("*")
              .eq("category_id", category.id)
              .eq("wod_id", wod.id)
              .order("heat_number");

            categoryWodHeats = newHeats || [];
            console.log(`✅ ${categoryWodHeats.length} baterias criadas para ${category.name} + ${wod.name}`);
          }

          console.log(`🔄 Reorganizando ${categoryWodHeats.length} baterias de ${category.name} + ${wod.name}`);
          console.log(`🔍 Categoria ID: ${category.id}, Nome: ${category.name}`);

          // Buscar atletas desta categoria
          const categoryRegs = registrations.filter(r => r.category_id === category.id);
          
          // DEBUG ESPECÍFICO PARA INICIANTE FEMININO
          if (category.name.toUpperCase().includes('INICIANTE') && category.name.toUpperCase().includes('FEMININO')) {
            console.log(`🔍 DEBUG INICIANTE FEMININO:`);
            console.log(`  - Total de registrations no sistema: ${registrations.length}`);
            console.log(`  - Registrations com category_id = ${category.id}: ${categoryRegs.length}`);
            console.log(`  - Todos os category_id únicos:`, [...new Set(registrations.map(r => r.category_id))]);
            console.log(`  - Categorias disponíveis:`, categories.map(c => ({ id: c.id, name: c.name })));
            
            // Verificar se há registrations com category_id diferente mas nome similar
            const similarRegs = registrations.filter(r => {
              const regCategory = categories.find(c => c.id === r.category_id);
              return regCategory && regCategory.name.toUpperCase().includes('INICIANTE') && regCategory.name.toUpperCase().includes('FEMININO');
            });
            console.log(`  - Registrations de categorias similares: ${similarRegs.length}`);
            if (similarRegs.length > 0) {
              console.log(`  - IDs das categorias similares:`, [...new Set(similarRegs.map(r => r.category_id))]);
            }
          }
          
          if (categoryRegs.length === 0) {
            console.log(`⚠️ Nenhum atleta encontrado para ${category.name} (ID: ${category.id})`);
            console.log(`⚠️ Verificando se há registrations com category_id diferente...`);
            const allRegs = registrations.map(r => ({ 
              id: r.id, 
              category_id: r.category_id, 
              nome: r.team_name || r.athlete_name,
              categoria_nome: categories.find(c => c.id === r.category_id)?.name 
            }));
            console.log(`⚠️ Todas as registrations:`, allRegs);
            continue;
          }

          console.log(`📋 ${category.name}: ${categoryRegs.length} atletas encontrados`);
          console.log(`📋 order_index dos atletas:`, categoryRegs.map(r => ({ nome: r.team_name || r.athlete_name, order_index: r.order_index, category_id: r.category_id })));

          // Ordenar atletas por order_index
          // IMPORTANTE: order_index MAIOR = melhor colocado (1º lugar tem maior order_index)
          // Queremos: piores na primeira bateria, melhores na última
          // Então ordenamos CRESCENTE (menores order_index primeiro = piores)
          const sortedParticipants = categoryRegs.sort((a, b) => {
            if (a.order_index !== null && a.order_index !== undefined && 
                b.order_index !== null && b.order_index !== undefined) {
              return a.order_index - b.order_index; // CRESCENTE: piores primeiro
            }
            if (a.order_index !== null && a.order_index !== undefined) return -1;
            if (b.order_index !== null && b.order_index !== undefined) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          console.log(`📋 Após ordenação CRESCENTE:`, sortedParticipants.map(r => ({ nome: r.team_name || r.athlete_name, order_index: r.order_index })));
          
          // INVERTER para colocar melhores (maior order_index) nas últimas baterias
          // sortedParticipants está: [pior (order_index=1), ..., melhor (order_index=11)]
          // Queremos distribuir: primeira bateria = piores, última bateria = melhores
          // Então mantemos a ordem (piores primeiro) e distribuímos sequencialmente
          // MAS precisamos garantir que os melhores vão para as últimas baterias
          // Solução: inverter a lista ANTES de distribuir
          const orderedParticipants = [...sortedParticipants].reverse();
          
          console.log(`📋 Após INVERSAO:`, orderedParticipants.map(r => ({ nome: r.team_name || r.athlete_name, order_index: r.order_index })));
          console.log('🔄 ORDEM DOS ATLETAS PARA BATERIAS (INVERTIDA):');
          orderedParticipants.forEach((p, idx) => {
            console.log(`  Posição ${idx + 1} na lista: ${p.team_name || p.athlete_name} (order_index: ${p.order_index})`);
          });
          
          console.log(`📊 Total de baterias: ${categoryWodHeats.length}`);
          console.log(`📊 Total de atletas: ${orderedParticipants.length}`);

          // Redistribuir atletas nas baterias EXISTENTES
          // orderedParticipants está: [melhor (order_index=11), ..., pior (order_index=1)]
          // Baterias na ordem normal: [1, 2, 3, ..., 19]
          // Queremos: bateria 1 = piores (últimos da lista), bateria 19 = melhores (primeiros da lista)
          // Solução: distribuir de TRÁS pra FRENTE na lista, mas baterias na ordem normal
          
          // Manter baterias na ordem normal (não inverter!)
          const sortedHeats = [...categoryWodHeats].sort((a, b) => a.heat_number - b.heat_number);
          
          const totalParticipants = orderedParticipants.length;
          
          for (let i = 0; i < sortedHeats.length; i++) {
            const heat = sortedHeats[i];
            const athletesInThisHeat = heat.athletes_per_heat || 4;
            
            // Calcular índice REVERSO na lista de atletas
            // Primeira bateria (i=0) pega do final: slice(total - athletesPerHeat, total) = piores
            // Segunda bateria (i=1) pega: slice(total - 2*athletesPerHeat, total - athletesPerHeat)
            // Última bateria pega do início: slice(0, athletesPerHeat) = melhores
            const reverseStartIdx = Math.max(0, totalParticipants - (i + 1) * athletesInThisHeat);
            const reverseEndIdx = totalParticipants - i * athletesInThisHeat;
            
            const heatParticipants = orderedParticipants.slice(reverseStartIdx, reverseEndIdx);
            
            console.log(`  🔄 Bateria ${heat.heat_number} (índice ${i}, reverseStartIdx: ${reverseStartIdx}, reverseEndIdx: ${reverseEndIdx}):`);
            console.log(`     Atletas: ${heatParticipants.map(p => `${p.team_name || p.athlete_name} (idx:${p.order_index})`).join(', ')}`);
            
            // Deletar APENAS entries antigas desta bateria (não a estrutura!)
            const { error: deleteError } = await supabase
              .from("heat_entries")
              .delete()
              .eq("heat_id", heat.id);

            if (deleteError) {
              console.error(`❌ Erro ao deletar entries antigas da bateria ${heat.heat_number}:`, deleteError);
              throw deleteError;
            }

            // Criar novas entries com nova ordem (se houver atletas)
            if (heatParticipants.length > 0) {
              const newEntries = heatParticipants.map((participant, idx) => ({
                heat_id: heat.id,
                registration_id: participant.id,
                lane_number: idx + 1,
              }));

              const { error: entriesError } = await supabase
                .from("heat_entries")
                .insert(newEntries);

              if (entriesError) {
                console.error(`❌ Erro ao salvar entries na bateria ${heat.heat_number}:`, entriesError);
                console.error(`     Tentando inserir:`, newEntries);
                throw entriesError;
              }
              
              console.log(`✅ Bateria ${heat.heat_number} atualizada com ${heatParticipants.length} atletas`);
            } else {
              console.log(`⚠️ Bateria ${heat.heat_number} ficou vazia (sem atletas para esta posição)`);
            }
            
            totalHeatsUpdated++;
          }
        }
      }

      if (totalHeatsUpdated > 0 && totalHeatsSkipped > 0) {
        toast.success(`✅ ${totalHeatsUpdated} baterias atualizadas! ${totalHeatsSkipped} baterias com resultados foram mantidas intactas.`);
      } else if (totalHeatsUpdated > 0) {
        toast.success(`✅ ${totalHeatsUpdated} baterias atualizadas! Ordem reorganizada baseada no ranking.`);
      } else if (totalHeatsSkipped > 0) {
        toast.info(`ℹ️ ${totalHeatsSkipped} baterias não foram alteradas (já possuem resultados publicados)`);
      } else {
        toast.info("Nenhuma bateria disponível para atualização");
      }
      
      await loadHeats();
      
    } catch (error: any) {
      console.error("Error updating heats:", error);
      toast.error("Erro ao atualizar baterias");
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyTransition = async () => {
    if (!selectedChampionship) return;

    try {
      // Salvar valor no banco
      await supabase
        .from("championships")
        .update({ transition_time_minutes: transitionTime })
        .eq("id", selectedChampionship.id);

      // Aplicar transição a todas as baterias recalculando horários
      const { data: allHeats } = await supabase
        .from("heats")
        .select("*, wods(*)")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (!allHeats || allHeats.length === 0) {
        toast.success(`Transição de ${transitionTime} minutos salva!`);
        return;
      }

      // Usar hora de início configurada
      const [hours, mins] = startTime.split(':');
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

      // Recalcular horários com transição
      for (const heat of allHeats) {
        await supabase
          .from("heats")
          .update({ scheduled_time: currentTime.toISOString() })
          .eq("id", heat.id);

        // Avançar tempo (duração do WOD + transição)
        const wodDuration = heat.wods?.estimated_duration_minutes || 10;
        currentTime = new Date(currentTime.getTime() + (wodDuration * 60000) + (transitionTime * 60000));
      }

      toast.success(`Transição de ${transitionTime} minutos aplicada e salva!`);
      await loadHeats();
    } catch (error: any) {
      console.error("Error applying transition:", error);
      toast.error("Erro ao aplicar transição");
    }
  };

  const handleApplyWodInterval = async () => {
    if (!selectedChampionship) return;

    try {
      // Salvar valor no banco (tanto em championships quanto em championship_days para compatibilidade)
      await supabase
        .from("championships")
        .update({ wod_interval_minutes: wodIntervalMinutes })
        .eq("id", selectedChampionship.id);

      // Atualizar todos os dias com o novo intervalo (compatibilidade)
      if (championshipDays.length > 0) {
        for (const day of championshipDays) {
          await supabase
            .from("championship_days")
            .update({ wod_interval_minutes: wodIntervalMinutes })
            .eq("id", day.id);
        }
      }

      // NÃO recalcular horários automaticamente - apenas salvar configuração
      // O usuário deve usar o botão de gerar baterias ou editar manualmente

      toast.success(`Intervalo entre provas de ${wodIntervalMinutes} minutos salvo!`);
    } catch (error: any) {
      console.error("Error applying wod interval:", error);
      toast.error("Erro ao aplicar intervalo entre provas");
    }
  };

  const handleApplyCategoryInterval = async () => {
    if (!selectedChampionship) return;

    try {
      // Salvar valor no banco
      await supabase
        .from("championships")
        .update({ category_interval_minutes: categoryIntervalMinutes })
        .eq("id", selectedChampionship.id);

      // NÃO recalcular horários automaticamente - apenas salvar configuração
      // O usuário deve usar o botão de gerar baterias ou editar manualmente

      toast.success(`Tempo entre categorias de ${categoryIntervalMinutes} minutos salvo!`);
    } catch (error: any) {
      console.error("Error applying category interval:", error);
      toast.error("Erro ao aplicar tempo entre categorias");
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
      scheduled_time: startTime,
      end_time: startTime,
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

  const handleRemoveFromHeat = async (entryId: string, heatId: string) => {
    try {
      // Buscar info da entry antes de remover
      const entryToRemove = allChampionshipEntries.find(e => e.id === entryId);
      console.log('[DEBUG] Removendo entry:', entryId, 'registration_id:', entryToRemove?.registration_id);
      
      // Remover apenas da heat_entries (não exclui a inscrição)
      const { error } = await supabase
        .from("heat_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      // ATUALIZAR IMEDIATAMENTE o estado local ANTES de recarregar
      // Isso garante que o time apareça instantaneamente na lista lateral
      console.log('[DEBUG] Atualizando estado local - removendo entry do allChampionshipEntries');
      setAllChampionshipEntries(prev => {
        const newEntries = prev.filter(e => e.id !== entryId);
        console.log('[DEBUG] allChampionshipEntries:', prev.length, '->', newEntries.length);
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
      console.log('[DEBUG] Recarregando dados em background...');
      loadHeats().then(() => {
        console.log('[DEBUG] Dados sincronizados com o banco');
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
      });

      const totalHeats = Math.ceil(sortedParticipants.length / athletesPerHeat);

      console.log(`📝 Gerando ${totalHeats} baterias para ${categories.find(c => c.id === selectedCategory)?.name} - ${wods.find(w => w.id === selectedWOD)?.name}`);

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
        
        console.log(`🗑️ Removidas ${existingHeats.length} baterias antigas`);
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

        console.log(`✅ Bateria ${nextHeatNumber + i} criada com ${heatParticipants.length} atletas`);
      }

      toast.success(`✅ ${totalHeats} baterias geradas para ${categories.find(c => c.id === selectedCategory)?.name}!`);
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
      : startTime;
    
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
      // Recarregar configurações de intervalos do campeonato ANTES de calcular
      const { data: champConfig } = await supabase
        .from("championships")
        .select("transition_time_minutes, category_interval_minutes, wod_interval_minutes")
        .eq("id", selectedChampionship.id)
        .single();
      
      // Atualizar estados com valores do banco
      if (champConfig) {
        const transition = champConfig.transition_time_minutes ?? 0;
        const categoryInterval = champConfig.category_interval_minutes ?? 0;
        const wodInterval = champConfig.wod_interval_minutes ?? 0;
        
        setTransitionTime(transition);
        setCategoryIntervalMinutes(categoryInterval);
        setWodIntervalMinutes(wodInterval);
        
        console.log(`Valores carregados: transição=${transition}, categoria=${categoryInterval}, provas=${wodInterval}`);
      }

      // Buscar TODAS as baterias ordenadas por heat_number
      const { data: allHeats } = await supabase
        .from("heats")
        .select("*, wods(*)")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (!allHeats || allHeats.length === 0) return;
      
      // Usar valores atualizados (do estado ou do banco)
      const currentTransitionTime = champConfig?.transition_time_minutes ?? transitionTime ?? 0;
      // Se intervalos estiverem em 0 ou não definidos, usar o intervalo entre baterias para tudo
      const categoryIntervalRaw = champConfig?.category_interval_minutes ?? categoryIntervalMinutes ?? 0;
      const wodIntervalRaw = champConfig?.wod_interval_minutes ?? wodIntervalMinutes ?? 0;
      const currentCategoryInterval = (categoryIntervalRaw && categoryIntervalRaw > 0) ? categoryIntervalRaw : currentTransitionTime;
      const currentWodInterval = (wodIntervalRaw && wodIntervalRaw > 0) ? wodIntervalRaw : currentTransitionTime;
      
      console.log(`⏱️ Intervalos configurados: Transição=${currentTransitionTime}min, Categoria=${currentCategoryInterval}min, WOD=${currentWodInterval}min`);

      // Buscar configurações de pausa dos DIAS (não do campeonato)
      const { data: daysConfig } = await supabase
        .from("championship_days")
        .select("*, championship_day_wods(wod_id, order_num)")
        .eq("championship_id", selectedChampionship.id)
        .order("day_number");

      // Criar mapa de WOD -> Dia para saber qual dia cada WOD pertence
      const wodToDayMap = new Map<string, any>();
      if (daysConfig) {
        daysConfig.forEach(day => {
          if (day.championship_day_wods) {
            day.championship_day_wods.forEach((dayWod: any) => {
              wodToDayMap.set(dayWod.wod_id, day);
            });
          }
        });
      }

      // IMPORTANTE: Respeitar horários manuais existentes
      // Se a primeira bateria já tem horário definido, usar ele
      // Caso contrário, só calcular se startTime estiver definido
      const firstHeat = allHeats[0];
      let currentTime: Date | null = null;
      
      if (firstHeat.scheduled_time) {
        // Respeitar horário manual da primeira bateria
        currentTime = new Date(firstHeat.scheduled_time);
        console.log('✅ Usando horário manual da primeira bateria:', currentTime.toLocaleTimeString('pt-BR'));
      } else if (startTime && startTime.trim() !== '') {
        // Só calcular se startTime estiver definido pelo usuário
        const baseDate = championshipDays.length > 0 
          ? new Date(championshipDays[0].date)
          : new Date();
        const [startHours, startMins] = startTime.split(':');
        currentTime = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          parseInt(startHours),
          parseInt(startMins),
          0,
          0
        );
        console.log('✅ Usando startTime do campo:', currentTime.toLocaleTimeString('pt-BR'));
      } else {
        // Se não há horário definido nem startTime, não recalcular automaticamente
        console.log('⚠️ Nenhum horário definido. Não recalculando horários automaticamente.');
        return;
      }

      if (!currentTime) return;

      let previousWodId: string | null = null;
      let previousCategoryId: string | null = null;
      let wodsCompleted: string[] = [];

      for (let i = 0; i < allHeats.length; i++) {
        const heat = allHeats[i];
        const isFirstHeat = i === 0;

        // Se a bateria já tem horário manual e não é a primeira, pular (respeitar horário manual)
        if (!isFirstHeat && heat.scheduled_time) {
          // Manter horário manual existente e atualizar currentTime para continuar cálculo
          const existingTime = new Date(heat.scheduled_time);
          currentTime = new Date(existingTime);
          previousWodId = heat.wod_id;
          previousCategoryId = heat.category_id;
          console.log(`⏭️ Bateria ${heat.heat_number} tem horário manual, mantendo: ${currentTime.toLocaleTimeString('pt-BR')}`);
          continue;
        }

        if (!isFirstHeat) {
          // Calcular tempo até esta bateria
          const previousHeat = allHeats[i - 1];
          const previousTimeCap = previousHeat.wods?.time_cap || '10:00';
          // Corrigir cálculo: se formato HH:MM, converter corretamente para minutos
          const previousTimecapMinutes = previousTimeCap.includes(':') 
            ? (parseInt(previousTimeCap.split(':')[0]) * 60) + parseInt(previousTimeCap.split(':')[1])
            : parseInt(previousTimeCap) || 10;

          // Adicionar duração da bateria anterior (timecap)
          currentTime = new Date(currentTime.getTime() + (previousTimecapMinutes * 60000));

          // Verificar se mudou de WOD
          if (heat.wod_id !== previousWodId) {
            console.log(`Mudança de WOD detectada: ${previousWodId} -> ${heat.wod_id}`);
            
            // Marcar WOD anterior como completo
            if (previousWodId) {
              wodsCompleted.push(previousWodId);
            }

            // Aplicar intervalo entre provas
            currentTime = new Date(currentTime.getTime() + (currentWodInterval * 60000));
            console.log(`  + ${currentWodInterval} min (intervalo entre provas)`);
            
            // Verificar se deve aplicar PAUSA após o WOD anterior
            // Buscar configuração de pausa do DIA ao qual o WOD anterior pertence
            if (previousWodId) {
              const previousWodDay = wodToDayMap.get(previousWodId);
              
              if (previousWodDay?.enable_break) {
                // Buscar o order_num do WOD anterior dentro do dia
                const previousWodDayWods = previousWodDay.championship_day_wods || [];
                const previousWodInDay = previousWodDayWods.find((dw: any) => dw.wod_id === previousWodId);
                const previousWodOrderInDay = previousWodInDay?.order_num || 0;
                
                const breakAfterWodNumber = previousWodDay.break_after_wod_number;
                const breakDuration = previousWodDay.break_duration_minutes || 30;
                
                console.log(`  Verificando pausa do DIA: WOD anterior order_in_day=${previousWodOrderInDay}, break_after=${breakAfterWodNumber}, duration=${breakDuration}`);
                
                if (previousWodOrderInDay === breakAfterWodNumber) {
                  currentTime = new Date(currentTime.getTime() + (breakDuration * 60000));
                  console.log(`  + ${breakDuration} min (PAUSA do DIA após WOD ${previousWodOrderInDay})`);
                }
              }
            }
          } 
          // Se mudou apenas de categoria (mesmo WOD)
          else if (heat.category_id !== previousCategoryId) {
            console.log(`Mudança de categoria detectada: ${previousCategoryId} -> ${heat.category_id}`);
            currentTime = new Date(currentTime.getTime() + (currentCategoryInterval * 60000));
            console.log(`  + ${currentCategoryInterval} min (intervalo entre categorias)`);
          } 
          // Mesma categoria e mesmo WOD = apenas transição entre baterias
          else {
            currentTime = new Date(currentTime.getTime() + (currentTransitionTime * 60000));
            console.log(`  + ${currentTransitionTime} min (transição entre baterias)`);
          }
        }

        // Atualizar horário da bateria apenas se não tiver horário manual
        if (!heat.scheduled_time || isFirstHeat) {
          await supabase
            .from("heats")
            .update({ scheduled_time: currentTime.toISOString() })
            .eq("id", heat.id);
          console.log(`Bateria ${heat.heat_number}: ${currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        } else {
          console.log(`⏭️ Bateria ${heat.heat_number} mantém horário manual: ${new Date(heat.scheduled_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        }

        previousWodId = heat.wod_id;
        previousCategoryId = heat.category_id;
      }

      console.log('✅ Horários calculados para todas as baterias!');
      console.log(`Total de WODs processados: ${wodsCompleted.length + 1}`);
      toast.success("Horários calculados com sucesso!");
    } catch (error: any) {
      console.error("Erro ao calcular horários:", error);
      toast.error("Erro ao calcular horários das baterias");
    }
  };

  /**
   * Renumera as baterias seguintes após alterar o heat_number de uma bateria
   * IMPORTANTE: Renumera apenas baterias VISÍVEIS na tela (com filtros aplicados)
   */
  const renumberHeatsAfterEdit = async (editedHeatId: string, newHeatNumber: number) => {
    if (!selectedChampionship) return;

    try {
      // Usar as baterias FILTRADAS/VISÍVEIS na tela (mesma lógica do filteredHeats)
      const visibleHeats = heats.filter(h => {
        const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
        const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;
        return categoryFilter && wodFilter;
      }).sort((a, b) => {
        // Ordenar por scheduled_time (se existir), senão por heat_number
        if (a.scheduled_time && b.scheduled_time) {
          return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
        }
        if (a.scheduled_time) return -1;
        if (b.scheduled_time) return 1;
        return a.heat_number - b.heat_number;
      });

      if (visibleHeats.length === 0) {
        console.log('⚠️ Nenhuma bateria visível na tela');
        return;
      }

      // Encontrar a posição da bateria editada na lista ordenada
      const editedHeatIndex = visibleHeats.findIndex(h => h.id === editedHeatId);
      
      if (editedHeatIndex === -1) {
        console.log('⚠️ Bateria editada não encontrada na lista de baterias visíveis');
        return;
      }

      // Pegar apenas as baterias SEGUINTES (após a editada) na ordem da listagem
      const followingHeats = visibleHeats.slice(editedHeatIndex + 1);

      if (followingHeats.length === 0) {
        console.log('✅ Nenhuma bateria seguinte para renumerar');
        return;
      }

      console.log(`🔄 Renumerando ${followingHeats.length} baterias seguintes a partir de ${newHeatNumber + 1}`);

      // Buscar TODOS os resultados publicados de uma vez (otimização)
      const { data: allPublishedResults } = await supabase
        .from("wod_results")
        .select("wod_id, category_id")
        .eq("is_published", true);

      const publishedResultsSet = new Set<string>();
      (allPublishedResults || []).forEach(r => {
        publishedResultsSet.add(`${r.wod_id}_${r.category_id}`);
      });

      // Renumerar cada bateria seguinte
      let currentNumber = newHeatNumber + 1;
      
      for (const heat of followingHeats) {
        // Verificar se esta bateria já tem resultados publicados
        const hasPublishedResults = publishedResultsSet.has(`${heat.wod_id}_${heat.category_id}`);
        
        if (hasPublishedResults) {
          console.log(`⏭️ Bateria ${heat.heat_number} (WOD ${heat.wod_id} + Categoria ${heat.category_id}) já tem resultados publicados. Parando renumeração.`);
          break; // Para de renumerar se encontrar resultados publicados
        }

        // Atualizar heat_number
        const { error: updateError } = await supabase
          .from("heats")
          .update({ heat_number: currentNumber })
          .eq("id", heat.id);
        
        if (updateError) {
          console.error(`❌ ERRO ao renumerar bateria ${heat.heat_number} para ${currentNumber}:`, updateError);
        } else {
          console.log(`✅ Bateria renumerada: ${heat.heat_number} → ${currentNumber}`);
        }

        currentNumber++;
      }

      console.log('✅ Renumeração concluída!');
    } catch (error: any) {
      console.error("Erro ao renumerar baterias:", error);
      toast.error("Erro ao renumerar baterias seguintes");
    }
  };

  /**
   * Recalcula os horários de todas as baterias APÓS a bateria editada
   * IMPORTANTE: Recalcula apenas baterias VISÍVEIS na tela (com filtros aplicados)
   * Abrange TODAS as categorias exibidas na tela
   */
  const recalculateScheduleAfterHeat = async (editedHeatId: string) => {
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
      
      console.log(`⏱️ Intervalos configurados: Transição=${currentTransitionTime}min, Categoria=${currentCategoryInterval}min, WOD=${currentWodInterval}min`);

      // Buscar a bateria editada
      const { data: editedHeat } = await supabase
        .from("heats")
        .select("*, wods(*)")
        .eq("id", editedHeatId)
        .single();

      if (!editedHeat || !editedHeat.scheduled_time) {
        console.log('⚠️ Bateria editada não encontrada ou sem horário');
        return;
      }

      // Usar as baterias FILTRADAS/VISÍVEIS na tela (mesma lógica do filteredHeats)
      const visibleHeats = heats.filter(h => {
        const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
        const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;
        return categoryFilter && wodFilter;
      }).sort((a, b) => {
        // Ordenar por scheduled_time (se existir), senão por heat_number
        if (a.scheduled_time && b.scheduled_time) {
          return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
        }
        if (a.scheduled_time) return -1;
        if (b.scheduled_time) return 1;
        return a.heat_number - b.heat_number;
      });

      if (visibleHeats.length === 0) {
        console.log('⚠️ Nenhuma bateria visível na tela');
        return;
      }

      // Encontrar a posição da bateria editada na lista ordenada
      const editedHeatIndex = visibleHeats.findIndex(h => h.id === editedHeatId);
      
      if (editedHeatIndex === -1) {
        console.log('⚠️ Bateria editada não encontrada na lista de baterias visíveis');
        return;
      }

      // Pegar apenas as baterias SEGUINTES (após a editada) na ordem da listagem
      const followingHeats = visibleHeats.slice(editedHeatIndex + 1);

      if (followingHeats.length === 0) {
        console.log('✅ Nenhuma bateria seguinte para recalcular');
        return;
      }

      console.log(`🔄 Recalculando ${followingHeats.length} baterias seguintes (visíveis na tela)`);

      // Buscar dados dos WODs para todas as baterias seguintes
      const wodIds = [...new Set(followingHeats.map(h => h.wod_id))];
      const { data: wodsData } = await supabase
        .from("wods")
        .select("id, estimated_duration_minutes")
        .in("id", wodIds);

      const wodsMap = new Map((wodsData || []).map(w => [w.id, w]));

      // Buscar TODOS os resultados publicados de uma vez (otimização)
      const { data: allPublishedResults } = await supabase
        .from("wod_results")
        .select("wod_id, category_id")
        .eq("is_published", true);

      const publishedResultsSet = new Set<string>();
      (allPublishedResults || []).forEach(r => {
        publishedResultsSet.add(`${r.wod_id}_${r.category_id}`);
      });

      // Obter duração do WOD da bateria editada e intervalo entre baterias
      const editedWodDuration = editedHeat.wods?.estimated_duration_minutes || 10;
      const intervalBetweenHeats = currentTransitionTime;
      
      console.log(`📊 Duração do WOD editado: ${editedWodDuration} minutos`);
      console.log(`📊 Intervalo entre baterias: ${intervalBetweenHeats} minutos`);

      // currentTime começa no horário da bateria editada
      let currentTime = new Date(editedHeat.scheduled_time);
      let previousWodId = editedHeat.wod_id;
      let previousCategoryId = editedHeat.category_id;
      
      console.log(`⏰ Bateria editada (${editedHeat.heat_number}) inicia em: ${currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}`);

      // Recalcular cada bateria seguinte na ordem da listagem
      for (const heat of followingHeats) {
        // Verificar se esta bateria já tem resultados publicados
        const hasPublishedResults = publishedResultsSet.has(`${heat.wod_id}_${heat.category_id}`);
        
        if (hasPublishedResults) {
          console.log(`⏭️ Bateria ${heat.heat_number} (WOD ${heat.wod_id} + Categoria ${heat.category_id}) já tem resultados publicados. Parando recálculo.`);
          break; // Para de recalcular se encontrar resultados publicados
        }

        // Obter duração do WOD desta bateria
        const wodData = wodsMap.get(heat.wod_id);
        const wodDuration = wodData?.estimated_duration_minutes || 10;

        // Verificar se mudou de WOD ou categoria para aplicar intervalos apropriados
        if (heat.wod_id !== previousWodId) {
          // Mudou de WOD: adicionar intervalo entre provas
          currentTime = new Date(currentTime.getTime() + (currentWodInterval * 60000));
          console.log(`  🔄 Mudança de WOD: +${currentWodInterval}min (intervalo entre provas)`);
        } else if (heat.category_id !== previousCategoryId) {
          // Mudou de categoria (mesmo WOD): adicionar intervalo entre categorias
          currentTime = new Date(currentTime.getTime() + (currentCategoryInterval * 60000));
          console.log(`  🔄 Mudança de categoria: +${currentCategoryInterval}min (intervalo entre categorias)`);
        }
        // Mesma categoria e WOD: apenas transição (já aplicada abaixo)

        // Calcular novo horário: horário atual + duração do WOD + intervalo entre baterias
        currentTime = new Date(currentTime.getTime() + (wodDuration * 60000) + (intervalBetweenHeats * 60000));
        
        console.log(`  🔄 Bateria ${heat.heat_number}: ${currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })} (anterior + ${wodDuration}min + ${intervalBetweenHeats}min)`);

        // Atualizar horário da bateria
        const { error: updateError } = await supabase
          .from("heats")
          .update({ scheduled_time: currentTime.toISOString() })
          .eq("id", heat.id);
        
        if (updateError) {
          console.error(`❌ ERRO ao atualizar bateria ${heat.heat_number}:`, updateError);
          
          // Verificar sessão
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('❌ SESSÃO EXPIRADA! Faça login novamente.');
            toast.error("Sessão expirada. Faça login novamente.");
            return;
          }
        } else {
          console.log(`✅ Bateria ${heat.heat_number} atualizada para: ${currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}`);
        }

        // Atualizar currentTime para o FIM desta bateria (para calcular a próxima)
        currentTime = new Date(currentTime.getTime() + (wodDuration * 60000));
        previousWodId = heat.wod_id;
        previousCategoryId = heat.category_id;
      }

      console.log('✅ Horários recalculados após edição!');
    } catch (error: any) {
      console.error("Erro ao recalcular horários:", error);
      toast.error("Erro ao recalcular horários das baterias seguintes");
    }
  };

  const handleSaveEditHeat = async () => {
    if (!editingHeat) return;

    try {
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

      // Verificar se o heat_number mudou
      const heatNumberChanged = editHeatData.heat_number !== editingHeat.heat_number;

      await supabase
        .from("heats")
        .update({
          custom_name: editHeatData.custom_name.trim() || null,
          athletes_per_heat: editHeatData.athletes_per_heat,
          scheduled_time: scheduledDate.toISOString(),
          heat_number: editHeatData.heat_number,
        })
        .eq("id", editingHeat.id);

      console.log(`💾 Bateria ${editingHeat.heat_number} salva com horário: ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}`);
      
      if (heatNumberChanged) {
        console.log(`🔄 Numeração alterada de ${editingHeat.heat_number} para ${editHeatData.heat_number}`);
        toast.success("Bateria atualizada! Renumerando baterias seguintes...");
      } else {
        toast.success("Bateria atualizada! Recalculando horários seguintes...");
      }
      
      // Atualizar heatCapacities imediatamente
      setHeatCapacities(prev => {
        const updated = new Map(prev);
        updated.set(editingHeat.id, editHeatData.athletes_per_heat);
        return updated;
      });
      
      setEditingHeat(null);
      
      // Renumerar baterias seguintes se o número mudou
      if (heatNumberChanged) {
        await renumberHeatsAfterEdit(editingHeat.id, editHeatData.heat_number);
      }
      
      // Recalcular todas as baterias seguintes DEPOIS de fechar o dialog
      await recalculateScheduleAfterHeat(editingHeat.id);
      
      await loadHeats();
      toast.success(heatNumberChanged ? "Numeração e horários atualizados!" : "Horários atualizados!");
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
        
        console.log('💾 Salvando nova ordem de', newOrderedHeats.length, 'baterias...');
        
        const updatePromises = newOrderedHeats.map((heat, idx) => {
          console.log(`  Bateria ${heat.heat_number} -> ${idx + 1}`);
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
          
          console.log("✅ Ordem das baterias salva com sucesso!");
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

        console.log(`✅ Atleta ${registrationId} adicionado à bateria ${targetHeatId}`);
        
        // Toast IMEDIATO antes de recarregar
        toast.success("✅ Atleta adicionado!", {
          description: "Atualizando lista...",
          duration: 2000,
        });
        
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

      // Se estiver movendo para bateria diferente, verificar capacidade
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
      
      console.log('[DEBUG DRAG] Salvando movimentos. Baterias afetadas:', affectedHeatIds.length);
      
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

      console.log('[DEBUG DRAG] Inserindo', allEntriesToInsert.length, 'entries');
      
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
      console.log('[DEBUG DRAG] Salvo com sucesso');
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

    // Verificar se o atleta já está em alguma bateria (em TODAS as baterias do campeonato)
    const isInHeat = allChampionshipEntries.some(e => e.registration_id === reg.id);
    
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
      opacity: isDragging ? 0.8 : (isInHeat ? 0.4 : 1),
      boxShadow: isDragging ? '0 12px 24px rgba(0,0,0,0.35)' : 'none',
      scale: isDragging ? '1.05' : '1',
      zIndex: isDragging ? 1000 : 'auto',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 rounded border text-sm transition-all duration-200 ${
          isInHeat 
            ? 'bg-muted text-muted-foreground cursor-not-allowed' 
            : isDragging
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
        className={`min-h-[100px] rounded-lg border-2 border-dashed p-3 transition-all duration-300 relative ${
          isOver 
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

  const filteredHeats = heats.filter(h => {
    // Se "all" estiver selecionado, não filtra por aquele critério
    const categoryFilter = !selectedCategory || selectedCategory === 'all' || h.category_id === selectedCategory;
    const wodFilter = !selectedWOD || selectedWOD === 'all' || h.wod_id === selectedWOD;
    
    return categoryFilter && wodFilter;
  }).sort((a, b) => a.heat_number - b.heat_number);

  // Filtrar competidores por busca
  // IMPORTANTE: Mostrar apenas atletas que NÃO estão em nenhuma bateria
  // Se selectedCategory estiver vazio, tratar como 'all' para mostrar todos
  const effectiveCategory = selectedCategory || 'all';
  
  const filteredCompetitors = registrations.filter(reg => {
    // Verificar se o atleta já está em alguma bateria (em TODAS as baterias do campeonato)
    // Usar allChampionshipEntries para verificar todas as baterias, não apenas as filtradas
    const isInHeat = allChampionshipEntries.some(e => e.registration_id === reg.id);
    
    // DEBUG: Log para verificar se está filtrando corretamente
    const name = reg.team_name || reg.athlete_name || '';
    if (name.toLowerCase().includes('fé') || name.toLowerCase().includes('alpha')) {
      console.log(`[DEBUG] ${name} - isInHeat: ${isInHeat}, category: ${reg.category_id}, effectiveCategory: ${effectiveCategory}`);
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

  // Ordenar competidores
  const sortedCompetitors = filteredCompetitors.sort((a, b) => {
    const nameA = (a.team_name || a.athlete_name || '').toLowerCase();
    const nameB = (b.team_name || b.athlete_name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
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
                      <SelectValue placeholder="WOD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Eventos</SelectItem>
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
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button 
                      onClick={handleCreateInitialHeats} 
                      className="w-full" 
                      disabled={generating}
                      variant="default"
                    >
                      <Plus className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? 'Criando...' : 'Gerar Baterias (do zero)'}
                    </Button>
                    <Button 
                      onClick={handleUpdateHeats} 
                      className="w-full" 
                      disabled={generating}
                      variant="secondary"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? 'Atualizando...' : 'Atualizar Baterias (ranking)'}
                    </Button>
                    <Button 
                      onClick={handleGenerateByCategoryAndWod} 
                      className="w-full" 
                      disabled={generating || !selectedCategory || !selectedWOD}
                      variant="outline"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? 'Gerando...' : 'Gerar por Categoria + WOD'}
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
                      <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                      Intercalar
                    </Button>
                    
                    <Button 
                      onClick={handleOpenCreateHeat} 
                      variant="outline" 
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Bateria
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
                    Clique em "Gerar Baterias" para gerar todas ou "Adicionar Bateria" para criar manualmente
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
                        : startTime;
                      
                      const wodInfo = wods.find(w => w.id === heat.wod_id);
                      const timeCap = wodInfo?.time_cap || '10:00';
                      
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="globalTransition">Intervalo Entre Baterias (min)</Label>
                <div className="flex gap-2">
                  <Input
                    id="globalTransition"
                    type="number"
                    min="0"
                    value={transitionTime}
                    onChange={(e) => setTransitionTime(parseInt(e.target.value) || 0)}
                  />
                  <Button onClick={handleApplyTransition} size="sm">
                    APLICAR
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo entre uma bateria e outra do mesmo WOD
                </p>
              </div>
              
              <div>
                <Label htmlFor="categoryInterval">Intervalo Entre Categorias (min)</Label>
                <div className="flex gap-2">
                  <Input
                    id="categoryInterval"
                    type="number"
                    min="0"
                    value={categoryIntervalMinutes}
                    onChange={(e) => setCategoryIntervalMinutes(parseInt(e.target.value) || 0)}
                  />
                  <Button onClick={handleApplyCategoryInterval} size="sm">
                    APLICAR
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo entre categorias diferentes no mesmo WOD
                </p>
              </div>
              
              <div>
                <Label htmlFor="wodInterval">Intervalo Entre Provas (min)</Label>
                <div className="flex gap-2">
                  <Input
                    id="wodInterval"
                    type="number"
                    min="0"
                    value={wodIntervalMinutes}
                    onChange={(e) => setWodIntervalMinutes(parseInt(e.target.value) || 0)}
                  />
                  <Button onClick={handleApplyWodInterval} size="sm">
                    APLICAR
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo entre o fim de um WOD e início do próximo
                </p>
              </div>
            </div>
          </Card>

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
                  const { data: allHeatsOrdered } = await supabase
                    .from("heats")
                    .select("*")
                    .eq("championship_id", selectedChampionship?.id)
                    .order("heat_number");
                  
                  if (!allHeatsOrdered) return;
                  
                  const activeIndex = allHeatsOrdered.findIndex(h => h.id === activeHeatId);
                  const overIndex = allHeatsOrdered.findIndex(h => h.id === overHeatId);
                  
                  if (activeIndex === -1 || overIndex === -1) return;
                  
                  // Reordenar array
                  const newHeats = arrayMove(allHeatsOrdered, activeIndex, overIndex);
                  
                  // Atualizar heat_number no banco para TODAS as baterias
                  try {
                    for (let i = 0; i < newHeats.length; i++) {
                      await supabase
                        .from("heats")
                        .update({ heat_number: i + 1 })
                        .eq("id", newHeats[i].id);
                    }
                    
                    // Recarregar baterias
                    await loadHeats();
                    // NÃO recalcular horários automaticamente após drag and drop
                    
                    toast.success("Baterias reorganizadas!");
                  } catch (error) {
                    console.error("Erro ao reordenar baterias:", error);
                    toast.error("Erro ao reorganizar baterias");
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
                        const timeCap = wodInfo?.time_cap || '10:00';
                        
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
              <Label htmlFor="edit-time-cap">TimeCap (min:seg)</Label>
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
      <Dialog open={showExportDialog} onOpenChange={(open) => !open && setShowExportDialog(false)}>
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
    </div>
  );
}


