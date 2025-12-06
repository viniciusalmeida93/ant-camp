import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [linkPage, setLinkPage] = useState<any>(null);
  const [buttons, setButtons] = useState<any[]>([]);
  const [championshipSlug, setChampionshipSlug] = useState<string>("");

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

  const activeButtons = buttons.filter((button) => button.is_active !== false);

  const handleButtonClick = (button: any) => {
    console.log("Botão clicado:", button.button_type, "Championship slug:", championshipSlug);
    
    // Adicionar timestamp para forçar cache bust
    const cacheBust = `?v=${Date.now()}`;
    
    if (button.button_type === "leaderboard" && championshipSlug) {
      const url = `/${championshipSlug}/leaderboard${cacheBust}`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
    } else if (button.button_type === "registration" && championshipSlug) {
      const url = `/register/${championshipSlug}${cacheBust}`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
    } else if (button.button_type === "heats" && championshipSlug) {
      const url = `/${championshipSlug}/heats${cacheBust}`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
    } else if (button.button_type === "wods" && championshipSlug) {
      const url = `/${championshipSlug}/wods${cacheBust}`;
      console.log("Abrindo URL:", url);
      window.open(url, "_blank");
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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center py-4 px-4">
      <div className="max-w-lg w-full mx-auto h-full">
        <Card className="overflow-hidden shadow-xl border border-primary/10 h-[calc(100vh-2rem)] flex flex-col">
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

          <CardContent className="p-6 sm:p-8 space-y-8 flex-1 flex flex-col">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{linkPage.title}</h1>
              {linkPage.description && (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {linkPage.description}
                </p>
              )}
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-start">
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

        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            Desenvolvido por <span className="font-semibold text-primary">AntSports</span>
          </p>
        </div>
      </div>
      </div>
    </>
  );
}

