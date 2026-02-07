import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Minus, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compareLeaderboardEntries } from "@/lib/scoring";
// REMOVIDO: Usando função local que inclui todos os registros mesmo sem resultados
// import { calculateLeaderboard } from "@/lib/scoring";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicHeader } from "@/components/layout/PublicHeader";

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
  teamMembers?: any[];
  boxName?: string;
}

export default function PublicLeaderboard() {
  const navigate = useNavigate();
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

    // POLBACK: Polling de segurança a cada 15 segundos
    // Isso garante atualização mesmo se o socket falhar ou RLS bloquear eventos
    const intervalId = setInterval(() => {
      if (selectedCategory) {
        console.log("🔄 Polling leaderboard update...");
        loadLeaderboard();
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [slug, selectedCategory]); // Adicionei selectedCategory nas deps para o intervalo funcionar corretamente

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
      // IMPORTANTE: Apenas WODs publicados aparecem no leaderboard público
      const [catsResult, wodsResult, regsResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", champ.id).order("order_index"),
        supabase.from("wods").select("*").eq("championship_id", champ.id).eq("is_published", true).order("order_num"),
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

  const calculateLeaderboardLocal = (results: any[], regs: any[], presetType?: string): LeaderboardEntry[] => {
    // Garantir que presetType seja sempre uma string válida
    const validPresetType = presetType && typeof presetType === 'string' ? presetType : 'crossfit-games';
    console.log("🔍 calculateLeaderboardLocal chamado com presetType:", presetType, "| validPresetType:", validPresetType);

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
        teamMembers: reg.team_members,
        boxName: reg.box_name,
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
          teamMembers: reg.team_members,
          boxName: reg.box_name,
        });
      }
    });

    // Ordenar usando a função de comparação completa com desempate
    entries.sort((a, b) => compareLeaderboardEntries(a, b));

    // Atribuir posições finais (sem empates - cada um tem posição única)
    // A função de comparação garante que não haverá empates absolutos
    entries.forEach((entry, index) => {
      entry.position = index + 1;
    });

    console.log("📊 Posições atribuídas. Primeiros 5:", entries.slice(0, 5).map(e => ({
      pos: e.position,
      nome: e.participantName,
      pontos: e.totalPoints
    })));

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
        .eq("is_published", true) // Restaurado: Apenas resultados publicados
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
      // Garantir que presetType seja sempre uma string válida (importante para mobile)
      const presetType = (configData && configData.preset_type && typeof configData.preset_type === 'string')
        ? configData.preset_type
        : 'crossfit-games';

      // DEBUG COMPLETO DO PRESET
      console.log("════════════════════════════════════════════════");
      console.log("📊 CONFIG DO BANCO:", JSON.stringify(configData));
      console.log("📊 preset_type BRUTO:", configData?.preset_type, "| Tipo:", typeof configData?.preset_type);
      console.log("📊 preset_type PROCESSADO:", presetType);
      console.log("📊 Normalizado:", presetType.toLowerCase().trim());
      console.log("📊 Contém 'simple'?:", presetType.toLowerCase().includes('simple'));
      console.log("════════════════════════════════════════════════");

      const entries = calculateLeaderboardLocal(resultsData || [], regsData || [], presetType);

      // Garantir que os wodResults tenham tanto wodId quanto wod_id para compatibilidade
      const entriesWithBothIds = entries.map(entry => ({
        ...entry,
        wodResults: entry.wodResults.map((wr: any) => ({
          ...wr,
          wod_id: wr.wodId || wr.wod_id,
          wodId: wr.wodId || wr.wod_id,
        })),
      }));

      console.log("📊 Leaderboard calculado:", entriesWithBothIds.length, "participantes");
      console.log("📊 Primeiros 3 participantes (para debug):", entriesWithBothIds.slice(0, 3).map(e => ({
        nome: e.participantName,
        pontos: e.totalPoints,
        posicao: e.position
      })));
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
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <PublicHeader />
        <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <PublicHeader />
        <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto p-6">
              <p className="text-muted-foreground mb-4">Campeonato não encontrado.</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <PublicHeader />
      <div className="w-full mx-auto px-6 py-4 max-w-[98%]">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/links/${slug || championship?.slug}`)} className="mb-2 pl-0 hover:bg-transparent hover:text-primary">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{championship.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Leaderboard</p>
            </div>
          </div>
        </div>

        <Card className="p-4 sm:p-6 shadow-card mb-6">
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
          </div>
        </Card>

        {selectedCategory && (
          <>
            {/* Versão Desktop - Tabela completa */}
            <Card className="shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-20">Pos.</TableHead>
                      <TableHead className="min-w-[200px]">Atleta/Time</TableHead>
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
                          className={`${entry.position === 1 ? 'bg-accent/10' : ''
                            }`}
                        >
                          <TableCell>
                            {getPositionBadge(entry.position)}
                          </TableCell>
                          <TableCell className="font-semibold text-sm min-w-[200px] py-3">
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="details" className="border-0">
                                <AccordionTrigger className="hover:no-underline py-0 justify-start gap-2">
                                  <span className="text-left">
                                    {entry.participantName}
                                    {entry.position === 1 && (
                                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground align-middle">
                                        LÍDER
                                      </span>
                                    )}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-0">
                                  <div className="space-y-1 pl-2 border-l-2 border-primary/20 mt-1">


                                    {entry.teamMembers && entry.teamMembers.length > 0 ? (
                                      entry.teamMembers.map((member: any, mIdx: number) => (
                                        <div key={mIdx} className="flex flex-col gap-0.5 py-1.5 border-b border-border/50 last:border-0">
                                          <span className="text-[13px] font-medium text-foreground">{member.name}</span>
                                          {member.box && (
                                            <span className="text-muted-foreground text-xs">{member.box}</span>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        {entry.participantName}
                                      </div>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
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
                                    <span className={`text-sm font-bold ${position === 1 ? 'text-[#00FF1E]' :
                                      position === 2 ? 'text-[#00F2FF]' :
                                        position === 3 ? 'text-[#EEFF00]' :
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


          </>
        )}
      </div>
    </div>
  );
}
