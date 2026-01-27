import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Calculator, Loader2, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { compareResults, calculateWODPoints } from '@/lib/scoring';

// Função para atualizar order_index baseado no leaderboard atual
const updateOrderIndexFromLeaderboard = async (categoryId: string) => {
  try {
    console.log('🔄 Atualizando order_index baseado no leaderboard para categoria:', categoryId);

    // 1. Buscar TODOS os resultados publicados da categoria
    const { data: resultsData, error: resultsError } = await supabase
      .from("wod_results")
      .select("*")
      .eq("category_id", categoryId)
      .eq("is_published", true);

    if (resultsError) throw resultsError;

    // 2. Buscar todas as registrations aprovadas desta categoria
    const { data: regsData, error: regsError } = await supabase
      .from("registrations")
      .select("*")
      .eq("category_id", categoryId)
      .neq("status", "cancelled"); // Incluir pendentes, excluir apenas canceladas

    if (regsError) throw regsError;

    if (!regsData || regsData.length === 0) {
      console.log('⚠️ Nenhum participante encontrado na categoria');
      return;
    }

    // 3. Buscar WODs para ordenar resultados
    const { data: wodsData } = await supabase
      .from("wods")
      .select("*");

    const wods = wodsData || [];

    // 4. Calcular leaderboard (mesma lógica da página Leaderboard.tsx)
    const participantMap = new Map<string, any[]>();

    (resultsData || []).forEach(result => {
      const regId = result.registration_id;
      if (!participantMap.has(regId)) {
        participantMap.set(regId, []);
      }
      participantMap.get(regId)!.push(result);
    });

    const entries: any[] = [];
    const processedRegIds = new Set<string>();

    // Processar participantes com resultados
    participantMap.forEach((wodResults, registrationId) => {
      const reg = regsData.find(r => r.id === registrationId);
      if (!reg) return;

      processedRegIds.add(registrationId);

      const totalPoints = wodResults.reduce((sum, r) => sum + (r.points || 0), 0);
      const firstPlaces = wodResults.filter(r => r.position === 1).length;
      const secondPlaces = wodResults.filter(r => r.position === 2).length;
      const thirdPlaces = wodResults.filter(r => r.position === 3).length;

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
        totalPoints,
        firstPlaces,
        secondPlaces,
        thirdPlaces,
        lastWodPosition,
        orderIndex: reg.order_index,
      });
    });

    // Adicionar participantes SEM resultados (zerados)
    regsData.forEach(reg => {
      if (!processedRegIds.has(reg.id)) {
        entries.push({
          registrationId: reg.id,
          totalPoints: 0,
          firstPlaces: 0,
          secondPlaces: 0,
          thirdPlaces: 0,
          lastWodPosition: undefined,
          orderIndex: reg.order_index,
        });
      }
    });

    // 5. Ordenar (mesma lógica do Leaderboard.tsx)
    entries.sort((a, b) => {
      // Se um tem 0 e outro não, quem tem 0 vai para o final
      if (a.totalPoints === 0 && b.totalPoints > 0) return 1;
      if (a.totalPoints > 0 && b.totalPoints === 0) return -1;

      // Se ambos têm 0 pontos, manter order_index original
      if (a.totalPoints === 0 && b.totalPoints === 0) {
        if (a.orderIndex !== null && a.orderIndex !== undefined &&
          b.orderIndex !== null && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }
        if (a.orderIndex !== null && a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== null && b.orderIndex !== undefined) return 1;
        return 0;
      }

      // 1. Pontos (SEMPRE menor é melhor, desde que > 0)
      if (a.totalPoints !== b.totalPoints) return a.totalPoints - b.totalPoints;

      // 2. Mais primeiros lugares
      if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;

      // 3. Mais segundos lugares
      if (b.secondPlaces !== a.secondPlaces) return b.secondPlaces - a.secondPlaces;

      // 4. Mais terceiros lugares
      if (b.thirdPlaces !== a.thirdPlaces) return b.thirdPlaces - a.thirdPlaces;

      // 5. Melhor posição no último WOD
      if (a.lastWodPosition !== undefined && b.lastWodPosition !== undefined) {
        return a.lastWodPosition - b.lastWodPosition;
      }

      if (a.lastWodPosition !== undefined) return -1;
      if (b.lastWodPosition !== undefined) return 1;

      // 6. order_index como desempate
      if (a.orderIndex !== null && a.orderIndex !== undefined &&
        b.orderIndex !== null && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }

      if (a.orderIndex !== null && a.orderIndex !== undefined) return -1;
      if (b.orderIndex !== null && b.orderIndex !== undefined) return 1;

      return 0;
    });

    // 6. Atualizar order_index no banco baseado na nova ordem do leaderboard
    console.log('💾 Atualizando order_index de', entries.length, 'participantes...');

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const newOrderIndex = i + 1; // 1º lugar = 1, 2º lugar = 2, etc.

      await supabase
        .from("registrations")
        .update({ order_index: newOrderIndex })
        .eq("id", entry.registrationId);
    }

    console.log('✅ order_index atualizado! Agora as baterias serão reorganizadas automaticamente.');

  } catch (error) {
    console.error('❌ Erro ao atualizar order_index:', error);
    throw error;
  }
};

export default function Results() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWODs] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [scoringConfigs, setScoringConfigs] = useState<any[]>([]);
  const [existingResults, setExistingResults] = useState<any[]>([]);
  const [wodVariations, setWodVariations] = useState<Record<string, Record<string, any>>>({});

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWOD, setSelectedWOD] = useState<string>('');
  const [resultInputs, setResultInputs] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadData();
    }
  }, [selectedChampionship]);

  useEffect(() => {
    if (selectedCategory && selectedWOD) {
      loadExistingResults();
      // Debug: verificar tipo do WOD selecionado
      const wod = wods.find(w => w.id === selectedWOD);
      if (wod) {
        console.log('WOD selecionado:', wod.name, 'Tipo:', wod.type);
      }
    }
  }, [selectedCategory, selectedWOD, wods]);

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
      const [catsResult, wodsResult, regsResult, configsResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", selectedChampionship.id).order("order_index"),
        supabase.from("wods").select("*").eq("championship_id", selectedChampionship.id).order("order_num"),
        supabase.from("registrations").select("*").eq("championship_id", selectedChampionship.id).neq("status", "cancelled"),
        supabase.from("scoring_configs").select("*"),
      ]);

      if (catsResult.error) throw catsResult.error;
      if (wodsResult.error) throw wodsResult.error;
      if (regsResult.error) throw regsResult.error;
      if (configsResult.error) throw configsResult.error;

      setCategories(catsResult.data || []);
      setWODs(wodsResult.data || []);
      setRegistrations(regsResult.data || []);
      setScoringConfigs(configsResult.data || []);

      const wodIds = (wodsResult.data || []).map((wod: any) => wod.id);
      if (wodIds.length > 0) {
        const { data: variationsData, error: variationsError } = await supabase
          .from("wod_category_variations")
          .select("*")
          .in("wod_id", wodIds);

        if (variationsError) {
          if (variationsError.code === '42P01' || (variationsError.message ?? '').includes('wod_category_variations')) {
            console.warn('Tabela wod_category_variations ausente, seguindo sem variações específicas.');
            setWodVariations({});
          } else {
            throw variationsError;
          }
        } else {
          const map: Record<string, Record<string, any>> = {};
          (variationsData || []).forEach((variation: any) => {
            if (!map[variation.wod_id]) {
              map[variation.wod_id] = {};
            }
            map[variation.wod_id][variation.category_id] = variation;
          });

          setWodVariations(map);
        }
      } else {
        setWodVariations({});
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResults = async () => {
    if (!selectedCategory || !selectedWOD) return;

    try {
      const { data, error } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory)
        .eq("wod_id", selectedWOD);

      if (error) throw error;

      setExistingResults(data || []);

      const inputs = new Map();
      (data || []).forEach((result: any) => {
        const participantId = result.registration_id || '';
        if (participantId) {
          inputs.set(participantId, {
            result: result.result || '',
            tiebreakValue: result.tiebreak_value || '',
            status: result.status,
            isDNF: result.status === 'dnf',
            isDNS: result.status === 'dns',
          });
        }
      });
      setResultInputs(inputs);
    } catch (error: any) {
      console.error("Error loading results:", error);
    }
  };

  const getParticipants = () => {
    if (!selectedCategory) return [];

    const categoryRegs = registrations.filter(r => r.category_id === selectedCategory);
    return categoryRegs.map(reg => ({
      id: reg.id,
      name: reg.team_name || reg.athlete_name,
      type: reg.team_name ? 'team' : 'individual',
      registration: reg,
    }));
  };

  const handleInputChange = (participantId: string, field: string, value: any) => {
    const current = resultInputs.get(participantId) || {};
    const updated = { ...current, [field]: value };

    if (field === 'isDNF' && value) {
      updated.isDNS = false;
      updated.status = 'dnf';
    } else if (field === 'isDNS' && value) {
      updated.isDNF = false;
      updated.status = 'dns';
    } else if ((field === 'isDNF' || field === 'isDNS') && !value) {
      updated.status = 'completed';
    }

    setResultInputs(new Map(resultInputs.set(participantId, updated)));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!selectedChampionship || !selectedCategory || !selectedWOD) {
      toast.error("Selecione categoria e WOD");
      return;
    }

    const config = scoringConfigs.find(c => c.category_id === selectedCategory);
    if (!config) {
      toast.error("Configure a pontuação desta categoria primeiro");
      return;
    }

    const wod = wods.find(w => w.id === selectedWOD);
    if (!wod) return;

    setSaving(true);
    try {
      // Buscar resultados existentes para deletar
      const { data: existing } = await supabase
        .from("wod_results")
        .select("id")
        .eq("category_id", selectedCategory)
        .eq("wod_id", selectedWOD);

      if (existing && existing.length > 0) {
        const { error: deleteError } = await supabase
          .from("wod_results")
          .delete()
          .eq("category_id", selectedCategory)
          .eq("wod_id", selectedWOD);

        if (deleteError) throw deleteError;
      }

      // Criar novos resultados apenas para participantes com dados preenchidos
      const participants = getParticipants();
      const newResults: any[] = [];

      participants.forEach(participant => {
        const input = resultInputs.get(participant.id);
        if (!input) return;

        // Só adicionar se houver resultado, tiebreak ou status diferente de 'completed'
        const hasResult = input.result && input.result.trim() !== '';
        const hasTiebreak = input.tiebreakValue && input.tiebreakValue.trim() !== '';
        const hasStatus = input.status && input.status !== 'completed';

        if (hasResult || hasTiebreak || hasStatus) {
          newResults.push({
            wod_id: selectedWOD,
            category_id: selectedCategory,
            registration_id: participant.id,
            result: input.result?.trim() || null,
            tiebreak_value: input.tiebreakValue?.trim() || null,
            status: input.status || 'completed',
            is_published: publish, // Definir se está publicado ou não (false ao salvar, true ao publicar)
          });
        }
      });

      // Se não há resultados para inserir, apenas deletar os existentes e finalizar
      if (newResults.length === 0) {
        console.log('🗑️ Removendo todos os resultados para', selectedCategory, selectedWOD);

        // Garantir que todos os resultados foram deletados
        if (existing && existing.length > 0) {
          const { error: finalDeleteError } = await supabase
            .from("wod_results")
            .delete()
            .eq("category_id", selectedCategory)
            .eq("wod_id", selectedWOD);

          if (finalDeleteError) {
            console.error("❌ Erro ao deletar resultados:", finalDeleteError);
            throw finalDeleteError;
          }
          console.log('✅ Resultados deletados:', existing.length);
        }

        toast.success("Todos os resultados foram removidos");
        setSaving(false);
        // Recarregar resultados para limpar a interface
        await loadExistingResults();

        // Disparar evento IMEDIATAMENTE para atualizar o leaderboard
        console.log('📢 Disparando evento para atualizar leaderboard...');
        window.dispatchEvent(new CustomEvent('wod_results_updated'));

        // Também disparar novamente após um pequeno delay para garantir
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('wod_results_updated'));
        }, 500);
        return;
      }

      // Inserir resultados
      const { error: insertError } = await supabase
        .from("wod_results")
        .insert(newResults);

      if (insertError) throw insertError;

      // Calcular pontos (precisamos buscar os resultados inseridos)
      const { data: insertedResults, error: fetchError } = await supabase
        .from("wod_results")
        .select("*")
        .eq("category_id", selectedCategory)
        .eq("wod_id", selectedWOD);

      if (fetchError) throw fetchError;

      // Converter para formato do scoring (compatível com a interface WODResult)
      const resultsForScoring = (insertedResults || []).map((r: any) => ({
        id: r.id,
        wodId: r.wod_id,
        categoryId: r.category_id,
        registrationId: r.registration_id,
        athleteId: r.athlete_id,
        teamId: r.team_id,
        result: r.result,
        tiebreakValue: r.tiebreak_value,
        status: r.status as 'completed' | 'dnf' | 'dns',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      // Converter config para o formato esperado
      const pointsTable = config.points_table;
      const scoringConfig = {
        id: config.id,
        categoryId: config.category_id,
        presetType: config.preset_type as any,
        pointsTable: (pointsTable && typeof pointsTable === 'object')
          ? (pointsTable as { [position: number]: number })
          : {},
        dnfPoints: config.dnf_points || 0,
        dnsPoints: config.dns_points || 0,
        createdAt: config.created_at || '',
        updatedAt: config.updated_at || '',
      };

      // Calcular pontos
      const resultsWithPoints = calculateWODPoints(resultsForScoring, scoringConfig, wod.type);

      // Atualizar com pontos e posições
      for (const result of resultsWithPoints) {
        const { error: updateError } = await supabase
          .from("wod_results")
          .update({
            position: result.position,
            points: result.points,
          })
          .eq("id", result.id);

        if (updateError) throw updateError;
      }

      // Se não estiver publicando, garantir que os resultados inseridos tenham is_published = false
      // Se estiver publicando, atualizar para is_published = true
      if (publish) {
        const { error: publishError } = await supabase
          .from("wod_results")
          .update({ is_published: true })
          .eq("category_id", selectedCategory)
          .eq("wod_id", selectedWOD);

        if (publishError) throw publishError;

        // ATUALIZAR ORDER_INDEX AUTOMATICAMENTE BASEADO NO LEADERBOARD
        await updateOrderIndexFromLeaderboard(selectedCategory);

        toast.success("Resultados salvos, pontuação calculada e publicados no leaderboard!");
      } else {
        // Garantir que resultados salvos sem publicar tenham is_published = false
        const { error: unpublishError } = await supabase
          .from("wod_results")
          .update({ is_published: false })
          .eq("category_id", selectedCategory)
          .eq("wod_id", selectedWOD);

        if (unpublishError) throw unpublishError;
        toast.success("Resultados salvos e pontuação calculada! (Não publicados ainda)");
      }

      await loadExistingResults();

      // Disparar evento IMEDIATAMENTE para atualizar o leaderboard
      console.log('📢 Disparando evento para atualizar leaderboard após salvar...');
      window.dispatchEvent(new CustomEvent('wod_results_updated'));

      // Também disparar novamente após um pequeno delay para garantir
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('wod_results_updated'));
      }, 500);
    } catch (error: any) {
      console.error("Error saving results:", error);
      toast.error("Erro ao salvar resultados");
    } finally {
      setSaving(false);
    }
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

  const participants = selectedCategory ? getParticipants() : [];
  const selectedWODData = wods.find(w => w.id === selectedWOD);
  const selectedVariation = selectedCategory && selectedWOD ? wodVariations[selectedWOD]?.[selectedCategory] : null;
  const displayTimeCapMinutes = selectedVariation?.estimated_duration_minutes || selectedWODData?.estimated_duration_minutes;
  const displayDescription = selectedVariation?.description || selectedWODData?.description;
  const displayNotes = selectedVariation?.notes || selectedWODData?.notes;

  // Função para obter o label e placeholder baseado no tipo de WOD
  const getResultFieldInfo = (wodType: string | undefined) => {
    if (!wodType) {
      return {
        label: 'Resultado',
        placeholder: 'Digite o resultado',
        helpText: ''
      };
    }

    switch (wodType) {
      case 'for-time':
      case 'tempo': // Compatibilidade com tipo antigo
        return {
          label: 'Tempo de Finalização',
          placeholder: 'MM:SS ou minutos:segundos (ex: 5:30)',
          helpText: 'Digite o tempo total de finalização do WOD'
        };
      case 'amrap':
      case 'emom':
        return {
          label: 'Rounds/Reps Completados',
          placeholder: 'Número de rounds ou reps (ex: 8 ou 150)',
          helpText: 'Digite o total de rounds ou reps completados no tempo limite'
        };
      case 'tonelagem':
        return {
          label: 'Tonelagem Total (kg)',
          placeholder: 'Peso total levantado (ex: 5000)',
          helpText: 'Digite a soma de todos os pesos levantados em quilogramas'
        };
      case 'carga-maxima':
        return {
          label: 'Carga Máxima (kg)',
          placeholder: 'Peso máximo levantado (ex: 150)',
          helpText: 'Digite o maior peso levantado com sucesso em quilogramas'
        };
      default:
        return {
          label: 'Resultado',
          placeholder: 'Digite o resultado',
          helpText: ''
        };
    }
  };

  const resultFieldInfo = selectedWODData ? getResultFieldInfo(selectedWODData.type) : getResultFieldInfo(undefined);

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">Lançamento de Resultados</h1>
        </div>
        <p className="text-muted-foreground">Digite os resultados dos WODs por categoria</p>
      </div>

      <Card className="p-6 shadow-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Categoria</Label>
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

          <div>
            <Label htmlFor="wod">WOD</Label>
            <Select value={selectedWOD} onValueChange={setSelectedWOD}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um WOD" />
              </SelectTrigger>
              <SelectContent>
                {wods.map(wod => {
                  const typeLabel = wod.type === 'for-time' || wod.type === 'tempo' ? 'For Time' :
                    wod.type === 'amrap' ? 'AMRAP' :
                      wod.type === 'emom' ? 'EMOM' :
                        wod.type === 'tonelagem' ? 'Tonelagem' :
                          wod.type === 'carga-maxima' ? 'Carga Máxima' :
                            wod.type || 'Não definido';
                  return (
                    <SelectItem key={wod.id} value={wod.id}>
                      {wod.name} ({typeLabel})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {selectedCategory && selectedWOD && participants.length > 0 && (
        <Card className="p-6 shadow-card">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-1">
              {(selectedVariation?.display_name || selectedWODData?.name) ?? 'WOD'} - {categories.find(c => c.id === selectedCategory)?.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Tipo: {selectedWODData?.type === 'for-time' || selectedWODData?.type === 'tempo' ? 'For Time' :
                selectedWODData?.type === 'amrap' ? 'AMRAP' :
                  selectedWODData?.type === 'emom' ? 'EMOM' :
                    selectedWODData?.type === 'tonelagem' ? 'Tonelagem' :
                      selectedWODData?.type === 'carga-maxima' ? 'Carga Máxima' :
                        selectedWODData?.type || 'Não definido'}
              {displayTimeCapMinutes && ` | Time Cap: ${displayTimeCapMinutes} min`}
            </p>
            {displayDescription && (
              <div className="mt-3 rounded-lg bg-muted/40 p-3">
                <pre className="text-sm whitespace-pre-wrap leading-relaxed">{displayDescription}</pre>
              </div>
            )}
            {displayNotes && (
              <p className="text-xs text-muted-foreground mt-2">{displayNotes}</p>
            )}
            {selectedWODData && (
              <p className="text-xs text-muted-foreground mt-1">
                {resultFieldInfo.helpText}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta/Time</TableHead>
                  <TableHead>
                    {resultFieldInfo?.label || 'Resultado'}
                    {resultFieldInfo?.helpText && (
                      <span className="block text-xs font-normal text-muted-foreground mt-1">
                        {resultFieldInfo.helpText}
                      </span>
                    )}
                  </TableHead>
                  <TableHead>Tiebreak</TableHead>
                  <TableHead className="text-center">DNF</TableHead>
                  <TableHead className="text-center">DNS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map(participant => {
                  const input = resultInputs.get(participant.id) || {};
                  return (
                    <TableRow key={participant.id}>
                      <TableCell className="font-semibold">{participant.name}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={input.result || ''}
                          onChange={(e) => handleInputChange(participant.id, 'result', e.target.value)}
                          placeholder={resultFieldInfo?.placeholder || 'Digite o resultado'}
                          disabled={input.isDNF || input.isDNS}
                          className="w-48"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={input.tiebreakValue || ''}
                          onChange={(e) => handleInputChange(participant.id, 'tiebreakValue', e.target.value)}
                          placeholder={
                            selectedWODData?.type === 'for-time' || selectedWODData?.type === 'tempo' ? 'Reps completados (opcional)' :
                              selectedWODData?.type === 'amrap' ? 'Tempo restante (opcional)' :
                                selectedWODData?.type === 'tonelagem' ? 'Tempo total (opcional)' :
                                  selectedWODData?.type === 'carga-maxima' ? 'Tentativas (opcional)' :
                                    'Opcional'
                          }
                          disabled={input.isDNF || input.isDNS}
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={input.isDNF || false}
                          onCheckedChange={(checked) => handleInputChange(participant.id, 'isDNF', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={input.isDNS || false}
                          onCheckedChange={(checked) => handleInputChange(participant.id, 'isDNS', checked)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => handleSave(false)}
              variant="outline"
              className="flex-1 shadow-glow"
              disabled={saving}
            >
              <FileText className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Resultados'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              className="flex-1 shadow-glow"
              disabled={saving}
            >
              <Globe className="w-4 h-4 mr-2" />
              {saving ? 'Publicando...' : 'Publicar Resultados'}
            </Button>
          </div>
        </Card>
      )}

      {selectedCategory && selectedWOD && participants.length === 0 && (
        <Card className="p-12 text-center shadow-card">
          <p className="text-muted-foreground">Nenhum participante inscrito nesta categoria.</p>
        </Card>
      )}
    </div>
  );
}
