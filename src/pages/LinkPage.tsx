import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [linkPage, setLinkPage] = useState<any>(null);
  const [buttons, setButtons] = useState<any[]>([]);
  const [championshipSlug, setChampionshipSlug] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [wods, setWods] = useState<any[]>([]);
  const [wodVariations, setWodVariations] = useState<Record<string, Record<string, any>>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedWod, setSelectedWod] = useState<string>("");
  const [isWodDialogOpen, setIsWodDialogOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      loadLinkPage();
    }
  }, [slug]);

  const loadLinkPage = async () => {
    try {
      const { data: page, error: pageError } = await supabase
        .from("link_pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (pageError) throw pageError;
      setLinkPage(page);

      await loadAdditionalData(page.championship_id);

      // Get championship slug
      const { data: champ, error: champError } = await supabase
        .from("championships")
        .select("slug")
        .eq("id", page.championship_id)
        .maybeSingle();
      
      if (champError) {
        console.error("Erro ao buscar slug do campeonato:", champError);
      }
      
      if (champ && champ.slug) {
        console.log("Slug do campeonato encontrado:", champ.slug);
        setChampionshipSlug(champ.slug);
      } else {
        console.error("Campeonato não encontrado ou sem slug. ID:", page.championship_id);
      }

      const { data: linkButtons, error: buttonsError } = await supabase
        .from("link_buttons")
        .select("*")
        .eq("link_page_id", page.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (buttonsError) throw buttonsError;
      const hasWodButton = (linkButtons || []).some(button => button.button_type === "wods");
      const finalButtons = [...(linkButtons || [])];

      if (!hasWodButton) {
        finalButtons.push({
          id: "wods-default",
          label: "WODs",
          button_type: "wods",
          is_active: true,
        });
      }

      setButtons(finalButtons);
    } catch (error: any) {
      console.error("Error loading link page:", error);
      toast.error("Página não encontrada");
    } finally {
      setLoading(false);
    }
  };

  const loadAdditionalData = async (championshipId: string) => {
    try {
      const [categoriesResult, wodsResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, format")
          .eq("championship_id", championshipId)
          .order("order_index", { ascending: true, nullsFirst: true }),
        supabase
          .from("wods")
          .select("*")
          .eq("championship_id", championshipId)
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
      console.error("Error loading WOD data:", error);
      toast.error("Erro ao carregar dados de WODs");
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

  const activeWod = selectedWod ? wods.find(wod => wod.id === selectedWod) : null;
  const activeVariation = selectedCategory && selectedWod ? getVariationFor(selectedWod, selectedCategory) : null;
  const activeButtons = buttons.filter((button) => button.is_active !== false);

  const handleButtonClick = (button: any) => {
    console.log("Botão clicado:", button.button_type, "Championship slug:", championshipSlug);
    
    if (button.button_type === "leaderboard" && championshipSlug) {
      const url = `/${championshipSlug}/leaderboard`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
    } else if (button.button_type === "registration" && championshipSlug) {
      const url = `/register/${championshipSlug}`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
    } else if (button.button_type === "heats" && championshipSlug) {
      const url = `/${championshipSlug}/heats`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
    } else if (button.button_type === "wods") {
      if (wods.length === 0) {
        toast.error("Nenhum WOD disponível");
        return;
      }
      setIsWodDialogOpen(true);
    } else if (button.url) {
      console.log("Abrindo URL externa:", button.url);
      window.open(button.url, "_blank");
    } else {
      console.error("Não foi possível determinar a URL do botão:", button);
      toast.error("Erro ao abrir link. Verifique a configuração do botão.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!linkPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
            <p className="text-muted-foreground">Esta página de links não existe ou foi removida.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        <Card className="overflow-hidden shadow-xl border border-primary/10">
          {linkPage.banner_url && (
            <div className="relative h-40 sm:h-52">
              <img
                src={linkPage.banner_url}
                alt={linkPage.banner_alt || linkPage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          <CardContent className="p-6 sm:p-8 space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{linkPage.title}</h1>
              {linkPage.description && (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {linkPage.description}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {activeButtons.length === 0 ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 py-10 text-center">
                  <p className="text-muted-foreground">Nenhum link disponível no momento.</p>
                </div>
              ) : (
                activeButtons.map((button) => (
                  <Button
                    key={button.id}
                    onClick={() => handleButtonClick(button)}
                    className="w-full h-auto py-4 px-6 text-base font-medium justify-between transition hover:brightness-105"
                    style={{
                      backgroundColor: linkPage.theme_color || "#ED1B24",
                      borderColor: linkPage.theme_color || "#ED1B24",
                      color: "#ffffff",
                    }}
                  >
                    <span className="flex-1 text-left">{button.label}</span>
                    <ExternalLink className="w-4 h-4 opacity-80" />
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Desenvolvido por <span className="font-semibold text-primary">AntSports</span>
          </p>
        </div>
      </div>
      </div>

      <Dialog open={isWodDialogOpen} onOpenChange={setIsWodDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>WODs do Campeonato</DialogTitle>
          <DialogDescription>
            Selecione a categoria e a prova para ver os detalhes e adaptações específicas.
          </DialogDescription>
        </DialogHeader>

        {wods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum WOD cadastrado ainda para este campeonato.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
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
                <Label>WOD</Label>
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

            {activeWod && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {activeVariation?.display_name || activeWod.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {categories.find(category => category.id === selectedCategory)?.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs uppercase tracking-wider">
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
                    <pre className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
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
        </DialogContent>
      </Dialog>
    </>
  );
}

