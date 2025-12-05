import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Target, Dumbbell, Loader2, Trophy, Upload, Clock, Settings, CheckCircle2, Plus, QrCode } from 'lucide-react';
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
// REMOVIDO: Não criar resultados fictícios automaticamente
// import { generateDemoData } from '@/utils/generateDemoData';
// import { ensureScaleTrios } from '@/utils/ensureScaleTrios';
// import { ensureRandomResults } from '@/utils/ensureRandomResults';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedChampionship, setSelectedChampionship, championships, loadChampionships, loading: contextLoading } = useChampionship();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editInfoData, setEditInfoData] = useState({
    date: '',
    location: '',
    registrationEndDate: '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    athletes: 0,
    categories: 0,
    wods: 0,
    teams: 0,
  });
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

  // DESABILITADO: Geração automática de dados demo
  // useEffect(() => {
  //   const seedDemoData = async () => {
  //     if (!selectedChampionship) return;
  //     // Código de demo desabilitado para evitar conflitos
  //   };
  //   seedDemoData();
  // }, [selectedChampionship]);

  useEffect(() => {
    const ensureDemoConsistency = async () => {
      if (!selectedChampionship) return;
      const championshipId = selectedChampionship.id;

      let shouldRefresh = false;

      // DESABILITADO: Não criar resultados fictícios automaticamente
      // Os resultados devem ser lançados manualmente
      /*
      if (!scaleTriosEnsuredRef.current.has(championshipId)) {
        try {
          const { added } = await ensureScaleTrios(championshipId);
          if (added > 0) {
            shouldRefresh = true;
          }
        } catch (error: any) {
          console.error('Erro ao garantir times fictícios:', error);
        } finally {
          scaleTriosEnsuredRef.current.add(championshipId);
        }
      }

      if (!randomResultsEnsuredRef.current.has(championshipId)) {
        try {
          const { generated } = await ensureRandomResults(championshipId);
          if (generated > 0) {
            shouldRefresh = true;
          }
        } catch (error: any) {
          console.error('Erro ao gerar resultados aleatórios:', error);
        } finally {
          randomResultsEnsuredRef.current.add(championshipId);
        }
      }
      */

      if (shouldRefresh) {
        await Promise.all([
          loadStats(),
          loadWODs(),
          loadChampionshipDays(),
        ]);
      }
    };

    ensureDemoConsistency();
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
          .select("id, team_name, team_members, category_id")
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

    setStats({
        categories: categoriesResult.count || 0,
        wods: wodsResult.count || 0,
        athletes: totalAthletes,
        teams: teams,
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
          startTime: '', // Não usado mais, cada dia tem seu próprio horário
          breakIntervalMinutes: 5, // Valor padrão, não usado mais (cada dia tem seu próprio intervalo)
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

        // Carregar WODs de cada dia
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
        // Se não há dias, criar baseado no total_days
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
      // Adicionar novos dias
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
      // Remover dias extras
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

      // Atualizar estado local
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
      console.log(`Atualizando campo ${field} para dia ${dayId} com valor:`, value);
      
      const { error } = await supabase
        .from("championship_days")
        .update({ [field]: value })
        .eq("id", dayId);

      if (error) {
        console.error("Erro do Supabase:", error);
        throw error;
      }

      // Atualizar estado local
      setChampionshipDays(prev => prev.map(day => 
        day.id === dayId ? { ...day, [field]: value } : day
      ));
      
      console.log(`✓ Campo ${field} atualizado com sucesso para valor:`, value);
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

      // NÃO recalcular horários automaticamente - apenas salvar as configurações
      // Os horários serão recalculados apenas quando necessário (ex: ao gerar baterias)
      // Isso preserva os horários que o usuário já definiu manualmente

      toast.success("Configuração salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving schedule config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCalculateSchedule = async () => {
    if (!selectedChampionship) return;

    setLoadingSchedule(true);
    try {
      // Recarregar os dias para garantir que temos os valores mais recentes do banco
      const { data: daysDataFresh, error: daysErrorFresh } = await supabase
        .from("championship_days")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("day_number");

      if (daysErrorFresh) throw daysErrorFresh;

      // Atualizar o estado com os dados frescos
      if (daysDataFresh && daysDataFresh.length > 0) {
        setChampionshipDays(daysDataFresh);
        console.log("Dias recarregados do banco:", daysDataFresh.map(d => ({
          day: d.day_number,
          start_time: d.start_time,
          break_interval_minutes: d.break_interval_minutes,
          enable_break: d.enable_break,
          break_duration_minutes: d.break_duration_minutes,
          break_after_wod_number: d.break_after_wod_number
        })));
      }

      // Buscar todas as baterias do campeonato
      const { data: allHeats, error: heatsError } = await supabase
        .from("heats")
        .select("*, wods(*)")
        .eq("championship_id", selectedChampionship.id)
        .order("heat_number");

      if (heatsError) throw heatsError;

      const variationMap = new Map<string, Map<string, any>>();
      const wodIdsForVariations = wods.map(wod => wod.id);
      if (wodIdsForVariations.length > 0) {
        const { data: variationData, error: variationsError } = await supabase
          .from("wod_category_variations")
          .select("*")
          .in("wod_id", wodIdsForVariations);

        if (variationsError) {
          if (variationsError.code === '42P01' || (variationsError.message ?? '').includes('wod_category_variations')) {
            console.warn('Tabela wod_category_variations ausente; agendamento utilizará durações padrão.');
          } else {
            throw variationsError;
          }
        } else {
          (variationData || []).forEach((variation: any) => {
            if (!variationMap.has(variation.wod_id)) {
              variationMap.set(variation.wod_id, new Map());
            }
            variationMap.get(variation.wod_id)!.set(variation.category_id, variation);
          });
        }
      }

      // Mapa para rastrear quais WODs já foram processados
      const processedWodIds = new Set<string>();

      // Para cada dia, calcular horários (usar dados frescos do banco)
      const daysToProcess = daysDataFresh && daysDataFresh.length > 0 ? daysDataFresh : championshipDays;
      for (const day of daysToProcess) {
        const dayWodsList = dayWods.get(day.day_number) || [];
        if (dayWodsList.length === 0) continue;

        // Verificar se já existe uma primeira bateria com horário definido para este dia
        // Se existir, usar esse horário como ponto de partida (respeitando o horário manual do usuário)
        const firstHeatOfDay = (allHeats || [])
          .filter(h => {
            const heatDay = dayWodsList.find(w => w.id === h.wod_id);
            return heatDay !== undefined;
          })
          .sort((a, b) => a.heat_number - b.heat_number)[0];

        let dayStartTime: string;
        let useExistingFirstHeatTime = false;

        if (firstHeatOfDay && firstHeatOfDay.scheduled_time) {
          // Usar o horário da primeira bateria existente
          const firstHeatDate = new Date(firstHeatOfDay.scheduled_time);
          const hours = firstHeatDate.getHours().toString().padStart(2, '0');
          const mins = firstHeatDate.getMinutes().toString().padStart(2, '0');
          dayStartTime = `${hours}:${mins}`;
          useExistingFirstHeatTime = true;
          console.log(`Dia ${day.day_number}: Usando horário da primeira bateria existente: ${dayStartTime}`);
        } else {
          // Horário de início do dia (priorizar start_time do dia, senão usar o global)
          // Converter start_time do formato TIME do PostgreSQL (HH:MM:SS) para HH:MM
          if (day.start_time) {
            if (typeof day.start_time === 'string' && day.start_time.includes(':')) {
              const parts = day.start_time.split(':');
              dayStartTime = `${parts[0]}:${parts[1]}`;
            } else {
              dayStartTime = day.start_time;
            }
          } else {
            dayStartTime = day.start_time || ''; // Não usar valor padrão, apenas o que está configurado
            if (!dayStartTime) {
              console.log(`⚠️ Dia ${day.day_number} não tem horário de início configurado. Pulando cálculo automático.`);
              continue; // Pular este dia se não tiver horário configurado
            }
          }
          console.log(`Dia ${day.day_number}: Início às ${dayStartTime} (day.start_time: ${day.start_time}, scheduleConfig.startTime: ${scheduleConfig.startTime})`);
        }
        
        // Criar data em horário LOCAL (não UTC)
        const [hours, mins] = dayStartTime.split(':');
        const [year, month, dayNum] = day.date.split('-');
        const startTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayNum), parseInt(hours), parseInt(mins), 0, 0);
        let currentTime = new Date(startTime);

        // Para cada WOD do dia (em ordem)
        for (let wodIndex = 0; wodIndex < dayWodsList.length; wodIndex++) {
          const wod = dayWodsList[wodIndex];
          // Buscar duração do WOD diretamente do banco para garantir valor atualizado
          const { data: wodData } = await supabase
            .from("wods")
            .select("estimated_duration_minutes")
            .eq("id", wod.id)
            .single();

          const baseDuration = (wodData?.estimated_duration_minutes ?? wod.estimated_duration_minutes) || 10;
          console.log(`WOD ${wod.name}: Duração base = ${baseDuration} minutos (do banco: ${wodData?.estimated_duration_minutes}, do estado: ${wod.estimated_duration_minutes})`);

          // Buscar todas as baterias deste WOD, agrupadas por categoria
          const wodHeats = (allHeats || []).filter(h => h.wod_id === wod.id);
          
          if (wodHeats.length === 0) continue;

          // Marcar este WOD como processado
          processedWodIds.add(wod.id);

          // Agrupar baterias por categoria e ordenar
          const heatsByCategory = new Map<string, any[]>();
          wodHeats.forEach(heat => {
            if (!heatsByCategory.has(heat.category_id)) {
              heatsByCategory.set(heat.category_id, []);
            }
            heatsByCategory.get(heat.category_id)!.push(heat);
          });

          // Para cada categoria, calcular horários das baterias
          // Ordenar categorias por order_index
          const categoryIds = Array.from(heatsByCategory.keys());
          const { data: categoriesData } = await supabase
            .from("categories")
            .select("id, order_index")
            .in("id", categoryIds);
          
          const categoryOrderMap = new Map((categoriesData || []).map(c => [c.id, c.order_index || 0]));
          const sortedCategoryIds = categoryIds.sort((a, b) => {
            const orderA = categoryOrderMap.get(a) || 0;
            const orderB = categoryOrderMap.get(b) || 0;
            return orderA - orderB;
          });

          // Calcular horários: todas as baterias da primeira categoria, depois todas da segunda, etc.
          for (const categoryId of sortedCategoryIds) {
            const categoryHeats = heatsByCategory.get(categoryId) || [];
            const sortedHeats = categoryHeats.sort((a, b) => a.heat_number - b.heat_number);

            const variationForCategory = variationMap.get(wod.id)?.get(categoryId);
            const wodDuration = variationForCategory?.estimated_duration_minutes ?? baseDuration;

            // Calcular horário para cada bateria desta categoria neste WOD
            // Usar intervalo do dia (já recarregado do banco no início da função)
            const dayBreakInterval = (day.break_interval_minutes !== null && day.break_interval_minutes !== undefined)
              ? day.break_interval_minutes
              : 5; // Padrão se não definido
            
            const dayWodInterval = (day.wod_interval_minutes !== null && day.wod_interval_minutes !== undefined)
              ? day.wod_interval_minutes
              : 10; // Padrão se não definido
            
            // Se é a primeira categoria do WOD e não é o primeiro WOD do dia, aplicar intervalo entre provas
            const isFirstCategoryOfWod = categoryId === sortedCategoryIds[0];
            const isNotFirstWod = wodIndex > 0;
            
            if (isFirstCategoryOfWod && isNotFirstWod) {
              // Aplicar intervalo entre provas antes da primeira bateria deste WOD
              currentTime = new Date(currentTime.getTime() + (dayWodInterval * 60000));
              console.log(`[Dia ${day.day_number}] Intervalo entre provas de ${dayWodInterval} minutos aplicado antes do WOD ${wod.name}`);
            }
            
            console.log(`Dia ${day.day_number}: Usando intervalo entre baterias de ${dayBreakInterval} minutos e intervalo entre provas de ${dayWodInterval} minutos`);
            
            for (const heat of sortedHeats) {
              // Salvar horário usando toISOString (converte para UTC automaticamente)
              const scheduledTime = currentTime.toISOString();
              const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

              const { error: updateError } = await supabase
                .from("heats")
                .update({ scheduled_time: scheduledTime })
                .eq("id", heat.id);

              if (updateError) {
                console.error(`Erro ao atualizar horário da bateria ${heat.id}:`, updateError);
              } else {
                console.log(`✓ Bateria ${heat.heat_number} (${wod.name} - ${categoryId}): ${timeStr}, Duração WOD: ${wodDuration}min, Intervalo: ${dayBreakInterval}min`);
              }

              // Avançar tempo: duração do WOD + intervalo entre baterias
              // O intervalo é aplicado APÓS a duração do WOD
              // IMPORTANTE: O intervalo é em MINUTOS, então multiplicamos por 60000 para converter para milissegundos
              currentTime = new Date(currentTime.getTime() + (wodDuration * 60000)); // Duração do WOD em milissegundos
              currentTime = new Date(currentTime.getTime() + (dayBreakInterval * 60000)); // Intervalo entre baterias em milissegundos
              
              const nextTimeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
              console.log(`  → Próxima bateria será às: ${nextTimeStr} (avançou ${wodDuration + dayBreakInterval} minutos no total)`);
            }
          }

          // Verificar se precisa aplicar pausa APÓS este WOD
          // Priorizar configuração de pausa do dia sobre a configuração global
          const dayBreakEnabled = day.enable_break !== undefined ? day.enable_break : scheduleConfig.enableBreak;
          const dayBreakAfterWod = day.break_after_wod_number !== null && day.break_after_wod_number !== undefined 
            ? day.break_after_wod_number 
            : scheduleConfig.breakAfterWodNumber;
          const dayBreakDuration = day.break_duration_minutes !== null && day.break_duration_minutes !== undefined
            ? day.break_duration_minutes
            : scheduleConfig.breakDurationMinutes;

          console.log(`[Dia ${day.day_number}] Verificando pausa após WOD ${wodIndex + 1} (${wod.name}): enable=${dayBreakEnabled}, afterWod=${dayBreakAfterWod}, duration=${dayBreakDuration}, day.break_after_wod_number=${day.break_after_wod_number}`);

          // Verificar se a pausa deve ser aplicada após este WOD
          // Comparar o índice do WOD (wodIndex + 1) com break_after_wod_number
          const shouldApplyBreak = dayBreakEnabled && 
              dayBreakAfterWod !== null && 
              dayBreakAfterWod !== undefined && 
              (wodIndex + 1) === dayBreakAfterWod;

          if (shouldApplyBreak) {
            // Adicionar pausa após todas as baterias deste WOD
            // A pausa é aplicada após o último intervalo entre baterias
            // Então não precisamos subtrair o intervalo, pois já foi aplicado na última bateria
            const beforePause = new Date(currentTime);
            currentTime = new Date(currentTime.getTime() + dayBreakDuration * 60000);
            console.log(`✓✓✓ [Dia ${day.day_number}] PAUSA de ${dayBreakDuration} minutos aplicada após WOD ${wodIndex + 1} (${wod.name}). Horário antes: ${beforePause.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}, Horário depois: ${currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}`);
          } else {
            console.log(`  → [Dia ${day.day_number}] Sem pausa após este WOD (enable=${dayBreakEnabled}, afterWod=${dayBreakAfterWod}, currentWodIndex=${wodIndex + 1}, comparação: ${wodIndex + 1} === ${dayBreakAfterWod} = ${(wodIndex + 1) === dayBreakAfterWod})`);
          }
        }
      }

      // Processar baterias de WODs que não estão atribuídos a nenhum dia
      // Agrupar por WOD
      const unprocessedHeats = (allHeats || []).filter(h => !processedWodIds.has(h.wod_id));
      
      if (unprocessedHeats.length > 0) {
        // Usar o primeiro dia ou criar um horário base
        const firstDay = championshipDays.length > 0 ? championshipDays[0] : null;
        const baseDate = firstDay?.date || selectedChampionship.date;
        let baseStartTime = firstDay?.start_time || '';
        if (!baseStartTime) {
          console.log('⚠️ Nenhum horário de início configurado. Não é possível calcular horários automaticamente.');
          toast.warning('Configure o horário de início nos dias do campeonato antes de calcular.');
          return;
        }
        
        // Garantir formato HH:MM
        if (typeof baseStartTime === 'string' && baseStartTime.includes(':')) {
          const parts = baseStartTime.split(':');
          baseStartTime = `${parts[0]}:${parts[1]}`;
        }
        
        // Criar data em horário LOCAL (não UTC)
        const [hours, mins] = baseStartTime.split(':');
        const [year, month, dayNum] = baseDate.split('-');
        let currentTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayNum), parseInt(hours), parseInt(mins), 0, 0);

        // Agrupar por WOD
        const heatsByWod = new Map<string, any[]>();
        unprocessedHeats.forEach(heat => {
          if (!heatsByWod.has(heat.wod_id)) {
            heatsByWod.set(heat.wod_id, []);
          }
          heatsByWod.get(heat.wod_id)!.push(heat);
        });

        // Buscar informações dos WODs
        const wodIds = Array.from(heatsByWod.keys());
        const { data: wodsData } = await supabase
          .from("wods")
          .select("id, order_num, estimated_duration_minutes")
          .in("id", wodIds);

        const wodsMap = new Map((wodsData || []).map(w => [w.id, w]));
        
        // Ordenar WODs por order_num
        const sortedWodIds = wodIds.sort((a, b) => {
          const wodA = wodsMap.get(a);
          const wodB = wodsMap.get(b);
          const orderA = wodA?.order_num || 0;
          const orderB = wodB?.order_num || 0;
          return orderA - orderB;
        });

        // Processar cada WOD não atribuído
        for (const wodId of sortedWodIds) {
          const wod = wodsMap.get(wodId);
          const wodDuration = wod?.estimated_duration_minutes || 15;
          const wodHeats = heatsByWod.get(wodId) || [];

          // Agrupar por categoria
          const heatsByCategory = new Map<string, any[]>();
          wodHeats.forEach(heat => {
            if (!heatsByCategory.has(heat.category_id)) {
              heatsByCategory.set(heat.category_id, []);
            }
            heatsByCategory.get(heat.category_id)!.push(heat);
          });

          // Ordenar categorias
          const categoryIds = Array.from(heatsByCategory.keys());
          const { data: categoriesData } = await supabase
            .from("categories")
            .select("id, order_index")
            .in("id", categoryIds);
          
          const categoryOrderMap = new Map((categoriesData || []).map(c => [c.id, c.order_index || 0]));
          const sortedCategoryIds = categoryIds.sort((a, b) => {
            const orderA = categoryOrderMap.get(a) || 0;
            const orderB = categoryOrderMap.get(b) || 0;
            return orderA - orderB;
          });

          // Calcular horários para cada categoria
          for (const categoryId of sortedCategoryIds) {
            const categoryHeats = heatsByCategory.get(categoryId) || [];
            const sortedHeats = categoryHeats.sort((a, b) => a.heat_number - b.heat_number);

            for (const heat of sortedHeats) {
              const scheduledTime = currentTime.toISOString();

              await supabase
                .from("heats")
                .update({ scheduled_time: scheduledTime })
                .eq("id", heat.id);

              // Avançar tempo: duração do WOD + intervalo entre baterias
              // O intervalo é aplicado APÓS a duração do WOD
              // Para WODs não atribuídos, usar intervalo padrão de 5 minutos
              const defaultBreakInterval = 5;
              
              currentTime = new Date(currentTime.getTime() + wodDuration * 60000); // Duração do WOD
              currentTime = new Date(currentTime.getTime() + defaultBreakInterval * 60000); // Intervalo entre baterias
            }
          }
        }
      }

      toast.success("Horários calculados e aplicados automaticamente!");
    } catch (error: any) {
      console.error("Error calculating schedule:", error);
      toast.error("Erro ao calcular horários");
    } finally {
      setLoadingSchedule(false);
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
      setIsDialogOpen(false);
      setFormData({ name: '', date: '', location: '', description: '' });
      
      // Reload championships and select the new one
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // If no championships and no selected championship, show create screen
  if (championships.length === 0 && !selectedChampionship) {
    return (
      <div className="container mx-auto px-4 py-8">
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

  // Show championship selector and dashboard
  return (
    <div className="container mx-auto px-4 py-8">
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
            <SelectValue placeholder="Escolha um campeonato" />
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
                            date: selectedChampionship.date ? selectedChampionship.date.split('T')[0] : '',
                            location: selectedChampionship.location || '',
                            registrationEndDate: selectedChampionship.registration_end_date ? selectedChampionship.registration_end_date.split('T')[0] : '',
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
                        <div className="space-y-2">
                          <Label htmlFor="edit-date">Data do Campeonato *</Label>
                          <Input
                            id="edit-date"
                            type="date"
                            value={editInfoData.date}
                            onChange={(e) => setEditInfoData({ ...editInfoData, date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-location">Local *</Label>
                          <Input
                            id="edit-location"
                            value={editInfoData.location}
                            onChange={(e) => setEditInfoData({ ...editInfoData, location: e.target.value })}
                            placeholder="Ex: Box CrossFit, Rua Exemplo, 123"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-registration-end-date">Data de Encerramento das Inscrições</Label>
                          <Input
                            id="edit-registration-end-date"
                            type="date"
                            value={editInfoData.registrationEndDate}
                            onChange={(e) => setEditInfoData({ ...editInfoData, registrationEndDate: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Deixe em branco para não ter data limite de inscrição
                          </p>
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
                              if (!editInfoData.date || !editInfoData.location) {
                                toast.error('Data e Local são obrigatórios');
                                return;
                              }

                              try {
                                setSavingInfo(true);
                                const updateData: Record<string, any> = {
                                  date: editInfoData.date,
                                  location: editInfoData.location.trim(),
                                };

                                if (editInfoData.registrationEndDate) {
                                  updateData.registration_end_date = editInfoData.registrationEndDate;
                                } else {
                                  updateData.registration_end_date = null;
                                }

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
          title="Categorias Ativas"
          value={stats.categories}
          icon={Target}
          trend="Disponíveis"
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
                {/* Basic Schedule Settings */}
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

                {/* Break Configuration - Info */}
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

                {/* Days and WODs Distribution */}
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
                    // WODs disponíveis são aqueles que não estão em nenhum dia
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

                        {/* Configuração de Pausa para este Dia */}
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

                {/* Action Buttons */}
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
