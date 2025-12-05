import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, RefreshCw, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// REMOVIDO: Usando função local que inclui todos os registros mesmo sem resultados
// import { calculateLeaderboard } from '@/lib/scoring';

interface LeaderboardEntry {
  registrationId: string;
  participantName: string;
  categoryId: string;
  totalPoints: number;
  position: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  lastWodPosition?: number;
  wodResults: any[];
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWODs] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [wodResults, setWodResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadData();
    }
  }, [selectedChampionship]);

  useEffect(() => {
    if (selectedCategory) {
      loadLeaderboard();
    }
  }, [selectedCategory, wodResults]);

  // Listener para mudanças em tempo real na tabela wod_results
  useEffect(() => {
    if (!selectedCategory) return;

    console.log('👂 Configurando listener para categoria:', selectedCategory);

    const channel = supabase
      .channel(`wod_results_changes_${selectedCategory}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'wod_results',
          filter: `category_id=eq.${selectedCategory}`
        },
        (payload) => {
          console.log('🔔 Mudança detectada em wod_results:', payload.eventType, payload);
          // Forçar recarregamento imediato
          loadLeaderboard();
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do listener:', status);
      });

    return () => {
      console.log('🔇 Removendo listener');
      supabase.removeChannel(channel);
    };
  }, [selectedCategory]);

  // Recarregar quando a página ganha foco (por exemplo, quando volta da página de Results)
  useEffect(() => {
    const handleFocus = () => {
      if (selectedCategory) {
        loadLeaderboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedCategory]);

  // Listener para evento customizado quando resultados são atualizados
  useEffect(() => {
    const handleResultsUpdate = () => {
      if (selectedCategory) {
        console.log('🔔 Evento customizado recebido: wod_results_updated - Forçando recarregamento...');
        // Forçar recarregamento imediato
        loadLeaderboard();
      }
    };

    window.addEventListener('wod_results_updated', handleResultsUpdate);
    console.log('👂 Listener de evento customizado configurado');
    return () => {
      window.removeEventListener('wod_results_updated', handleResultsUpdate);
      console.log('🔇 Listener de evento customizado removido');
    };
  }, [selectedCategory]);

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

  const loadLeaderboard = async () => {
    if (!selectedCategory) return;

    try {
      console.log('🔄 Carregando leaderboard para categoria:', selectedCategory);
      
      // Criar mapa de nomes dos participantes
      const participantNames = new Map<string, string>();
      registrations.forEach(reg => {
        if (reg.team_name) {
          participantNames.set(reg.id, reg.team_name);
        } else {
          participantNames.set(reg.id, reg.athlete_name || 'Atleta');
        }
      });

      // Verificar se há scoring config
      const { data: configData, error: configError } = await supabase
        .from("scoring_configs")
        .select("*")
        .eq("category_id", selectedCategory)
        .maybeSingle();

      if (configError) {
        console.error("Error loading scoring config:", configError);
      }

      if (!configData) {
        console.warn("Nenhuma configuração de pontuação encontrada para esta categoria");
        toast.warning("Configure a pontuação desta categoria na aba 'Pontuação' primeiro");
      }

      // SEMPRE buscar dados mais recentes do banco (sem cache)
      const { data: resultsData, error: resultsError } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("created_at");

      if (resultsError) throw resultsError;
      
      console.log('📊 Resultados encontrados:', resultsData?.length || 0);
      
      // Verificar se os resultados têm pontos calculados
      const resultsWithoutPoints = (resultsData || []).filter(r => !r.points && !r.position && r.status !== 'dns' && r.status !== 'dnf');
      
      // Se houver resultados sem pontos e houver config, recalcular
      if (resultsWithoutPoints.length > 0 && configData) {
        console.log(`Recalculando pontos para ${resultsWithoutPoints.length} resultados...`);
        
        // Agrupar por WOD
        const resultsByWod = new Map<string, any[]>();
        resultsData?.forEach(result => {
          const wodId = result.wod_id;
          if (!resultsByWod.has(wodId)) {
            resultsByWod.set(wodId, []);
          }
          resultsByWod.get(wodId)!.push(result);
        });

        // Recalcular pontos para cada WOD
        const { calculateWODPoints } = await import('@/lib/scoring');
        
        for (const [wodId, wodResults] of resultsByWod) {
          const wod = wods.find(w => w.id === wodId);
          if (!wod) continue;

          // Converter para formato do scoring
          const resultsForScoring = wodResults.map((r: any) => ({
            id: r.id,
            wodId: r.wod_id,
            categoryId: r.category_id,
            registrationId: r.registration_id,
            result: r.result,
            tiebreakValue: r.tiebreak_value,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));

          // Calcular pontos
          const pointsTable = configData.points_table;
          const scoringConfig = {
            id: configData.id,
            categoryId: configData.category_id,
            presetType: configData.preset_type as any,
            pointsTable: (pointsTable && typeof pointsTable === 'object') 
              ? (pointsTable as { [position: number]: number })
              : {},
            dnfPoints: configData.dnf_points || 0,
            dnsPoints: configData.dns_points || 0,
            createdAt: configData.created_at || '',
            updatedAt: configData.updated_at || '',
          };

          const resultsWithPoints = calculateWODPoints(resultsForScoring, scoringConfig, wod.type);

          // Atualizar no banco
          for (const result of resultsWithPoints) {
            await supabase
              .from("wod_results")
              .update({
                position: result.position,
                points: result.points,
              })
              .eq("id", result.id);
          }
        }

        // Recarregar resultados após recalcular
        const { data: updatedResults, error: updatedError } = await supabase
          .from("wod_results")
          .select("*")
          .eq("category_id", selectedCategory)
          .order("created_at");

        if (updatedError) throw updatedError;
        setWodResults(updatedResults || []);
        
        // Calcular leaderboard com resultados atualizados
        const entries = calculateLeaderboard(updatedResults || []);
        setLeaderboard(entries);
        console.log('✅ Leaderboard atualizado com', entries.length, 'participantes');
      } else {
        // Se não há resultados para recalcular, apenas atualizar
        setWodResults(resultsData || []);
        
        // Calcular leaderboard (mesmo que vazio, mostra todos zerados)
        const entries = calculateLeaderboard(resultsData || []);
        setLeaderboard(entries);
        console.log('✅ Leaderboard atualizado. Resultados:', resultsData?.length || 0, 'Participantes:', entries.length);
      }
    } catch (error: any) {
      console.error("❌ Error loading leaderboard:", error);
      toast.error("Erro ao carregar leaderboard");
    }
  };

  const calculateLeaderboard = (results: any[]): LeaderboardEntry[] => {
    console.log('📊 Calculando leaderboard. Resultados recebidos:', results.length);
    console.log('👥 Total de registros da categoria:', registrations.filter(r => r.category_id === selectedCategory).length);
    
    // Agrupar resultados por registration_id
    const participantMap = new Map<string, any[]>();
    
    results.forEach(result => {
      const regId = result.registration_id;
      if (!regId) return;
      
      if (!participantMap.has(regId)) {
        participantMap.set(regId, []);
      }
      participantMap.get(regId)!.push(result);
    });

    // Criar entradas do leaderboard
    // IMPORTANTE: Incluir TODOS os registros da categoria, mesmo sem resultados
    const entries: LeaderboardEntry[] = [];
    const processedRegIds = new Set<string>();
    
    // Primeiro, processar participantes com resultados
    participantMap.forEach((wodResults, registrationId) => {
      const reg = registrations.find(r => r.id === registrationId);
      if (!reg) return;
      
      processedRegIds.add(registrationId);

      const totalPoints = wodResults.reduce((sum, r) => sum + (r.points || 0), 0);
      const firstPlaces = wodResults.filter(r => r.position === 1).length;
      const secondPlaces = wodResults.filter(r => r.position === 2).length;
      const thirdPlaces = wodResults.filter(r => r.position === 3).length;
      
      // Ordenar resultados por ordem dos WODs (order_num) e depois por created_at
      const sortedResults = [...wodResults].sort((a, b) => {
        const wodA = wods.find(w => w.id === a.wod_id);
        const wodB = wods.find(w => w.id === b.wod_id);
        const orderA = wodA?.order_num || 0;
        const orderB = wodB?.order_num || 0;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      const lastWodPosition = sortedResults.length > 0 
        ? sortedResults[sortedResults.length - 1].position 
        : undefined;
      
      entries.push({
        registrationId,
        participantName: reg.team_name || reg.athlete_name,
        categoryId: selectedCategory,
        totalPoints,
        position: 0, // será calculado depois
        firstPlaces,
        secondPlaces,
        thirdPlaces,
        lastWodPosition,
        wodResults: sortedResults,
      });
    });
    
    // Depois, adicionar participantes SEM resultados (zerados)
    let participantsWithoutResults = 0;
    registrations.forEach(reg => {
      if (reg.category_id === selectedCategory && !processedRegIds.has(reg.id)) {
        participantsWithoutResults++;
        entries.push({
          registrationId: reg.id,
          participantName: reg.team_name || reg.athlete_name,
          categoryId: selectedCategory,
          totalPoints: 0,
          position: 0, // será calculado depois
          firstPlaces: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
          lastWodPosition: undefined,
          wodResults: [],
        });
      }
    });
    
    console.log('📈 Participantes com resultados:', participantMap.size);
    console.log('📉 Participantes sem resultados (zerados):', participantsWithoutResults);
    console.log('📊 Total de participantes no leaderboard:', entries.length);

    // Ordenar e atribuir posições
    entries.sort((a, b) => {
      // 1. Mais pontos
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      
      // 2. Mais primeiros lugares
      if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;
      
      // 3. Mais segundos lugares
      if (b.secondPlaces !== a.secondPlaces) return b.secondPlaces - a.secondPlaces;
      
      // 4. Mais terceiros lugares
      if (b.thirdPlaces !== a.thirdPlaces) return b.thirdPlaces - a.thirdPlaces;
      
      // 5. Melhor posição no último WOD
      if (a.lastWodPosition && b.lastWodPosition) {
        return a.lastWodPosition - b.lastWodPosition;
      }
      
      return 0;
    });

    // Atribuir posições finais
    entries.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return entries;
  };

  const handleReprocess = async () => {
    if (!selectedCategory) {
      toast.error("Selecione uma categoria");
      return;
    }

    try {
      // Buscar scoring config
      const { data: configData, error: configError } = await supabase
        .from("scoring_configs")
        .select("*")
        .eq("category_id", selectedCategory)
        .maybeSingle();

      if (configError || !configData) {
        toast.error("Configure a pontuação desta categoria primeiro");
        return;
      }

      // Buscar todos os resultados da categoria
      const { data: resultsData, error: resultsError } = await supabase
        .from("wod_results")
        .select("*, wods(type)")
        .eq("category_id", selectedCategory);

      if (resultsError) throw resultsError;

      // Agrupar por WOD
      const resultsByWod = new Map<string, any[]>();
      resultsData?.forEach(result => {
        const wodId = result.wod_id;
        if (!resultsByWod.has(wodId)) {
          resultsByWod.set(wodId, []);
        }
        resultsByWod.get(wodId)!.push(result);
      });

      // Recalcular pontos para cada WOD
      const { calculateWODPoints } = await import('@/lib/scoring');
      
      for (const [wodId, wodResults] of resultsByWod) {
        const wod = wods.find(w => w.id === wodId);
        if (!wod) continue;

        // Converter para formato do scoring
        const resultsForScoring = wodResults.map((r: any) => ({
          id: r.id,
          wodId: r.wod_id,
          categoryId: r.category_id,
          registrationId: r.registration_id,
          result: r.result,
          tiebreakValue: r.tiebreak_value,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));

        // Converter config para o formato esperado
        const pointsTable = configData.points_table;
        const scoringConfig = {
          id: configData.id,
          categoryId: configData.category_id,
          presetType: configData.preset_type as any,
          pointsTable: (pointsTable && typeof pointsTable === 'object') 
            ? (pointsTable as { [position: number]: number })
            : {},
          dnfPoints: configData.dnf_points || 0,
          dnsPoints: configData.dns_points || 0,
          createdAt: configData.created_at || '',
          updatedAt: configData.updated_at || '',
        };

        // Calcular pontos
        const resultsWithPoints = calculateWODPoints(resultsForScoring, scoringConfig, wod.type);

        // Atualizar no banco
        for (const result of resultsWithPoints) {
          await supabase
            .from("wod_results")
            .update({
              position: result.position,
              points: result.points,
            })
            .eq("id", result.id);
        }
      }

      toast.success("Pontuação reprocessada!");
      await loadLeaderboard();
    } catch (error: any) {
      console.error("Error reprocessing:", error);
      toast.error("Erro ao reprocessar pontuação");
    }
  };

  const getPositionChange = (entry: LeaderboardEntry) => {
    // Por enquanto, não temos histórico de posições anteriores
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getPositionBadge = (position: number) => {
    // Removido: medalhas de 1º, 2º e 3º lugar - mostrar apenas número
    return <span className="text-sm font-bold">{position}º</span>;
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground">Classificação ao vivo do campeonato</p>
          </div>
        </div>
        
        <Button onClick={handleReprocess} variant="secondary" className="shadow-glow">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reprocessar Pontuação
        </Button>
      </div>

      <Card className="p-6 shadow-card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCategory && (
            <div className="text-sm text-muted-foreground">
              {leaderboard.length} participantes
            </div>
          )}
        </div>
      </Card>

      {selectedCategory && (
        <>
          {/* Versão Desktop - Tabela completa */}
          <Card className="shadow-card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-20 sticky left-0 bg-muted/50 z-10">Pos.</TableHead>
                  <TableHead className="w-16"></TableHead>
                  <TableHead className="min-w-[200px] sticky left-[84px] bg-muted/50 z-10">Atleta/Time</TableHead>
                  <TableHead className="text-center">Pontos</TableHead>
                  {wods
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                    .map(wod => (
                      <TableHead key={wod.id} className="text-center min-w-[80px]">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold">{wod.name}</span>
                          <span className="text-xs text-muted-foreground">Pos.</span>
                        </div>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => {
                  // Obter TODOS os WODs ordenados por order_num (não apenas os com resultados)
                  const allWodsSorted = wods
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
                  
                  return (
                    <TableRow 
                      key={entry.registrationId}
                      className={`hover:bg-muted/50 transition-colors ${
                        entry.position === 1 ? 'bg-accent/10' : ''
                      }`}
                    >
                      <TableCell className="sticky left-0 bg-card z-10">
                        {getPositionBadge(entry.position)}
                      </TableCell>
                      <TableCell className="sticky left-[84px] bg-card z-10">
                        {getPositionChange(entry)}
                      </TableCell>
                      <TableCell className="font-semibold text-sm sticky left-[148px] bg-card z-10 min-w-[200px]">
                        {entry.participantName}
                        {entry.position === 1 && entry.totalPoints > 0 && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                            LÍDER
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-base font-bold text-primary">
                            {entry.totalPoints}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            pts
                          </span>
                        </div>
                      </TableCell>
                      {allWodsSorted.map(wod => {
                        const result = entry.wodResults.find(r => r.wod_id === wod.id);
                        const position = result?.position;
                        const points = result?.points || 0;
                        const status = result?.status;
                        const resultValue = result?.result;
                        
                        return (
                          <TableCell key={wod.id} className="text-center">
                            {status === 'dns' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-muted-foreground">DNS</span>
                                <span className="text-xs text-muted-foreground">0pts</span>
                              </div>
                            ) : status === 'dnf' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-destructive">DNF</span>
                                <span className="text-xs text-muted-foreground">{points}pts</span>
                              </div>
                            ) : position && position > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-sm font-bold ${
                                  position === 1 ? 'text-accent' :
                                  position === 2 ? 'text-muted-foreground' :
                                  position === 3 ? 'text-amber-600' :
                                  'text-foreground'
                                }`}>
                                  {position}º
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {points}pts
                                </span>
                                {resultValue && (
                                  <span className="text-xs font-medium text-foreground mt-0.5">
                                    {resultValue}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm font-bold text-muted-foreground">0</span>
                                <span className="text-xs text-muted-foreground">0pts</span>
                                <span className="text-xs text-muted-foreground">0</span>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

          {/* Versão Mobile - Lista com Accordion */}
          <div className="md:hidden space-y-3">
            <Accordion type="multiple" className="w-full">
              {leaderboard.map((entry) => {
                // Obter TODOS os WODs ordenados por order_num (não apenas os com resultados)
                const allWodsSorted = wods
                  .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

                return (
                  <AccordionItem key={entry.registrationId} value={entry.registrationId} className="border rounded-lg px-4 bg-card">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-shrink-0">
                            {getPositionBadge(entry.position)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {entry.participantName}
                              {entry.position === 1 && entry.totalPoints > 0 && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                                  LÍDER
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-base font-bold text-primary">
                              {entry.totalPoints}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              pts
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 space-y-3 pb-2">
                        {allWodsSorted.map(wod => {
                          const result = entry.wodResults.find(r => r.wod_id === wod.id);
                          const position = result?.position;
                          const points = result?.points || 0;
                          const status = result?.status;
                          const resultValue = result?.result;

                          return (
                            <div key={wod.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">{wod.name}</div>
                                {resultValue && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Resultado: {resultValue}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                {status === 'dns' ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">DNS</span>
                                    <span className="text-xs text-muted-foreground">0pts</span>
                                  </div>
                                ) : status === 'dnf' ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-destructive">DNF</span>
                                    <span className="text-xs text-muted-foreground">{points}pts</span>
                                  </div>
                                ) : position && position > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className={`text-sm font-bold ${
                                      position === 1 ? 'text-accent' :
                                      position === 2 ? 'text-muted-foreground' :
                                      position === 3 ? 'text-amber-600' :
                                      'text-foreground'
                                    }`}>
                                      {position}º
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {points}pts
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-sm font-bold text-muted-foreground">0</span>
                                    <span className="text-xs text-muted-foreground">0pts</span>
                                    <span className="text-xs text-muted-foreground">0</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </>
      )}
    </div>
  );
}
