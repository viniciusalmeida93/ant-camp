import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, Download, Clock, Loader2, Edit2, GripVertical, Shuffle } from 'lucide-react';
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
  const [athletesPerHeat, setAthletesPerHeat] = useState<number | ''>('');
  const [allHeatEntries, setAllHeatEntries] = useState<Map<string, any[]>>(new Map());
  const [savingEdits, setSavingEdits] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingHeatsOrder, setEditingHeatsOrder] = useState<any[]>([]);
  const [editingTimeHeatId, setEditingTimeHeatId] = useState<string | null>(null);
  const [newScheduledTime, setNewScheduledTime] = useState<string>('');
  const [recalculatingTimes, setRecalculatingTimes] = useState(false);
  
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

  // Carregar athletes_per_heat da categoria quando ela for selecionada
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const category = categories.find(c => c.id === selectedCategory);
      if (category && category.athletes_per_heat) {
        setAthletesPerHeat(category.athletes_per_heat);
      } else {
        setAthletesPerHeat('');
      }
    } else {
      setAthletesPerHeat('');
    }
  }, [selectedCategory, categories]);

  // Inicializar entries quando heats são carregados
  useEffect(() => {
    // Sempre usar todas as baterias filtradas (mesma lógica do filteredHeats)
    const filteredHeats = heats.filter(h => {
      if (selectedCategory && selectedWOD) {
        return h.category_id === selectedCategory && h.wod_id === selectedWOD;
      } else if (selectedCategory) {
        return h.category_id === selectedCategory;
      } else if (selectedWOD) {
        return h.wod_id === selectedWOD;
      }
      return true;
    }).sort((a, b) => {
      // Ordenar por WOD primeiro, depois categoria, depois número da bateria
      const wodA = wods.find(w => w.id === a.wod_id)?.order_num || 0;
      const wodB = wods.find(w => w.id === b.wod_id)?.order_num || 0;
      if (wodA !== wodB) return wodA - wodB;
      
      const categoryA = categories.find(c => c.id === a.category_id)?.order_index || 0;
      const categoryB = categories.find(c => c.id === b.category_id)?.order_index || 0;
      if (categoryA !== categoryB) return categoryA - categoryB;
      
      return a.heat_number - b.heat_number;
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
    
    // Inicializar ordem das baterias
    if (filteredHeats.length > 0) {
      setEditingHeatsOrder([...filteredHeats]);
    } else {
      setEditingHeatsOrder([]);
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

      // Se categoria e WOD estão selecionados, filtrar por eles
      if (selectedCategory && selectedWOD) {
        query = query.eq("category_id", selectedCategory).eq("wod_id", selectedWOD);
      } else if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      } else if (selectedWOD) {
        query = query.eq("wod_id", selectedWOD);
      }
      // Se nenhum está selecionado, carregar todas as baterias do campeonato

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

  const calculateLeaderboard = (categoryId?: string) => {
    // Se não há categoria selecionada, retornar vazio (não há como calcular ranking sem categoria)
    const targetCategory = categoryId || selectedCategory;
    if (!targetCategory) return [];

    // Agrupar resultados por registration_id
    const participantMap = new Map<string, any>();
    
    wodResults
      .filter(r => r.category_id === targetCategory)
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

  const generateHeatsForCategoryAndWod = async (
    categoryId: string,
    wodId: string,
    athletesPerHeatValue: number
  ) => {
    // Buscar registrações da categoria
    const categoryRegs = registrations.filter(r => r.category_id === categoryId);
    
    if (categoryRegs.length === 0) {
      return { success: false, skipped: true, message: `Nenhuma inscrição na categoria` };
    }

    // Buscar resultados do WOD para esta categoria (se necessário)
    const { data: categoryWodResultsData } = await supabase
      .from("wod_results")
      .select("*")
      .eq("category_id", categoryId);

    const categoryWodResults = categoryWodResultsData || [];
    const participantMap = new Map<string, any>();
    
    categoryWodResults.forEach(result => {
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

    const leaderboard = Array.from(participantMap.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return 0;
      })
      .map((p, index) => ({
        ...p,
        position: index + 1,
      }));

    const hasResults = leaderboard.length > 0 && leaderboard.some(l => l.totalPoints > 0);

    // Ordenar participantes
    let orderedParticipants: any[];
    
    if (!hasResults) {
      orderedParticipants = categoryRegs
        .sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA;
        })
        .map(reg => ({
          registrationId: reg.id,
          name: reg.team_name || reg.athlete_name,
          totalPoints: 0,
          position: undefined,
        }));
    } else {
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
        if (a.totalPoints !== b.totalPoints) {
          return a.totalPoints - b.totalPoints;
        }
        return 0;
      });
    }

    // Calcular número de baterias
    const totalHeats = Math.ceil(orderedParticipants.length / athletesPerHeatValue);

    // Deletar baterias existentes
    const existingHeats = heats.filter(
      h => h.category_id === categoryId && h.wod_id === wodId
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
    const newHeats: any[] = [];
    
    for (let i = 0; i < totalHeats; i++) {
      const startIndex = i * athletesPerHeatValue;
      const endIndex = Math.min(startIndex + athletesPerHeatValue, orderedParticipants.length);
      const heatParticipants = orderedParticipants.slice(startIndex, endIndex);

      const { data: newHeat, error: heatError } = await supabase
        .from("heats")
        .insert({
          championship_id: selectedChampionship!.id,
          category_id: categoryId,
          wod_id: wodId,
          heat_number: i + 1,
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

      newHeats.push(newHeat);
    }

    return { success: true, totalHeats, categoryId, wodId };
  };

  const handleGenerateAllHeats = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    setGenerating(true);
    try {
      let totalGenerated = 0;
      let totalSkipped = 0;
      const skipped: string[] = [];
      const errors: string[] = [];

      // Iterar sobre todos os WODs primeiro, depois todas as categorias
      // Isso garante que todas as baterias de todas as categorias para o WOD 1 sejam geradas primeiro
      for (const wod of wods) {
        const athletesPerHeatValue = athletesPerHeat; // Usar valor padrão

        // Iterar sobre todas as categorias para este WOD
        for (const category of categories) {
          const categoryAthletesPerHeat = category.athletes_per_heat || athletesPerHeatValue;
          
          try {
            const result = await generateHeatsForCategoryAndWod(
              category.id,
              wod.id,
              categoryAthletesPerHeat
            );

            if (result.success) {
              totalGenerated += result.totalHeats || 0;
            } else if ((result as any).skipped || result.message?.includes("Nenhuma inscrição")) {
              // Não contar como erro - é esperado quando não há inscrições
              totalSkipped++;
              skipped.push(`${category.name} - ${wod.name}`);
            } else {
              errors.push(`${category.name} - ${wod.name}: ${result.message}`);
            }
          } catch (error: any) {
            errors.push(`${category.name} - ${wod.name}: ${error.message}`);
            console.error(`Erro ao gerar baterias para ${category.name} - ${wod.name}:`, error);
          }
        }
      }

      // Calcular horários para todas as baterias geradas
      try {
        const { data: daysData } = await supabase
          .from("championship_days")
          .select("*")
          .eq("championship_id", selectedChampionship.id)
          .order("day_number");

        if (daysData && daysData.length > 0) {
          // Buscar todas as baterias recém-criadas para calcular horários
          const { data: allNewHeats } = await supabase
            .from("heats")
            .select("*, wods(*), categories(*)")
            .eq("championship_id", selectedChampionship.id)
            .is("scheduled_time", null)
            .order("heat_number");

          if (allNewHeats && allNewHeats.length > 0) {
            // Agrupar baterias por dia do WOD
            const heatsByDay = new Map<number, any[]>();
            
            for (const heat of allNewHeats) {
              const { data: dayWodData } = await supabase
                .from("championship_day_wods")
                .select("championship_day_id, championship_days(day_number, date, start_time, break_interval_minutes)")
                .eq("wod_id", heat.wod_id)
                .single();

              let dayNumber = 1;
              let targetDay = daysData[0];
              
              if (dayWodData && dayWodData.championship_days) {
                dayNumber = (dayWodData.championship_days as any).day_number || 1;
                targetDay = dayWodData.championship_days as any;
              }

              if (!heatsByDay.has(dayNumber)) {
                heatsByDay.set(dayNumber, []);
              }
              heatsByDay.get(dayNumber)!.push({ ...heat, dayNumber, targetDay });
            }

            // Calcular horários para cada dia
            for (const [dayNum, dayHeats] of heatsByDay.entries()) {
              const targetDay = dayHeats[0].targetDay;
              const breakInterval = targetDay.break_interval_minutes || 5;

              // Buscar última bateria do MESMO DIA com horário
              const targetDate = new Date(targetDay.date);
              const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
              
              const { data: allDayHeats } = await supabase
                .from("heats")
                .select("*, wods(*)")
                .eq("championship_id", selectedChampionship.id)
                .not("scheduled_time", "is", null)
                .order("scheduled_time", { ascending: true });

              // Filtrar apenas baterias do mesmo dia
              const sameDayHeats = (allDayHeats || []).filter(h => {
                if (!h.scheduled_time) return false;
                const heatDate = new Date(h.scheduled_time);
                return heatDate.toISOString().split('T')[0] === targetDateStr;
              });

              let currentTime: Date;
              
              if (sameDayHeats.length > 0) {
                // Pegar a última bateria do dia
                const lastHeat = sameDayHeats[sameDayHeats.length - 1];
                const lastHeatTime = new Date(lastHeat.scheduled_time);
                const lastWodDuration = (lastHeat.wods as any)?.estimated_duration_minutes || 15;
                
                // Buscar variação de categoria se existir para a última bateria
                const { data: lastVariationData } = await supabase
                  .from("wod_category_variations")
                  .select("estimated_duration_minutes")
                  .eq("wod_id", lastHeat.wod_id)
                  .eq("category_id", lastHeat.category_id)
                  .maybeSingle();
                
                const finalLastWodDuration = lastVariationData?.estimated_duration_minutes || lastWodDuration;
                
                currentTime = new Date(lastHeatTime.getTime() + (finalLastWodDuration * 60000) + (breakInterval * 60000));
              } else {
                let startTimeStr = targetDay.start_time || "09:00";
                if (typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
                  const parts = startTimeStr.split(':');
                  startTimeStr = `${parts[0]}:${parts[1]}`;
                }
                
                const [hours, mins] = startTimeStr.split(':');
                const [year, month, dayNum] = targetDay.date.split('-');
                currentTime = new Date(
                  parseInt(year), 
                  parseInt(month) - 1, 
                  parseInt(dayNum), 
                  parseInt(hours), 
                  parseInt(mins), 
                  0, 
                  0
                );
              }

              // Ordenar baterias do dia por WOD primeiro, depois categoria, depois número da bateria
              const sortedDayHeats = dayHeats.sort((a, b) => {
                const wodA = wods.find(w => w.id === a.wod_id)?.order_num || 0;
                const wodB = wods.find(w => w.id === b.wod_id)?.order_num || 0;
                if (wodA !== wodB) return wodA - wodB;
                
                const catA = categories.find(c => c.id === a.category_id)?.order_index || 0;
                const catB = categories.find(c => c.id === b.category_id)?.order_index || 0;
                if (catA !== catB) return catA - catB;
                
                return a.heat_number - b.heat_number;
              });

              // Atualizar horários das baterias do dia
              for (const heat of sortedDayHeats) {
                const wodDuration = (heat.wods as any)?.estimated_duration_minutes || 15;
                
                // Buscar variação de categoria se existir
                const { data: variationData } = await supabase
                  .from("wod_category_variations")
                  .select("estimated_duration_minutes")
                  .eq("wod_id", heat.wod_id)
                  .eq("category_id", heat.category_id)
                  .maybeSingle();

                const finalWodDuration = variationData?.estimated_duration_minutes || wodDuration;

                await supabase
                  .from("heats")
                  .update({ scheduled_time: currentTime.toISOString() })
                  .eq("id", heat.id);

                // Avançar tempo para próxima bateria
                currentTime = new Date(currentTime.getTime() + (finalWodDuration * 60000));
                currentTime = new Date(currentTime.getTime() + (breakInterval * 60000));
              }
            }
          }
        }
      } catch (scheduleError) {
        console.error("Erro ao calcular horários:", scheduleError);
      }

      await loadHeats();

      // Construir mensagem de sucesso
      let message = `${totalGenerated} baterias geradas com sucesso!`;
      
      if (totalSkipped > 0) {
        message += ` ${totalSkipped} combinações foram puladas (sem inscrições).`;
        if (skipped.length <= 5) {
          console.log("Combinações puladas (sem inscrições):", skipped);
        } else {
          console.log(`${totalSkipped} combinações puladas (sem inscrições). Primeiras 5:`, skipped.slice(0, 5));
        }
      }

      if (errors.length > 0) {
        toast.warning(
          `${message} ${errors.length} erro(s) encontrado(s). Verifique o console.`
        );
        console.error("Erros:", errors);
      } else if (totalSkipped > 0) {
        toast.success(message);
      } else {
        toast.success(message);
      }
    } catch (error: any) {
      console.error("Error generating all heats:", error);
      toast.error("Erro ao gerar todas as baterias");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateHeats = async () => {
    if (!selectedChampionship || !selectedCategory || !selectedWOD) {
      toast.error("Selecione categoria e WOD");
      return;
    }

    setGenerating(true);
    try {
      const category = categories.find(c => c.id === selectedCategory);
      const athletesPerHeatValue = category?.athletes_per_heat || athletesPerHeat;

      const result = await generateHeatsForCategoryAndWod(
        selectedCategory,
        selectedWOD,
        athletesPerHeatValue
      );

      if (!result.success) {
        toast.error(result.message || "Erro ao gerar baterias");
        setGenerating(false);
        return;
      }

      const totalHeats = result.totalHeats || 0;
      
      // Buscar as baterias recém-criadas para calcular horários
      const { data: newHeatsData } = await supabase
        .from("heats")
        .select("*")
        .eq("category_id", selectedCategory)
        .eq("wod_id", selectedWOD)
        .order("heat_number", { ascending: true });

      const newHeats = newHeatsData || [];

      toast.success(`${totalHeats} baterias geradas! Calculando horários...`);
      
      // Calcular horários automaticamente para as baterias recém-criadas
      try {
        // Buscar configurações de dia e horários
        const { data: daysData } = await supabase
          .from("championship_days")
          .select("*")
          .eq("championship_id", selectedChampionship.id)
          .order("day_number");

        if (daysData && daysData.length > 0) {
          // Buscar qual dia este WOD pertence
          const { data: dayWodData } = await supabase
            .from("championship_day_wods")
            .select("championship_day_id, championship_days(day_number, date, start_time, break_interval_minutes)")
            .eq("wod_id", selectedWOD)
            .single();

          let targetDay = daysData[0]; // Padrão: primeiro dia
          if (dayWodData && dayWodData.championship_days) {
            targetDay = dayWodData.championship_days;
          }

          // Buscar duração do WOD
          const { data: wodData } = await supabase
            .from("wods")
            .select("estimated_duration_minutes")
            .eq("id", selectedWOD)
            .single();

          const wodDuration = wodData?.estimated_duration_minutes || 15;
          const breakInterval = targetDay.break_interval_minutes || 5;

          // Buscar variação de categoria se existir
          const { data: variationData } = await supabase
            .from("wod_category_variations")
            .select("estimated_duration_minutes")
            .eq("wod_id", selectedWOD)
            .eq("category_id", selectedCategory)
            .maybeSingle();

          const finalWodDuration = variationData?.estimated_duration_minutes || wodDuration;

          // Buscar TODAS as baterias do mesmo dia para calcular o horário inicial correto
          const { data: allDayHeats } = await supabase
            .from("heats")
            .select("*, wods(*)")
            .eq("championship_id", selectedChampionship.id)
            .not("scheduled_time", "is", null)
            .order("scheduled_time", { ascending: true });

          // Filtrar baterias do mesmo dia
          const sameDayHeats = (allDayHeats || []).filter(h => {
            if (!h.scheduled_time) return false;
            const heatDate = new Date(h.scheduled_time);
            const targetDate = new Date(targetDay.date);
            return heatDate.toDateString() === targetDate.toDateString();
          });

          // Determinar horário inicial
          let currentTime: Date;
          
          if (sameDayHeats.length > 0) {
            // Se já existem baterias neste dia, começar após a última
            const lastHeat = sameDayHeats[sameDayHeats.length - 1];
            const lastHeatTime = new Date(lastHeat.scheduled_time);
            const lastWodDuration = lastHeat.wods?.estimated_duration_minutes || 15;
            
            // Próximo horário = último horário + duração + intervalo
            currentTime = new Date(lastHeatTime.getTime() + (lastWodDuration * 60000) + (breakInterval * 60000));
          } else {
            // Primeira bateria do dia - usar horário de início
            let startTimeStr = targetDay.start_time || "09:00";
            if (typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
              const parts = startTimeStr.split(':');
              startTimeStr = `${parts[0]}:${parts[1]}`;
            }
            
            const [hours, mins] = startTimeStr.split(':');
            const [year, month, dayNum] = targetDay.date.split('-');
            currentTime = new Date(
              parseInt(year), 
              parseInt(month) - 1, 
              parseInt(dayNum), 
              parseInt(hours), 
              parseInt(mins), 
              0, 
              0
            );
          }

          // Atualizar horários das novas baterias
          for (const heat of newHeats) {
            await supabase
              .from("heats")
              .update({ scheduled_time: currentTime.toISOString() })
              .eq("id", heat.id);

            // Avançar tempo para próxima bateria
            currentTime = new Date(currentTime.getTime() + (finalWodDuration * 60000));
            currentTime = new Date(currentTime.getTime() + (breakInterval * 60000));
          }

          toast.success(`${totalHeats} baterias geradas com horários calculados!`);
        } else {
          toast.success(`${totalHeats} baterias geradas! Configure os dias no Dashboard para calcular horários.`);
        }
      } catch (scheduleError) {
        console.error("Erro ao calcular horários:", scheduleError);
        toast.warning(`${totalHeats} baterias geradas, mas erro ao calcular horários. Calcule manualmente no Dashboard.`);
      }
      
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

  const handleHeatDragEnd = async (event: DragEndEvent) => {
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

      // Salvar automaticamente
      try {
        for (const heat of updatedHeats) {
          await supabase
            .from("heats")
            .update({ heat_number: heat.heat_number })
            .eq("id", heat.id);
        }
        toast.success("Ordem das baterias atualizada!");
        await loadHeats();
      } catch (error: any) {
        console.error("Error saving heat order:", error);
        toast.error("Erro ao salvar ordem das baterias");
      }
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

    // Salvar automaticamente
    try {
      setSavingEdits(true);
      
      // Deletar todas as entries das baterias afetadas
      const affectedHeatIds = Array.from(newEntriesMap.keys());
      const { error: deleteError } = await supabase
        .from("heat_entries")
        .delete()
        .in("heat_id", affectedHeatIds);

      if (deleteError) throw deleteError;

      // Inserir todas as entries atualizadas
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
        const { error: insertError } = await supabase
          .from("heat_entries")
          .insert(allEntriesToInsert);

        if (insertError) throw insertError;
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


  const handleIntercalateHeats = async () => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato");
      return;
    }

    setSavingEdits(true);
    try {
      // Filtrar baterias baseado nas seleções (ou mostrar todas se não houver seleção)
      const filteredHeatsList = heats.filter(h => {
        if (selectedCategory && selectedWOD) {
          return h.category_id === selectedCategory && h.wod_id === selectedWOD;
        } else if (selectedCategory) {
          return h.category_id === selectedCategory;
        } else if (selectedWOD) {
          return h.wod_id === selectedWOD;
        }
        return true;
      }).sort((a, b) => {
        // Ordenar por WOD primeiro, depois categoria, depois número da bateria
        const wodA = wods.find(w => w.id === a.wod_id)?.order_num || 0;
        const wodB = wods.find(w => w.id === b.wod_id)?.order_num || 0;
        if (wodA !== wodB) return wodA - wodB;
        
        const categoryA = categories.find(c => c.id === a.category_id)?.order_index || 0;
        const categoryB = categories.find(c => c.id === b.category_id)?.order_index || 0;
        if (categoryA !== categoryB) return categoryA - categoryB;
        
        return a.heat_number - b.heat_number;
      });

      if (filteredHeatsList.length === 0) {
        toast.error("Nenhuma bateria encontrada para intercalar");
        return;
      }

      // Criar um mapa de todas as entries por bateria usando heatEntries diretamente
      const entriesByHeat = new Map<string, any[]>();
      filteredHeatsList.forEach(heat => {
        // Buscar entries diretamente de heatEntries (dados do banco)
        const entries = heatEntries
          .filter(e => e.heat_id === heat.id)
          .sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0));
        // Criar uma cópia profunda do array para não modificar o original
        entriesByHeat.set(heat.id, entries.map(e => ({ ...e })));
      });

      let totalMoved = 0;

      // Intercalar baterias - agrupar por categoria e WOD primeiro
      const heatsByContext = new Map<string, any[]>();
      filteredHeatsList.forEach(heat => {
        const key = `${heat.category_id}-${heat.wod_id}`;
        if (!heatsByContext.has(key)) {
          heatsByContext.set(key, []);
        }
        heatsByContext.get(key)!.push(heat);
      });

      // Processar cada grupo de categoria/WOD separadamente
      for (const [contextKey, contextHeats] of heatsByContext.entries()) {
        // Ordenar baterias deste contexto por número
        const sortedContextHeats = [...contextHeats].sort((a, b) => a.heat_number - b.heat_number);
        
        // Buscar athletes_per_heat da primeira categoria deste contexto
        const firstHeat = sortedContextHeats[0];
        const category = categories.find(c => c.id === firstHeat.category_id);
        const maxAthletes = firstHeat.athletes_per_heat || category?.athletes_per_heat || (typeof athletesPerHeat === 'number' ? athletesPerHeat : 10);
        
        if (!maxAthletes || maxAthletes <= 0) {
          console.warn(`Categoria ${category?.name} não tem athletes_per_heat definido`);
          continue;
        }

        console.log(`Intercalando contexto ${contextKey}, maxAthletes: ${maxAthletes}`);

        // Intercalar baterias deste contexto
        for (let i = 0; i < sortedContextHeats.length; i++) {
          const currentHeat = sortedContextHeats[i];
          let currentEntries = [...(entriesByHeat.get(currentHeat.id) || [])];
          
          console.log(`Bateria ${currentHeat.heat_number} tem ${currentEntries.length} atletas`);
          
          if (currentEntries.length < maxAthletes) {
            // Esta bateria precisa de mais atletas
            let needed = maxAthletes - currentEntries.length;
            console.log(`Bateria ${currentHeat.heat_number} precisa de ${needed} atletas`);
            
            // Procurar atletas nas próximas baterias do mesmo contexto
            for (let j = i + 1; j < sortedContextHeats.length && needed > 0; j++) {
              const nextHeat = sortedContextHeats[j];
              let nextEntries = [...(entriesByHeat.get(nextHeat.id) || [])];
              
              console.log(`Verificando próxima bateria ${nextHeat.heat_number} com ${nextEntries.length} atletas`);
              
              if (nextEntries.length > 0) {
                // Pegar atletas da próxima bateria
                const toMove = nextEntries.splice(0, Math.min(needed, nextEntries.length));
                console.log(`Movendo ${toMove.length} atletas da bateria ${nextHeat.heat_number} para bateria ${currentHeat.heat_number}`);
                
                currentEntries.push(...toMove);
                entriesByHeat.set(currentHeat.id, currentEntries);
                entriesByHeat.set(nextHeat.id, nextEntries);
                totalMoved += toMove.length;
                needed -= toMove.length;
              }
            }
          }
        }
      }

      if (totalMoved === 0) {
        toast.info("Nenhuma intercalação necessária - todas as baterias já estão completas");
        setSavingEdits(false);
        return;
      }

      // Atualizar lane_numbers e salvar no banco
      const allEntriesToUpdate: any[] = [];
      
      // Deletar todas as entries das baterias afetadas
      const affectedHeatIds = Array.from(entriesByHeat.keys());
      const { error: deleteError } = await supabase
        .from("heat_entries")
        .delete()
        .in("heat_id", affectedHeatIds);

      if (deleteError) throw deleteError;

      // Inserir todas as entries atualizadas
      entriesByHeat.forEach((entries, heatId) => {
        entries.forEach((entry, index) => {
          if (entry.registration_id) {
            allEntriesToUpdate.push({
              heat_id: heatId,
              registration_id: entry.registration_id,
              lane_number: index + 1,
            });
          }
        });
      });

      if (allEntriesToUpdate.length > 0) {
        const { error: insertError } = await supabase
          .from("heat_entries")
          .insert(allEntriesToUpdate);

        if (insertError) throw insertError;
      }

      toast.success(`${totalMoved} atleta(s)/time(s) movido(s) - Baterias intercaladas com sucesso!`);
      await loadHeats();
    } catch (error: any) {
      console.error("Error intercalating heats:", error);
      toast.error("Erro ao intercalar baterias: " + (error.message || 'Erro desconhecido'));
    } finally {
      setSavingEdits(false);
    }
  };

  const handleOpenEditTime = (heatId: string, currentTime: string | null) => {
    setEditingTimeHeatId(heatId);
    if (currentTime) {
      const time = new Date(currentTime);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      setNewScheduledTime(`${hours}:${minutes}`);
    } else {
      setNewScheduledTime('08:00');
    }
  };

  const handleRecalculateHeatsTime = async () => {
    if (!editingTimeHeatId || !newScheduledTime || !selectedChampionship) return;

    setRecalculatingTimes(true);
    try {
      // Buscar o heat sendo editado
      const editingHeat = heats.find(h => h.id === editingTimeHeatId);
      if (!editingHeat) {
        toast.error("Bateria não encontrada");
        return;
      }

      // Horário antigo da bateria
      const oldHeatTime = editingHeat.scheduled_time ? new Date(editingHeat.scheduled_time) : null;
      if (!oldHeatTime) {
        toast.error("Bateria não tem horário definido");
        return;
      }

      // Criar novo horário base para a bateria sendo editada
      const [hours, minutes] = newScheduledTime.split(':');
      
      // Criar nova data em horário LOCAL
      const year = oldHeatTime.getFullYear();
      const month = oldHeatTime.getMonth();
      const day = oldHeatTime.getDate();
      const newHeatTime = new Date(year, month, day, parseInt(hours), parseInt(minutes), 0, 0);

      // Calcular a DIFERENÇA em milissegundos (pode ser positiva ou negativa)
      const timeDifference = newHeatTime.getTime() - oldHeatTime.getTime();
      
      console.log(`Diferença de tempo: ${timeDifference / 60000} minutos`);

      // Atualizar a bateria sendo editada
      const { error: updateError } = await supabase
        .from("heats")
        .update({ scheduled_time: newHeatTime.toISOString() })
        .eq("id", editingTimeHeatId);

      if (updateError) throw updateError;

      // Buscar TODAS as baterias do campeonato ordenadas por horário
      const { data: allHeatsData, error: heatsError } = await supabase
        .from("heats")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .not("scheduled_time", "is", null)
        .order("scheduled_time", { ascending: true });

      if (heatsError) throw heatsError;

      // Filtrar baterias que vêm DEPOIS da editada (mesmo dia, horário posterior ao ANTIGO)
      const subsequentHeats = (allHeatsData || []).filter(h => {
        if (h.id === editingTimeHeatId) return false; // Pular a própria bateria editada
        const heatTime = new Date(h.scheduled_time);
        // Pegar baterias do mesmo dia que vinham DEPOIS do horário ANTIGO
        return heatTime.toDateString() === oldHeatTime.toDateString() && 
               heatTime.getTime() > oldHeatTime.getTime();
      }).sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

      if (subsequentHeats.length === 0) {
        toast.success("Horário atualizado! (Nenhuma bateria subsequente para ajustar)");
        await loadHeats();
        setEditingTimeHeatId(null);
        setNewScheduledTime('');
        return;
      }

      // Aplicar a MESMA DIFERENÇA em TODAS as baterias seguintes
      let updatedCount = 1; // Conta a bateria editada
      
      for (const heat of subsequentHeats) {
        const oldTime = new Date(heat.scheduled_time);
        const newTime = new Date(oldTime.getTime() + timeDifference); // Aplica a diferença

        // Atualizar horário desta bateria
        const { error: updateErr } = await supabase
          .from("heats")
          .update({ scheduled_time: newTime.toISOString() })
          .eq("id", heat.id);

        if (updateErr) {
          console.error(`Erro ao atualizar bateria ${heat.id}:`, updateErr);
        } else {
          updatedCount++;
        }
      }

      const diffMinutes = Math.round(timeDifference / 60000);
      const diffSign = diffMinutes >= 0 ? '+' : '';
      toast.success(`Horários ajustados! ${updatedCount} bateria(s) ${diffSign}${diffMinutes} minutos.`);
      
      // Recarregar dados
      await loadHeats();
      setEditingTimeHeatId(null);
      setNewScheduledTime('');
    } catch (error: any) {
      console.error("Erro ao recalcular horários:", error);
      toast.error("Erro ao ajustar horários das baterias");
    } finally {
      setRecalculatingTimes(false);
    }
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

  // Filtrar baterias baseado nas seleções (ou mostrar todas se não houver seleção)
  const filteredHeats = heats.filter(h => {
    if (selectedCategory && selectedWOD) {
      return h.category_id === selectedCategory && h.wod_id === selectedWOD;
    } else if (selectedCategory) {
      return h.category_id === selectedCategory;
    } else if (selectedWOD) {
      return h.wod_id === selectedWOD;
    }
    // Se nenhum filtro está selecionado, mostrar todas
    return true;
  }).sort((a, b) => {
    // Ordenar por WOD primeiro, depois categoria, depois número da bateria
    const wodA = wods.find(w => w.id === a.wod_id)?.order_num || 0;
    const wodB = wods.find(w => w.id === b.wod_id)?.order_num || 0;
    if (wodA !== wodB) return wodA - wodB;
    
    const categoryA = categories.find(c => c.id === a.category_id)?.order_index || 0;
    const categoryB = categories.find(c => c.id === b.category_id)?.order_index || 0;
    if (categoryA !== categoryB) return categoryA - categoryB;
    
    return a.heat_number - b.heat_number;
  });

  // Componente Sortable para bateria
  function SortableHeat({ heat, children }: { heat: any; children: (props: { dragAttributes: any; dragListeners: any }) => any }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: heat.id,
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
        {children({ dragAttributes: attributes, dragListeners: listeners })}
      </div>
    );
  }

  // Componente Droppable para bateria
  function HeatDropZone({ heatId, isEmpty, children }: { heatId: string; isEmpty: boolean; children: any }) {
    const { setNodeRef, isOver } = useDroppable({
      id: `heat-drop-${heatId}`,
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
  function SortableParticipant({ entry, heatId, categoryId }: { entry: any; heatId: string; categoryId: string }) {
    const reg = registrations.find(r => r.id === entry.registration_id);
    const lbEntry = calculateLeaderboard(categoryId).find(l => l.registrationId === entry.registration_id);
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
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
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
              value={athletesPerHeat === '' ? '' : athletesPerHeat}
              placeholder="Ex: 5"
              onChange={async (e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  setAthletesPerHeat('');
                  return;
                }
                const newValue = parseInt(inputValue);
                if (!isNaN(newValue) && newValue > 0) {
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
                }
              }}
              min={1}
              max={30}
            />
          </div>

          <div className="flex gap-2 md:col-span-3">
            <Button 
              onClick={handleGenerateHeats} 
              className="flex-1 shadow-glow h-12" 
              disabled={generating || savingEdits}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Gerando...' : 'Gerar Baterias'}
            </Button>
            <Button 
              onClick={handleGenerateAllHeats} 
              className="flex-1 shadow-glow h-12" 
              disabled={generating || savingEdits}
              variant="destructive"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Gerando Todas...' : 'GERAR TODAS AS BATERIAS'}
            </Button>
            <Button 
              onClick={handleIntercalateHeats} 
              className="flex-1 shadow-glow h-12" 
              disabled={generating || savingEdits}
              variant="outline"
            >
              <Shuffle className={`w-4 h-4 mr-2 ${savingEdits ? 'animate-spin' : ''}`} />
              {savingEdits ? 'Intercalando...' : 'Intercalar Baterias'}
            </Button>
          </div>
        </div>
        {savingEdits && (
          <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
            Salvando alterações...
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
                
                const categoryName = categories.find(c => c.id === heat.category_id)?.name || 'Categoria';
                const wodName = wods.find(w => w.id === heat.wod_id)?.name || 'WOD';

                const category = categories.find(c => c.id === heat.category_id);
                const maxAthletes = heat.athletes_per_heat || category?.athletes_per_heat || athletesPerHeat;
                const needsIntercalation = currentEntries.length < maxAthletes;

                return (
                  <SortableHeat key={heat.id} heat={heat}>
                    {({ dragAttributes, dragListeners }) => (
                      <Card className="p-6 shadow-card animate-fade-in relative">
                        {/* Ícone de arraste no canto superior esquerdo */}
                        <div 
                          {...dragAttributes} 
                          {...dragListeners} 
                          className="absolute top-4 left-4 cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded z-10"
                          title="Arraste para reordenar"
                        >
                          <GripVertical className="w-5 h-5 text-muted-foreground" />
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="default" className="text-lg px-4 py-2">
                              Bateria {heat.heat_number}
                            </Badge>
                            {(!selectedCategory || !selectedWOD) && (
                              <>
                                <Badge variant="outline" className="text-sm">
                                  {categoryName}
                                </Badge>
                                <Badge variant="outline" className="text-sm">
                                  {wodName}
                                </Badge>
                              </>
                            )}
                            <span className="text-muted-foreground">
                              {currentEntries.length} atletas/times
                            </span>
                            {needsIntercalation && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                                Precisa intercalar ({currentEntries.length}/{maxAthletes})
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {scheduledTime ? (
                              <>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm">{scheduledTime}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditTime(heat.id, heat.scheduled_time)}
                                  title="Editar horário"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditTime(heat.id, heat.scheduled_time)}
                                title="Definir horário"
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Definir Horário
                              </Button>
                            )}
                          </div>
                        </div>

                      <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                        <HeatDropZone heatId={heat.id} isEmpty={currentEntries.length === 0}>
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
                                    categoryId={heat.category_id}
                                  />
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </HeatDropZone>
                      </SortableContext>
                      </Card>
                    )}
                  </SortableHeat>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {filteredHeats.length === 0 && (
        <Card className="p-12 text-center shadow-card">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {selectedCategory && selectedWOD 
              ? "Nenhuma bateria gerada para este WOD ainda."
              : "Nenhuma bateria gerada ainda."
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedCategory && selectedWOD
              ? 'Clique em "Gerar Baterias" para organizar automaticamente.'
              : 'Selecione uma categoria e WOD ou clique em "GERAR TODAS AS BATERIAS" para gerar todas de uma vez.'
            }
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

      {/* Modal de Edição de Horário */}
      <Dialog open={!!editingTimeHeatId} onOpenChange={(open) => !open && setEditingTimeHeatId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Horário da Bateria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Novo Horário</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={newScheduledTime}
                onChange={(e) => setNewScheduledTime(e.target.value)}
                disabled={recalculatingTimes}
              />
              <p className="text-xs text-muted-foreground">
                Ao alterar este horário, todas as baterias seguintes serão recalculadas automaticamente
                considerando a duração do WOD e o intervalo entre baterias.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingTimeHeatId(null)}
                disabled={recalculatingTimes}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRecalculateHeatsTime}
                disabled={recalculatingTimes || !newScheduledTime}
              >
                {recalculatingTimes ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recalculando...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Aplicar e Recalcular
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
