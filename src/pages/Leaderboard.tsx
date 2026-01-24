import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { compareLeaderboardEntries } from '@/lib/scoring';
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
  orderIndex?: number | null;
  teamMembers?: any[];
  boxName?: string;
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
  }, [selectedCategory]);

  // REMOVIDO: Listeners em tempo real que causavam atualizações constantes
  // O leaderboard agora só atualiza quando:
  // 1. Usuário seleciona outra categoria
  // 2. Usuário clica no botão "Recalcular Pontos"
  // 3. Página é recarregada manualmente

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
        supabase.from("registrations").select("*").eq("championship_id", selectedChampionship.id).eq("status", "approved").order("order_index", { ascending: true, nullsLast: true }),
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
      // Para o leaderboard interno (admin), mostrar TODOS os resultados salvos (publicados ou não)
      const { data: resultsData, error: resultsError } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory)
        // Removido filtro is_published - mostrar todos os resultados salvos
        .order("created_at");

      if (resultsError) throw resultsError;

      console.log('📊 Resultados encontrados:', resultsData?.length || 0);

      // SEMPRE recalcular pontos usando a configuração atual (mesmo que já existam pontos salvos)
      // Isso garante que mudanças na configuração de pontuação sejam refletidas imediatamente
      if (configData && resultsData && resultsData.length > 0) {
        console.log(`🔄 Recalculando pontos para ${resultsData.length} resultados usando configuração atual...`);

        // Agrupar por WOD
        const resultsByWod = new Map<string, any[]>();
        resultsData.forEach(result => {
          const wodId = result.wod_id;
          if (!resultsByWod.has(wodId)) {
            resultsByWod.set(wodId, []);
          }
          resultsByWod.get(wodId)!.push(result);
        });

        // Recalcular pontos para cada WOD usando a configuração atual
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

          // Calcular pontos usando a configuração ATUAL
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

          // Atualizar no banco com os novos pontos
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
        const entries = calculateLeaderboard(updatedResults || [], configData?.preset_type);
        setLeaderboard(entries);
        console.log('✅ Leaderboard atualizado com', entries.length, 'participantes (pontos recalculados)');
      } else {
        // Se não há config ou resultados, apenas atualizar
        setWodResults(resultsData || []);

        // Calcular leaderboard (mesmo que vazio, mostra todos zerados)
        const entries = calculateLeaderboard(resultsData || [], configData?.preset_type);
        setLeaderboard(entries);
        console.log('✅ Leaderboard atualizado. Resultados:', resultsData?.length || 0, 'Participantes:', entries.length);
      }
    } catch (error: any) {
      console.error("❌ Error loading leaderboard:", error);
      toast.error("Erro ao carregar leaderboard");
    }
  };

  const calculateLeaderboard = (results: any[], presetType?: string): LeaderboardEntry[] => {
    console.log('📊 Calculando leaderboard. Resultados recebidos:', results.length);
    console.log('👥 Total de registros da categoria:', registrations.filter(r => r.category_id === selectedCategory).length);
    console.log('⚙️ Preset de pontuação:', presetType || 'não definido');

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
        orderIndex: reg.order_index,
        teamMembers: reg.team_members,
        boxName: reg.box_name,
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
          orderIndex: reg.order_index,
          teamMembers: reg.team_members,
          boxName: reg.box_name,
        });
      }
    });

    console.log('📈 Participantes com resultados:', participantMap.size);
    console.log('📉 Participantes sem resultados (zerados):', participantsWithoutResults);
    console.log('📊 Total de participantes no leaderboard:', entries.length);

    // Ordenar usando a função de comparação completa com desempate
    const sortDirection = presetType === 'simple-order' ? 'asc' : 'desc';
    entries.sort((a, b) => compareLeaderboardEntries(a, b, sortDirection));

    // Atribuir posições finais (sem empates - cada um tem posição única)
    // A função de comparação garante que não haverá empates absolutos
    entries.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return entries;
  };

  // --- Configuration Logic ---
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{
    id?: string;
    presetType: string;
    pointsTableText: string;
    rankingMethod: string;
    dnfPoints: number;
    dnsPoints: number;
  }>({
    presetType: 'crossfit-games',
    pointsTableText: '',
    rankingMethod: 'simple',
    dnfPoints: 0,
    dnsPoints: 0,
  });

  const handleOpenConfig = async () => {
    if (!selectedCategory) {
      toast.error("Selecione uma categoria");
      return;
    }

    setConfigLoading(true);
    setIsConfigOpen(true);

    try {
      const { data, error } = await supabase
        .from("scoring_configs")
        .select("*")
        .eq("category_id", selectedCategory)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setEditingConfig({
          id: data.id,
          presetType: data.preset_type || 'crossfit-games',
          pointsTableText: JSON.stringify(data.points_table || {}, null, 2),
          dnfPoints: data.dnf_points || 0,
          dnsPoints: data.dns_points || 0,
        });
      } else {
        // Defaults
        const { CROSSFIT_GAMES_POINTS } = await import('@/lib/scoring');
        setEditingConfig({
          presetType: 'crossfit-games',
          pointsTableText: JSON.stringify(CROSSFIT_GAMES_POINTS, null, 2),
          dnfPoints: 1, // Default DNF usually 1 or last place
          dnsPoints: 0,
        });
      }
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Erro ao carregar configuração");
    } finally {
      setConfigLoading(false);
    }
  };

  const handlePresetChange = async (value: string) => {
    const { CROSSFIT_GAMES_POINTS, generateSimpleOrderPoints, generateDefaultPoints } = await import('@/lib/scoring');

    let newTableText = editingConfig.pointsTableText;

    if (value === 'crossfit-games') {
      newTableText = JSON.stringify(CROSSFIT_GAMES_POINTS, null, 2);
    } else if (value === 'simple-order') {
      // Estimate max participants for simple order based on current registrations
      const count = registrations.filter(r => r.category_id === selectedCategory).length;
      const max = Math.max(count + 10, 100);
      const points = generateSimpleOrderPoints(max);
      newTableText = JSON.stringify(points, null, 2);
    } else if (value === 'custom') {
      // Keep current or use default
      if (editingConfig.presetType !== 'custom') {
        const count = registrations.filter(r => r.category_id === selectedCategory).length;
        const points = generateDefaultPoints(Math.max(count, 40));
        newTableText = JSON.stringify(points, null, 2);
      }
    }

    setEditingConfig(prev => ({
      ...prev,
      presetType: value,
      pointsTableText: newTableText
    }));
  };

  const handleSaveConfig = async () => {
    if (!selectedCategory) return;

    if (!window.confirm("ATENÇÃO: Alterar a configuração de pontuação irá RECALCULAR todos os resultados desta categoria imediatamente. A classificação pode mudar. Deseja continuar?")) {
      return;
    }

    setConfigSaving(true);
    try {
      let pointsTable;
      try {
        pointsTable = JSON.parse(editingConfig.pointsTableText);
      } catch (e) {
        toast.error("JSON de tabela de pontos inválido");
        setConfigSaving(false);
        return;
      }

      const configData = {
        category_id: selectedCategory,
        preset_type: editingConfig.presetType,
        points_table: pointsTable,
        ranking_method: editingConfig.rankingMethod,
        dnf_points: editingConfig.dnfPoints,
        dns_points: editingConfig.dnsPoints,
        updated_at: new Date().toISOString(),
      };

      if (editingConfig.id) {
        const { error } = await supabase
          .from("scoring_configs")
          .update(configData)
          .eq("id", editingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scoring_configs")
          .insert(configData);
        if (error) throw error;
      }

      setIsConfigOpen(false);
      toast.success("Configuração salva! Recalculando...");

      // Trigger reprocessing immediately
      await handleReprocess();

    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setConfigSaving(false);
    }
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

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground">Classificação ao vivo do campeonato</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenConfig}
            variant="outline"
            className="shadow-glow"
            disabled={!selectedCategory || isConfigOpen}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          <Button onClick={handleReprocess} variant="secondary" className="shadow-glow">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reprocessar Pontuação
          </Button>
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração de Pontuação</DialogTitle>
            <DialogDescription>
              Ajuste as regras de pontuação para esta categoria.
              <span className="font-bold text-destructive block mt-1">
                ⚠️ Salvar irá recalcular todos os resultados existentes imediatamente.
              </span>
            </DialogDescription>
          </DialogHeader>

          {configLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-4">

              <div className="space-y-2">
                <Label>Critério de Pontuação (Empates)</Label>
                <Select
                  value={editingConfig.rankingMethod}
                  onValueChange={(val) => setEditingConfig(prev => ({ ...prev, rankingMethod: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Critério Simples (1º, 1º, 2º...)</SelectItem>
                    <SelectItem value="standard">Critério da Crossfit (1º, 1º, 3º...)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Simples: não pula posições. Crossfit: pula posições após empates.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Preset de Pontuação</Label>
                <Select
                  value={editingConfig.presetType}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crossfit-games">Crossfit (Padrão)</SelectItem>
                    <SelectItem value="simple-order">Ordem Simples (1º=1pt, 2º=2pts...)</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {editingConfig.presetType === 'crossfit-games' && "1º=100pts, 2º=97pts... (Maior pontuação vence)"}
                  {editingConfig.presetType === 'simple-order' && "1º=1pt, 2º=2pts... (Menor pontuação vence)"}
                  {editingConfig.presetType === 'custom' && "Defina manualmente a tabela de pontos abaixo"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pontos para DNF (Não Finalizou)</Label>
                  <Input
                    type="number"
                    value={editingConfig.dnfPoints}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev, dnfPoints: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pontos para DNS (Não Iniciou)</Label>
                  <Input
                    type="number"
                    value={editingConfig.dnsPoints}
                    onChange={(e) => setEditingConfig(prev => ({ ...prev, dnsPoints: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tabela de Pontos (JSON)</Label>
                <Textarea
                  value={editingConfig.pointsTableText}
                  onChange={(e) => setEditingConfig(prev => ({ ...prev, pointsTableText: e.target.value }))}
                  className="font-mono text-xs min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: {`{"1": 100, "2": 97, ...}`} (Posição: Pontos)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)} disabled={configSaving}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSaveConfig} disabled={configSaving || configLoading}>
              {configSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando e Recalculando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar e Recalcular
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    // Obter TODOS os WODs ordenados por order_num (não apenas os com resultados)
                    const allWodsSorted = wods
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
                                  {entry.position === 1 && entry.totalPoints > 0 && (
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
  );
}
