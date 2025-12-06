import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Loader2 } from "lucide-react";

export default function PublicWODs() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [championship, setChampionship] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWods] = useState<any[]>([]);
  const [wodVariations, setWodVariations] = useState<Record<string, Record<string, any>>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedWod, setSelectedWod] = useState<string>("");

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) {
      setSelectedWod('');
      return;
    }

    setSelectedWod(prev => {
      if (prev && wods.some(wod => wod.id === prev)) {
        return prev;
      }
      const firstWod = wods[0]?.id || '';
      return firstWod;
    });
  }, [selectedCategory, wods]);

  const loadData = async () => {
    try {
      // Load championship
      const { data: champ, error: champError } = await supabase
        .from("championships")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (champError) throw champError;
      if (!champ) {
        setLoading(false);
        return;
      }
      
      setChampionship(champ);

      // Load categories, WODs
      const [categoriesResult, wodsResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, format")
          .eq("championship_id", champ.id)
          .order("order_index", { ascending: true, nullsFirst: true }),
        supabase
          .from("wods")
          .select("*")
          .eq("championship_id", champ.id)
          .eq("is_published", true)
          .order("order_num", { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (wodsResult.error) throw wodsResult.error;

      setCategories(categoriesResult.data || []);
      setWods(wodsResult.data || []);

      const wodIds = (wodsResult.data || []).map((wod: any) => wod.id);

      if (wodIds.length > 0) {
        const { data: variationsData, error: variationsError } = await supabase
          .from("wod_category_variations")
          .select("*")
          .in("wod_id", wodIds);

        if (variationsError) {
          if (variationsError.code === '42P01' || (variationsError.message ?? '').includes('wod_category_variations')) {
            console.warn('Tabela wod_category_variations ausente');
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
    } finally {
      setLoading(false);
    }
  };

  const getWodTypeLabel = (type?: string) => {
    if (!type) return "Não definido";
    switch (type) {
      case "for-time":
      case "tempo":
        return "For Time";
      case "amrap":
        return "AMRAP";
      case "emom":
        return "EMOM";
      case "tonelagem":
        return "Tonelagem";
      case "carga-maxima":
        return "Carga Máxima";
      default:
        return type;
    }
  };

  const getVariationFor = (wodId: string, categoryId: string) => {
    return wodVariations[wodId]?.[categoryId];
  };

  const activeWod = selectedWod ? wods.find(wod => wod.id === selectedWod) : null;
  const activeVariation = selectedCategory && selectedWod ? getVariationFor(selectedWod, selectedCategory) : null;

  if (loading) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto p-6">
            <p className="text-muted-foreground mb-4">Campeonato não encontrado.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{championship.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">WODs</p>
          </div>
        </div>
      </div>

      {wods.length === 0 ? (
        <Card className="p-6">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum WOD publicado ainda para este campeonato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 sm:p-6 shadow-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-2 block">Categoria</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-2 block">WOD</Label>
                <Select
                  value={selectedWod}
                  onValueChange={setSelectedWod}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um WOD" />
                  </SelectTrigger>
                  <SelectContent>
                    {wods.map(wod => {
                      const variation = selectedCategory ? getVariationFor(wod.id, selectedCategory) : null;
                      const label = variation?.display_name || wod.name;
                      return (
                        <SelectItem key={wod.id} value={wod.id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {activeWod && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold">
                      {activeVariation?.display_name || activeWod.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {categories.find(category => category.id === selectedCategory)?.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs uppercase tracking-wider w-fit">
                    {getWodTypeLabel(activeWod.type)}
                  </Badge>
                </div>

                {(activeVariation?.estimated_duration_minutes || activeWod.estimated_duration_minutes) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Time Cap:</span>
                    <span>
                      {activeVariation?.estimated_duration_minutes || activeWod.estimated_duration_minutes} min
                    </span>
                  </div>
                )}

                <div className="rounded-lg bg-muted/40 p-4">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Estrutura da prova
                  </Label>
                  <pre className="mt-2 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                    {activeVariation?.description || activeWod.description}
                  </pre>
                </div>

                {(activeVariation?.notes || activeWod.notes) && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Observações
                    </Label>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeVariation?.notes || activeWod.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

