import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Minus, Loader2 } from "lucide-react";
// REMOVIDO: Usando função local que inclui todos os registros mesmo sem resultados
// import { calculateLeaderboard } from "@/lib/scoring";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  orderIndex?: number | null;
}

export default function PublicLeaderboard() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [championship, setChampionship] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWODs] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [wodResults, setWodResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (slug) {
    loadData();
    }
    
    // Setup realtime subscription
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wod_results'
        },
        () => {
          if (selectedCategory) {
            loadLeaderboard();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  useEffect(() => {
    if (selectedCategory && championship) {
      loadLeaderboard();
    }
  }, [selectedCategory, championship]);

  const loadData = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
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
        setLoading(false);
        return;
      }
      
      setChampionship(champ);

      // Load categories, WODs, and registrations
      const [catsResult, wodsResult, regsResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", champ.id).order("order_index"),
        supabase.from("wods").select("*").eq("championship_id", champ.id).order("order_num"),
        supabase.from("registrations").select("*").eq("championship_id", champ.id).eq("status", "approved").order("order_index", { ascending: true, nullsLast: true }).order("created_at", { ascending: true }),
      ]);

      if (catsResult.error) throw catsResult.error;
      if (wodsResult.error) throw wodsResult.error;
      if (regsResult.error) throw regsResult.error;

      setCategories(catsResult.data || []);
      setWODs(wodsResult.data || []);
      setRegistrations(regsResult.data || []);
      
      if (catsResult.data && catsResult.data.length > 0 && !selectedCategory) {
        setSelectedCategory(catsResult.data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaderboardLocal = (results: any[], regs: any[]): LeaderboardEntry[] => {
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
    
    // Filtrar registros apenas da categoria selecionada
    const categoryRegs = regs.filter(r => r.category_id === selectedCategory);
    
    // Primeiro, processar participantes com resultados
    participantMap.forEach((wodResults, registrationId) => {
      const reg = categoryRegs.find(r => r.id === registrationId);
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
        participantName: reg.team_name || reg.athlete_name || 'Desconhecido',
        categoryId: selectedCategory,
        totalPoints,
        position: 0, // será calculado depois
        firstPlaces,
        secondPlaces,
        thirdPlaces,
        lastWodPosition,
        wodResults: sortedResults.map(r => ({
          ...r,
          wodId: r.wod_id,
        })),
        orderIndex: reg.order_index,
      });
    });
    
    // Depois, adicionar participantes SEM resultados (zerados)
    categoryRegs.forEach(reg => {
      if (!processedRegIds.has(reg.id)) {
        entries.push({
          registrationId: reg.id,
          participantName: reg.team_name || reg.athlete_name || 'Desconhecido',
          categoryId: selectedCategory,
          totalPoints: 0,
          position: 0, // será calculado depois
          firstPlaces: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
          lastWodPosition: undefined,
          wodResults: [],
          orderIndex: reg.order_index,
        });
      }
    });

    // Ordenar e atribuir posições
    // IMPORTANTE: Usar order_index como critério de desempate e para ordenar participantes sem resultados
    entries.sort((a, b) => {
      // Se ambos têm 0 pontos (sem resultados), ordenar apenas por order_index
      if (a.totalPoints === 0 && b.totalPoints === 0) {
        if (a.orderIndex !== null && a.orderIndex !== undefined && 
            b.orderIndex !== null && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }
        // Se apenas um tem order_index, ele vem primeiro
        if (a.orderIndex !== null && a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== null && b.orderIndex !== undefined) return 1;
        return 0;
      }
      
      // 1. Mais pontos
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      
      // 2. Mais primeiros lugares
      if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;
      
      // 3. Mais segundos lugares
      if (b.secondPlaces !== a.secondPlaces) return b.secondPlaces - a.secondPlaces;
      
      // 4. Mais terceiros lugares
      if (b.thirdPlaces !== a.thirdPlaces) return b.thirdPlaces - a.thirdPlaces;
      
      // 5. Melhor posição no último WOD (menor número é melhor)
      if (a.lastWodPosition !== undefined && b.lastWodPosition !== undefined) {
        return a.lastWodPosition - b.lastWodPosition;
      }
      
      if (a.lastWodPosition !== undefined) return -1;
      if (b.lastWodPosition !== undefined) return 1;
      
      // 6. Usar order_index como desempate final (menor order_index = melhor posição manual)
      if (a.orderIndex !== null && a.orderIndex !== undefined && 
          b.orderIndex !== null && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }
      
      // Se apenas um tem order_index, ele vem primeiro
      if (a.orderIndex !== null && a.orderIndex !== undefined) return -1;
      if (b.orderIndex !== null && b.orderIndex !== undefined) return 1;
      
      return 0;
    });

    // Atribuir posições finais
    entries.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return entries;
  };

  const loadLeaderboard = async () => {
    if (!selectedCategory || !championship) return;

    try {
      // Buscar registrations novamente para garantir que temos os dados atualizados
      // Ordenar por order_index para manter a ordem definida manualmente
      const { data: regsData, error: regsError } = await supabase
        .from("registrations")
        .select("*")
        .eq("championship_id", championship.id)
        .eq("status", "approved")
        .order("order_index", { ascending: true, nullsLast: true })
        .order("created_at", { ascending: true });

      if (regsError) {
        console.error("Erro ao buscar registrations:", regsError);
      }

      // Buscar scoring config
      const { data: configData, error: configError } = await supabase
        .from("scoring_configs")
        .select("*")
        .eq("category_id", selectedCategory)
        .maybeSingle();

      if (configError) {
        console.error("Erro ao buscar scoring config:", configError);
      }

      // Carregar resultados da categoria - APENAS RESULTADOS PUBLICADOS
      const { data: resultsData, error: resultsError } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory)
        .eq("is_published", true) // Apenas resultados publicados aparecem no leaderboard público
        .order("created_at");

      if (resultsError) {
        console.error("Erro ao buscar resultados:", resultsError);
        throw resultsError;
      }
      
      console.log("Resultados carregados:", resultsData?.length || 0);
      setWodResults(resultsData || []);

      // Criar mapa de nomes de participantes
      const participantNames = new Map<string, string>();
      (regsData || []).forEach(reg => {
        const name = reg.team_name || reg.athlete_name || 'Desconhecido';
        participantNames.set(reg.id, name);
      });

      console.log("Participantes mapeados:", participantNames.size);
      console.log("Resultados carregados:", resultsData?.length || 0);

      // Calcular leaderboard usando função local que inclui todos os participantes
      const entries = calculateLeaderboardLocal(resultsData || [], regsData || []);
      
      // Garantir que os wodResults tenham tanto wodId quanto wod_id para compatibilidade
      const entriesWithBothIds = entries.map(entry => ({
        ...entry,
        wodResults: entry.wodResults.map((wr: any) => ({
          ...wr,
          wod_id: wr.wodId || wr.wod_id,
          wodId: wr.wodId || wr.wod_id,
        })),
      }));
      
      console.log("Leaderboard calculado:", entriesWithBothIds.length, "participantes");
      setLeaderboard(entriesWithBothIds);
    } catch (error: any) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const getPositionChange = (entry: LeaderboardEntry) => {
    // Por enquanto, não temos histórico de posições anteriores
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getPositionBadge = (position: number) => {
    // Sem medalhas, apenas número da posição
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

  if (!championship) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto p-6">
            <p className="text-muted-foreground mb-4">Campeonato não encontrado.</p>
        </Card>
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
            <h1 className="text-4xl font-bold">{championship.name}</h1>
            <p className="text-muted-foreground">Leaderboard ao Vivo</p>
          </div>
        </div>
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
                  // Sempre mostrar TODOS os WODs, ordenados por order_num
                  const allWodsSorted = [...wods]
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
                        {entry.position === 1 && (
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
                        const result = entry.wodResults.find(r => {
                          // Verificar tanto wod_id quanto wodId (formato do banco vs formato convertido)
                          return (r.wod_id === wod.id) || (r.wodId === wod.id);
                        });
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
                // Sempre mostrar TODOS os WODs, ordenados por order_num
                const allWodsSorted = [...wods]
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
                              {entry.position === 1 && (
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
                          const result = entry.wodResults.find(r => {
                            // Verificar tanto wod_id quanto wodId (formato do banco vs formato convertido)
                            return (r.wod_id === wod.id) || (r.wodId === wod.id);
                          });
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
