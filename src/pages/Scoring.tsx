import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { CROSSFIT_GAMES_POINTS, generateDefaultPoints, generateSimpleOrderPoints } from '@/lib/scoring';

export default function Scoring() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [presetType, setPresetType] = useState<string>('crossfit-games');
  const [rankingMethod, setRankingMethod] = useState<string>('simple');
  const [pointsTableText, setPointsTableText] = useState('');
  const [dnfPoints, setDnfPoints] = useState(0);
  const [dnsPoints, setDnsPoints] = useState(0);

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadData();
    }
  }, [selectedChampionship]);

  useEffect(() => {
    if (categories.length > 0) {
      loadConfig();
    }
  }, [categories]);

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
      const [catsResult, configsResult] = await Promise.all([
        supabase.from("categories").select("*").eq("championship_id", selectedChampionship.id).order("order_index"),
        supabase.from("scoring_configs").select("*"),
      ]);

      if (catsResult.error) throw catsResult.error;
      if (configsResult.error) throw configsResult.error;

      setCategories(catsResult.data || []);
      setConfigs(configsResult.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    if (!selectedChampionship || categories.length === 0) return;

    try {
      // Buscar qualquer config existente do campeonato (todas devem ser iguais)
      const categoryIds = categories.map(c => c.id);
      const { data, error } = await supabase
        .from("scoring_configs")
        .select("*")
        .in("category_id", categoryIds)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPresetType(data.preset_type || 'crossfit-games');
        setRankingMethod(data.ranking_method || 'simple');
        setPointsTableText(JSON.stringify(data.points_table || {}, null, 2));
        setDnfPoints(data.dnf_points || 0);
        setDnsPoints(data.dns_points || 0);
      } else {
        // Config padrão
        setPresetType('crossfit-games');
        setRankingMethod('simple');
        setPointsTableText(JSON.stringify(CROSSFIT_GAMES_POINTS, null, 2));
        setDnfPoints(1);
        setDnsPoints(0);
      }
    } catch (error: any) {
      console.error("Error loading config:", error);
    }
  };

  const handlePresetChange = (value: string) => {
    setPresetType(value);
    if (value === 'crossfit-games') {
      setPointsTableText(JSON.stringify(CROSSFIT_GAMES_POINTS, null, 2));
    } else if (value === 'simple-order') {
      // Usar a maior capacidade entre as categorias
      const maxCapacity = Math.max(...categories.map(c => c.capacity === 999999 ? 100 : c.capacity), 100);
      const simplePoints = generateSimpleOrderPoints(maxCapacity);
      setPointsTableText(JSON.stringify(simplePoints, null, 2));
    } else {
      // Custom - manter o que está
      // Usar a maior capacidade entre as categorias
      const maxCapacity = Math.max(...categories.map(c => c.capacity === 999999 ? 40 : c.capacity), 40);
      const defaultPoints = generateDefaultPoints(maxCapacity);
      setPointsTableText(JSON.stringify(defaultPoints, null, 2));
    }
  };

  const handleSave = async () => {
    if (!selectedChampionship || categories.length === 0) {
      toast.error("Nenhuma categoria encontrada no campeonato");
      return;
    }

    setSaving(true);
    try {
      const pointsTable = JSON.parse(pointsTableText);

      const configData = {
        preset_type: presetType,
        points_table: pointsTable,
        ranking_method: rankingMethod,
        dnf_points: dnfPoints,
        dns_points: dnsPoints,
        updated_at: new Date().toISOString(),
      };

      // Aplicar para todas as categorias do campeonato
      const categoryIds = categories.map(c => c.id);

      // Buscar configs existentes
      const { data: existingConfigs } = await supabase
        .from("scoring_configs")
        .select("id, category_id")
        .in("category_id", categoryIds);

      const existingMap = new Map((existingConfigs || []).map(c => [c.category_id, c.id]));

      // Atualizar ou criar config para cada categoria
      const promises = categoryIds.map(async (categoryId) => {
        const existingId = existingMap.get(categoryId);

        if (existingId) {
          // Atualizar existente
          const { error } = await supabase
            .from("scoring_configs")
            .update(configData)
            .eq("id", existingId);

          if (error) throw error;
        } else {
          // Criar novo
          const { error } = await supabase
            .from("scoring_configs")
            .insert({
              category_id: categoryId,
              ...configData,
              created_at: new Date().toISOString(),
            });

          if (error) throw error;
        }
      });

      await Promise.all(promises);

      toast.success(`Configuração aplicada para todas as ${categories.length} categorias!`);
      await loadData();
      await loadConfig();
    } catch (error: any) {
      console.error("Error saving config:", error);
      if (error.message?.includes('JSON')) {
        toast.error("Formato inválido da tabela de pontos. Use JSON válido.");
      } else {
        toast.error("Erro ao salvar configuração");
      }
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

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">Configuração de Pontuação</h1>
        </div>
        <p className="text-muted-foreground">Configure o sistema de pontuação para todas as categorias do campeonato</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 shadow-card">
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary font-semibold mb-1">
                ⚙️ Configuração Global
              </p>
              <p className="text-xs text-muted-foreground">
                Esta configuração será aplicada automaticamente para todas as {categories.length} categorias do campeonato.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rankingMethod">Critério de Pontuação (Empates)</Label>
                <Select value={rankingMethod} onValueChange={setRankingMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Critério Simples (1º, 1º, 2º...)</SelectItem>
                    <SelectItem value="standard">Critério da Crossfit (1º, 1º, 3º...)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Simples: não pula posições. Crossfit: pula posições após empates.
                </p>
              </div>
              <div>
                <Label htmlFor="preset">Preset de Pontuação</Label>
                <Select value={presetType} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crossfit-games">Crossfit</SelectItem>
                    <SelectItem value="simple-order">Ordem Simples</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="pointsTable">Tabela de Pontos (JSON)</Label>
              <Textarea
                id="pointsTable"
                value={pointsTableText}
                onChange={(e) => setPointsTableText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder='{"1": 100, "2": 97, "3": 94, ...}'
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formato: {`{"posição": pontos}`}. Ex: {`{"1": 100, "2": 97}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dnfPoints">Pontos para DNF</Label>
                <Input
                  id="dnfPoints"
                  type="number"
                  value={dnfPoints}
                  onChange={(e) => setDnfPoints(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="dnsPoints">Pontos para DNS</Label>
                <Input
                  id="dnsPoints"
                  type="number"
                  value={dnsPoints}
                  onChange={(e) => setDnsPoints(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full shadow-glow" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h3 className="text-lg font-bold mb-4">Categorias do Campeonato</h3>
          <div className="space-y-2">
            {categories.map(category => {
              const config = configs.find(c => c.category_id === category.id);
              return (
                <div
                  key={category.id}
                  className="p-3 rounded-lg bg-muted/50"
                >
                  <p className="font-semibold text-sm">{category.name}</p>
                  <div className="flex gap-2 mt-1">
                    {config ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">
                        ✓ Configurada
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Aguardando
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma categoria criada
              </p>
            )}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="font-semibold text-sm mb-2 text-primary">Preset CrossFit Games</h4>
            <p className="text-xs text-muted-foreground">
              Sistema oficial: 100 pts (1º), 97 (2º), 94 (3º)...
              Tiebreaks: mais 1ºs lugares, depois 2ºs, depois última colocação.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
