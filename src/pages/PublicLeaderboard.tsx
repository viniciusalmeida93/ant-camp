import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Minus, Loader2 } from "lucide-react";
import { calculateLeaderboard } from "@/lib/scoring";
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
        supabase.from("registrations").select("*").eq("championship_id", champ.id).eq("status", "approved"),
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

  const loadLeaderboard = async () => {
    if (!selectedCategory || !championship) return;

    try {
      // Buscar registrations novamente para garantir que temos os dados atualizados
      const { data: regsData, error: regsError } = await supabase
        .from("registrations")
        .select("*")
        .eq("championship_id", championship.id)
        .eq("status", "approved");

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

      // Carregar resultados da categoria
      const { data: resultsData, error: resultsError } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory)
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

      // Converter resultados para formato esperado pela função calculateLeaderboard
      const resultsForScoring = (resultsData || []).map((r: any) => ({
        id: r.id,
        wodId: r.wod_id,
        categoryId: r.category_id,
        registrationId: r.registration_id,
        result: r.result,
        tiebreakValue: r.tiebreak_value,
        status: r.status,
        points: r.points,
        position: r.position,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      console.log("Resultados formatados:", resultsForScoring.length);

      // Calcular leaderboard
      const presetType = configData?.preset_type;
      const entries = calculateLeaderboard(resultsForScoring, selectedCategory, participantNames, presetType);
      
      // Garantir que os wodResults tenham tanto wodId quanto wod_id para compatibilidade
      const entriesWithBothIds = entries.map(entry => ({
        ...entry,
        wodResults: entry.wodResults.map((wr: any) => ({
          ...wr,
          wod_id: wr.wodId || wr.wod_id,
          wodId: wr.wodId || wr.wod_id,
        })),
      }));
      
      console.log("Leaderboard calculado:", entriesWithBothIds.length);
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
    if (position === 1) {
      return (
        <div className="flex items-center gap-1.5">
          <Medal className="w-4 h-4 text-accent" />
          <span className="text-base font-bold">1º</span>
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="flex items-center gap-1.5">
          <Medal className="w-4 h-4 text-muted-foreground" />
          <span className="text-base font-bold">2º</span>
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="flex items-center gap-1.5">
          <Medal className="w-4 h-4 text-amber-600" />
          <span className="text-base font-bold">3º</span>
        </div>
      );
    }
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
          {leaderboard.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {leaderboard.length} participantes
            </div>
          )}
        </div>
      </Card>

      {selectedCategory && leaderboard.length > 0 && (
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
                    .filter(wod => {
                      // Verificar se há resultados para este WOD na categoria selecionada
                      return wodResults.some(r => r.wod_id === wod.id && r.category_id === selectedCategory);
                    })
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
                  // Obter WODs com resultados para esta categoria, ordenados por order_num
                  const wodsWithResults = wods
                    .filter(wod => 
                      wodResults.some(r => r.wod_id === wod.id && r.category_id === selectedCategory)
                    )
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
                      {wodsWithResults.map(wod => {
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
                            ) : position ? (
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
                              <span className="text-xs text-muted-foreground">-</span>
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
                const wodsWithResults = wods
                  .filter(wod => 
                    wodResults.some(r => r.wod_id === wod.id && r.category_id === selectedCategory)
                  )
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
                        {wodsWithResults.map(wod => {
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
                                ) : position ? (
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
                                  <span className="text-xs text-muted-foreground">-</span>
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

      {selectedCategory && leaderboard.length === 0 && (
        <Card className="p-12 text-center shadow-card">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum resultado lançado para esta categoria ainda.
          </p>
      </Card>
      )}
    </div>
  );
}
