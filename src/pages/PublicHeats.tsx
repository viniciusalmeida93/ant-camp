import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Heat {
  id: string;
  heat_number: number;
  scheduled_time: string | null;
  category_id: string;
  category_name: string;
  category_order?: number; // Ordem da categoria (order_index)
  wod_id: string;
  wod_name: string;
  wod_order?: number; // Ordem do WOD (order_num)
  day_number?: number;
  participants: Array<{
    participant_id: string;
    participant_name: string;
    lane_number: number | null;
    category_id?: string; // Categoria do participante
  }>;
  participant_categories?: string[]; // Categorias presentes na bateria (para baterias intercaladas)
}

export default function PublicHeats() {
  const { slug } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [heats, setHeats] = useState<Heat[]>([]);
  const [allHeats, setAllHeats] = useState<Heat[]>([]);
  const [championship, setChampionship] = useState<any>(null);
  const [nextHeat, setNextHeat] = useState<Heat | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWods] = useState<any[]>([]);
  const [championshipDays, setChampionshipDays] = useState<any[]>([]);
  const [dayWodsMap, setDayWodsMap] = useState<Map<string, number>>(new Map()); // Map<wod_id, day_number>
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWod, setSelectedWod] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");

  useEffect(() => {
    loadData();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('heats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heats'
        },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heat_entries'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  useEffect(() => {
    filterHeats();
  }, [selectedCategory, selectedWod, selectedDay, allHeats]);


  const loadData = async () => {
    try {
      if (!slug) {
        console.error("Slug não fornecido na URL");
        setLoading(false);
        return;
      }

      console.log("Buscando campeonato com slug:", slug);
      
      // Load championship
      const { data: champ, error: champError } = await supabase
        .from("championships")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (champError) {
        console.error("Erro ao buscar campeonato:", champError);
      }

      if (!champ) {
        console.error("Campeonato não encontrado com slug:", slug);
        setLoading(false);
        return;
      }

      console.log("Campeonato encontrado:", champ.name);
      
      setChampionship(champ);

      // Load categories com order_index para ordenação
      const { data: catsData } = await supabase
        .from("categories")
        .select("id, name, order_index")
        .eq("championship_id", champ.id)
        .order("order_index");

      if (catsData) setCategories(catsData);

      // Load WODs - APENAS WODS PUBLICADOS
      const { data: wodsData, error: wodsError } = await supabase
        .from("wods")
        .select("id, name")
        .eq("championship_id", champ.id)
        .eq("is_published", true) // Apenas WODs publicados aparecem nas páginas públicas
        .order("order_num");

      if (wodsError) {
        console.error("Erro ao carregar WODs:", wodsError);
      }

      if (wodsData) {
        console.log("WODs carregados:", wodsData.length, wodsData);
        setWods(wodsData);
      } else {
        console.log("Nenhum WOD encontrado para o campeonato");
      }

      // Load championship days and day-wod mapping
      const { data: daysData } = await supabase
        .from("championship_days")
        .select("id, day_number")
        .eq("championship_id", champ.id)
        .order("day_number");

      let dayWodsMapLocal = new Map<string, number>();
      
      if (daysData) {
        setChampionshipDays(daysData);
        
        // Load day-wod mappings
        const dayIds = daysData.map(d => d.id);
        console.log("IDs dos dias para buscar mapeamento:", dayIds);
        
        const { data: dayWodsData, error: dayWodsError } = await supabase
          .from("championship_day_wods")
          .select("championship_day_id, wod_id, championship_days(day_number)")
          .in("championship_day_id", dayIds);

        if (dayWodsError) {
          console.error("Erro ao buscar mapeamento dia-WOD:", dayWodsError);
        }

        if (dayWodsData) {
          console.log("Mapeamento dia-WOD carregado:", dayWodsData.length, "entradas");
          console.log("Dados brutos do mapeamento:", dayWodsData);
          
          dayWodsData.forEach((dw: any) => {
            if (dw.championship_days && dw.wod_id) {
              const dayNum = dw.championship_days.day_number;
              dayWodsMapLocal.set(dw.wod_id, dayNum);
              console.log(`WOD ${dw.wod_id} -> Dia ${dayNum}`);
            } else {
              console.warn("Entrada de mapeamento inválida:", dw);
            }
          });
          
          setDayWodsMap(dayWodsMapLocal);
          console.log("Mapa final dia-WOD:", Array.from(dayWodsMapLocal.entries()));
        } else {
          console.warn("Nenhum mapeamento dia-WOD encontrado!");
        }
      }

      // Load heats with entries
      console.log("Buscando baterias para o campeonato ID:", champ.id);
      
      // Primeiro, buscar as baterias sem os relacionamentos
      const { data: heatsData, error: heatsError } = await supabase
        .from("heats")
        .select("*")
        .eq("championship_id", champ.id)
        .order("scheduled_time", { ascending: true, nullsFirst: false })
        .order("heat_number", { ascending: true });

      if (heatsError) {
        console.error("Erro ao buscar baterias:", heatsError);
        setLoading(false);
        return;
      }

      console.log("Baterias retornadas da query:", heatsData?.length || 0);
      console.log("Dados brutos das baterias:", heatsData);

      if (!heatsData || heatsData.length === 0) {
        console.warn("Nenhuma bateria encontrada para este campeonato!");
        setAllHeats([]);
        setLoading(false);
        return;
      }

      // Buscar categorias e WODs separadamente
      const categoryIds = [...new Set(heatsData.map((h: any) => h.category_id))];
      const wodIds = [...new Set(heatsData.map((h: any) => h.wod_id))];
      
      console.log("IDs de categorias únicos:", categoryIds);
      console.log("IDs de WODs únicos:", wodIds);
      
      const { data: categoriesData, error: catsError } = await supabase
        .from("categories")
        .select("id, name, order_index")
        .in("id", categoryIds);
      
      if (catsError) {
        console.error("Erro ao buscar categorias:", catsError);
      }
      
      const { data: wodsDataFull, error: wodsErrorFull } = await supabase
        .from("wods")
        .select("id, name, order_num")
        .in("id", wodIds);
      
      if (wodsErrorFull) {
        console.error("Erro ao buscar WODs:", wodsErrorFull);
      }
      
      const categoriesMap = new Map((categoriesData || []).map((c: any) => [c.id, c.name]));
      const categoriesOrderMap = new Map((categoriesData || []).map((c: any) => [c.id, c.order_index ?? 0]));
      const wodsMap = new Map((wodsDataFull || []).map((w: any) => [w.id, w.name]));
      const wodsOrderMap = new Map((wodsDataFull || []).map((w: any) => [w.id, w.order_num ?? 0]));
      
      console.log("Mapa de categorias:", Array.from(categoriesMap.entries()));
      console.log("Mapa de ordem das categorias:", Array.from(categoriesOrderMap.entries()));
      console.log("Mapa de WODs:", Array.from(wodsMap.entries()));
      
      // Buscar heat_entries
      const heatIds = heatsData.map((h: any) => h.id);
      console.log("IDs das baterias para buscar entries:", heatIds.length, "baterias");
      
      // Buscar entries primeiro sem join para ver todos
      const { data: entriesDataRaw, error: entriesErrorRaw } = await supabase
        .from("heat_entries")
        .select("id, heat_id, lane_number, registration_id")
        .in("heat_id", heatIds);
      
      console.log("Entries brutos (sem join):", entriesDataRaw?.length || 0);
      if (entriesDataRaw && entriesDataRaw.length > 0) {
        console.log("Primeiro entry bruto:", entriesDataRaw[0]);
      }
      
      if (entriesErrorRaw) {
        console.error("Erro ao buscar entries:", entriesErrorRaw);
      }
      
      // Buscar registrations separadamente (incluindo category_id para filtro de baterias intercaladas)
      const registrationIds = [...new Set((entriesDataRaw || []).map((e: any) => e.registration_id).filter(Boolean))];
      console.log("IDs de registrations únicos:", registrationIds.length, registrationIds);
      
      let registrationsMap = new Map<string, any>();
      if (registrationIds.length > 0) {
        const { data: regsData, error: regsError } = await supabase
          .from("registrations")
          .select("id, team_name, athlete_name, category_id")
          .in("id", registrationIds);
        
        if (regsError) {
          console.error("Erro ao buscar registrations:", regsError);
        } else {
          console.log("Registrations carregados:", regsData?.length || 0);
          if (regsData && regsData.length > 0) {
            console.log("Primeiro registration exemplo:", regsData[0]);
          }
          (regsData || []).forEach((reg: any) => {
            registrationsMap.set(reg.id, reg);
          });
        }
      } else {
        console.warn("Nenhum registration_id encontrado nos entries!");
      }
      
      // Combinar entries com registrations
      const entriesData = (entriesDataRaw || []).map((entry: any) => {
        const reg = entry.registration_id ? registrationsMap.get(entry.registration_id) : null;
        if (!reg && entry.registration_id) {
          console.warn(`Registration não encontrado para ID: ${entry.registration_id}`);
        }
        return {
          ...entry,
          registrations: reg,
        };
      });
      
      console.log("Entries combinados:", entriesData.length);
      if (entriesData.length > 0) {
        console.log("Primeiro entry exemplo:", entriesData[0]);
        console.log("Registration do primeiro entry:", entriesData[0]?.registrations);
        console.log("Entries com registration:", entriesData.filter((e: any) => e.registrations).length);
        console.log("Entries sem registration:", entriesData.filter((e: any) => !e.registrations).length);
      }
      
      // Agrupar entries por heat_id
      const entriesByHeat = new Map<string, any[]>();
      entriesData.forEach((entry: any) => {
        if (!entriesByHeat.has(entry.heat_id)) {
          entriesByHeat.set(entry.heat_id, []);
        }
        entriesByHeat.get(entry.heat_id)!.push(entry);
      });

      console.log("Entries agrupados por heat:", entriesByHeat.size, "baterias com entries");

      if (heatsData && heatsData.length > 0) {
        console.log("Baterias carregadas do banco:", heatsData.length);
        console.log("Dados das baterias:", heatsData);
        console.log("Categorias encontradas:", categoriesMap);
        console.log("WODs encontrados:", wodsMap);
        console.log("Entries encontrados:", entriesByHeat.size);
        
        // Criar mapa de categorias por bateria (para baterias intercaladas)
        const heatCategoriesMap = new Map<string, Set<string>>(); // Map<heat_id, Set<category_id>>
        entriesData.forEach((entry: any) => {
          if (entry.registrations && entry.registrations.category_id) {
            if (!heatCategoriesMap.has(entry.heat_id)) {
              heatCategoriesMap.set(entry.heat_id, new Set());
            }
            heatCategoriesMap.get(entry.heat_id)!.add(entry.registrations.category_id);
          }
        });

        const formattedHeats: Heat[] = heatsData.map((heat: any) => {
          const dayNumber = dayWodsMapLocal.get(heat.wod_id);
          const categoryName = categoriesMap.get(heat.category_id) || 'Sem categoria';
          const categoryOrder = categoriesOrderMap.has(heat.category_id) 
            ? categoriesOrderMap.get(heat.category_id) 
            : 9999; // Ordem alta para categorias não encontradas
          const wodName = wodsMap.get(heat.wod_id) || 'Sem WOD';
          const wodOrder = wodsOrderMap.has(heat.wod_id)
            ? wodsOrderMap.get(heat.wod_id)
            : 9999; // Ordem alta para WODs não encontrados
          const entries = entriesByHeat.get(heat.id) || [];
          
          // Obter todas as categorias presentes nesta bateria (para baterias intercaladas)
          const heatCategories = heatCategoriesMap.get(heat.id) || new Set();
          
          console.log("Formatando bateria:", heat.id, "WOD:", wodName, "Ordem WOD:", wodOrder, "Categoria:", categoryName, "ID Categoria:", heat.category_id, "Ordem Categoria:", categoryOrder, "Dia:", dayNumber, "Entries:", entries.length, "Categorias presentes:", Array.from(heatCategories));
          
          // Mapear participantes com mais detalhes
          const participants = entries
            .filter((entry: any) => entry.registrations) // Filtrar entries sem registration
            .map((entry: any) => {
              const reg = entry.registrations;
              // Para times, usar team_name; para individuais, usar athlete_name
              const participantName = reg.team_name || reg.athlete_name || 'Desconhecido';
              console.log("Participante mapeado:", participantName, "Lane:", entry.lane_number, "Categoria:", reg.category_id);
              return {
                participant_id: entry.registration_id,
                participant_name: participantName,
                lane_number: entry.lane_number,
                category_id: reg.category_id, // Adicionar category_id do participante
              };
            })
            .sort((a, b) => (a.lane_number || 0) - (b.lane_number || 0)); // Ordenar por raia
          
          console.log("Participantes finais para bateria", heat.id, ":", participants.length);
          
          return {
            id: heat.id,
            heat_number: heat.heat_number,
            scheduled_time: heat.scheduled_time,
            category_id: heat.category_id,
            category_name: categoryName,
            category_order: categoryOrder, // Adicionar order_index da categoria
            wod_id: heat.wod_id,
            wod_name: wodName,
            wod_order: wodOrder, // Adicionar order_num do WOD
            day_number: dayNumber, // Pode ser undefined se WOD não estiver atribuído a um dia
            participants: participants,
            participant_categories: Array.from(heatCategories), // Categorias presentes na bateria
          };
        });

        console.log("Baterias formatadas:", formattedHeats.length);
        
        // Log de distribuição por dia
        const heatsByDay = new Map<number | undefined, number>();
        formattedHeats.forEach(h => {
          const day = h.day_number;
          heatsByDay.set(day, (heatsByDay.get(day) || 0) + 1);
        });
        console.log("Distribuição de baterias por dia:", Array.from(heatsByDay.entries()).map(([day, count]) => `Dia ${day || 'sem dia'}: ${count}`));
        
        // Log de participantes
        const totalParticipants = formattedHeats.reduce((sum, h) => sum + (h.participants?.length || 0), 0);
        console.log("Total de participantes em todas as baterias:", totalParticipants);
        
        // Ordenar baterias antes de definir: 1) WOD, 2) Categoria, 3) Horário, 4) Número da bateria
        const sortedHeats = [...formattedHeats].sort((a, b) => {
          // 1) Dia da prova
          const dayA = a.day_number ?? 9999;
          const dayB = b.day_number ?? 9999;
          if (dayA !== dayB) {
            return dayA - dayB;
          }

          // 2) Horário agendado
          if (a.scheduled_time && b.scheduled_time) {
            const diff = new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
            if (diff !== 0) return diff;
          } else if (a.scheduled_time) {
            return -1;
          } else if (b.scheduled_time) {
            return 1;
          }

          // 3) Ordem do WOD
          const wodOrderA = a.wod_order ?? 9999;
          const wodOrderB = b.wod_order ?? 9999;
          if (wodOrderA !== wodOrderB) {
            return wodOrderA - wodOrderB;
          }

          // 4) Ordem da categoria
          const categoryOrderA = a.category_order ?? 9999;
          const categoryOrderB = b.category_order ?? 9999;
          if (categoryOrderA !== categoryOrderB) {
            return categoryOrderA - categoryOrderB;
          }

          // 5) Número da bateria
          return a.heat_number - b.heat_number;
        });
        
        console.log("Baterias ordenadas. Primeira bateria:", sortedHeats[0]?.category_name, "Ordem:", sortedHeats[0]?.category_order);
        
        setAllHeats(sortedHeats);

        // Find next heat
        const now = new Date();
        const upcoming = sortedHeats.find(h => 
          h.scheduled_time && new Date(h.scheduled_time) > now
        );
        setNextHeat(upcoming || sortedHeats[0]);
      } else {
        console.warn("Nenhuma bateria encontrada para este campeonato!");
        setAllHeats([]);
      }
    } catch (error) {
      console.error("Error loading heats:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterHeats = () => {
    console.log("Filtrando baterias. Total de baterias:", allHeats.length);
    console.log("Filtros ativos - Categoria:", selectedCategory, "WOD:", selectedWod, "Dia:", selectedDay);
    
    let filtered = [...allHeats];

    if (selectedCategory !== "all") {
      const before = filtered.length;
      // Filtrar por categoria: considerar tanto a category_id da bateria quanto as categorias dos participantes
      filtered = filtered.filter(h => {
        // Verificar se a bateria tem a categoria selecionada como sua category_id original
        const hasOriginalCategory = h.category_id === selectedCategory;
        // Verificar se a bateria tem participantes da categoria selecionada (para baterias intercaladas)
        const hasCategoryParticipants = h.participant_categories?.includes(selectedCategory) || 
          h.participants?.some((p: any) => p.category_id === selectedCategory);
        return hasOriginalCategory || hasCategoryParticipants;
      });
      console.log(`Filtro por categoria: ${before} -> ${filtered.length}`);
    }

    if (selectedWod !== "all") {
      const before = filtered.length;
      filtered = filtered.filter(h => h.wod_id === selectedWod);
      console.log(`Filtro por WOD: ${before} -> ${filtered.length}`);
    }

    if (selectedDay !== "all") {
      const dayNum = parseInt(selectedDay);
      const before = filtered.length;
      // Filtrar por dia, considerando que day_number pode ser undefined
      filtered = filtered.filter(h => {
        const matches = h.day_number === dayNum;
        if (!matches && h.day_number === undefined) {
          console.log(`Bateria ${h.id} (WOD: ${h.wod_name}) não tem day_number definido`);
        }
        return matches;
      });
      console.log(`Filtro por dia ${dayNum}: ${before} -> ${filtered.length}`);
      console.log("Baterias após filtro de dia:", filtered.map(h => ({ id: h.id, wod: h.wod_name, day: h.day_number })));
    }

    // Ordenar exatamente como na página interna (HeatsNew.tsx)
    // Quando filtrar por categoria: ordenar por WOD primeiro, depois heat_number (mantém ordem sequencial global)
    // Isso garante que baterias intercaladas apareçam na posição correta:
    // - Filtrar "iniciante feminino": baterias 01, 02, 03 (03 é mista, aparece como última)
    // - Filtrar "iniciante masculino": baterias 03, 04 (03 é mista, aparece como primeira)
    filtered.sort((a, b) => {
      // 1) Dia da prova (se houver)
      const dayA = a.day_number ?? 9999;
      const dayB = b.day_number ?? 9999;
      if (dayA !== dayB) {
        return dayA - dayB;
      }

      // 2) Horário agendado
      if (a.scheduled_time && b.scheduled_time) {
        const diff = new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
        if (diff !== 0) return diff;
      } else if (a.scheduled_time) {
        return -1;
      } else if (b.scheduled_time) {
        return 1;
      }

      // 3) Ordem do WOD (order_num) - SEMPRE verificar WOD primeiro, mesmo quando filtrar por categoria
      const wodOrderA = a.wod_order ?? 9999;
      const wodOrderB = b.wod_order ?? 9999;
      if (wodOrderA !== wodOrderB) {
        return wodOrderA - wodOrderB;
      }

      // 4) Se há categoria selecionada, ordenar por heat_number para manter ordem sequencial global
      // Isso garante que baterias intercaladas apareçam na posição correta dentro da categoria
      if (selectedCategory !== "all") {
        return a.heat_number - b.heat_number;
      }

      // 5) Sem filtro de categoria: ordenar por categoria original, depois número
      const categoryOrderA = a.category_order ?? 9999;
      const categoryOrderB = b.category_order ?? 9999;
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      // 6) Número da bateria como último critério
      return a.heat_number - b.heat_number;
    });

    console.log("Baterias após filtros:", filtered.length);
    setHeats(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Campeonato não encontrado</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">{championship.name}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Programação de Baterias
        </p>

        {/* Filtros */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="filter-category" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Categoria
              </Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="filter-category">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-wod" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Prova
              </Label>
              <Select value={selectedWod} onValueChange={setSelectedWod}>
                <SelectTrigger id="filter-wod">
                  <SelectValue placeholder="Todas as provas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as provas</SelectItem>
                  {wods.map((wod) => (
                    <SelectItem key={wod.id} value={wod.id}>
                      {wod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-day" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Dia
              </Label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger id="filter-day">
                  <SelectValue placeholder="Todos os dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dias</SelectItem>
                  {championshipDays.map((day) => (
                    <SelectItem key={day.id} value={day.day_number.toString()}>
                      {day.day_number}º Dia
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
      </div>

      {/* All Heats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {heats.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-sm sm:text-base text-muted-foreground">Nenhuma bateria encontrada com os filtros selecionados.</p>
            </CardContent>
          </Card>
        ) : (
          heats.map((heat) => {
            const isNextHeat = nextHeat?.id === heat.id;
            return (
              <Card 
                key={heat.id}
                className={isNextHeat ? "border-2 border-primary shadow-lg" : ""}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl truncate">
                        Bateria {heat.heat_number}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {heat.category_name}
                      </p>
                      <p className="text-sm sm:text-base font-semibold truncate">
                        {heat.wod_name}
                      </p>
                    </div>
                    {isNextHeat && (
                      <Badge className="shrink-0 text-xs">
                        Próxima
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {heat.scheduled_time ? (
                    <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-primary" />
                      <span className="font-semibold text-foreground">
                        {format(new Date(heat.scheduled_time), "HH:mm", { locale: ptBR })}
                      </span>
                      {heat.day_number && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          Dia {heat.day_number}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span>Horário a definir</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span>{(heat.participants || []).length} atletas</span>
                  </div>
                  {heat.participants && heat.participants.length > 0 ? (
                    <div className="space-y-1.5 sm:space-y-2 mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Participantes ({(heat.participants || []).length}):
                      </p>
                      {heat.participants.map((participant, idx) => (
                        <div 
                          key={participant.participant_id || `participant-${idx}`}
                          className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded bg-muted/50 hover:bg-muted/70 transition-colors"
                        >
                          <span className="font-semibold text-xs sm:text-sm min-w-[1.5rem] sm:min-w-8 text-center bg-primary/10 text-primary rounded px-1">
                            {participant.lane_number || idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-medium truncate flex-1" title={participant.participant_name}>
                            {participant.participant_name || 'Sem nome'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs sm:text-sm text-muted-foreground text-center py-2">
                      Nenhum participante cadastrado
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
