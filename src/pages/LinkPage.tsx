import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trophy, Users, FileText, Calendar, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  leaderboard: Award,
  registration: Users,
  heats: Calendar,
  rules: FileText,
  external: ExternalLink,
};

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
      setButtons(linkButtons || []);
    } catch (error: any) {
      console.error("Error loading link page:", error);
      toast.error("Página não encontrada");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Banner */}
        {linkPage.banner_url && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
            <img
              src={linkPage.banner_url}
              alt={linkPage.banner_alt || linkPage.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{linkPage.title}</h1>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {buttons.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum link disponível no momento.</p>
              </CardContent>
            </Card>
          ) : (
            buttons.map((button) => {
              const Icon = iconMap[button.icon] || iconMap[button.button_type] || ExternalLink;
              return (
                <Button
                  key={button.id}
                  onClick={() => handleButtonClick(button)}
                  className="w-full h-auto py-4 px-6 text-base font-medium justify-start gap-3"
                  variant="outline"
                  style={{
                    borderColor: linkPage.theme_color || "#ED1B24",
                    color: linkPage.theme_color || "#ED1B24",
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{button.label}</span>
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </Button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">AntSports</span>
          </p>
        </div>
      </div>
    </div>
  );
}

