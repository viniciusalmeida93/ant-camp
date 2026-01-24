import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Calendar, MapPin, User, Trophy, FileText, ChevronLeft } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader"; // IMPORTED
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LinkPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [championship, setChampionship] = useState<any>(null);
  const [linkPage, setLinkPage] = useState<any>(null);
  const [buttons, setButtons] = useState<any[]>([]);
  const [organizerName, setOrganizerName] = useState("AntCamp");
  const [isRegulationOpen, setIsRegulationOpen] = useState(false);

  useEffect(() => {
    loadPageData();
  }, [slug]);

  const loadPageData = async () => {
    try {
      const { data: page, error: pageError } = await supabase
        .from("link_pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (pageError) throw pageError;
      setLinkPage(page);

      const { data: champ, error: champError } = await supabase
        .from("championships")
        .select("*")
        .eq("id", page.championship_id)
        .single();

      if (champError) throw champError;
      setChampionship(champ);

      if (champ.organizer_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", champ.organizer_id)
          .maybeSingle();
        if (profile && profile.full_name) setOrganizerName(profile.full_name);
      }

      const { data: linkButtons } = await supabase
        .from("link_buttons")
        .select("*")
        .eq("link_page_id", page.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      const finalButtons = [...(linkButtons || [])];

      const hasWodButton = (linkButtons || []).some(button => button.button_type === "wods");
      if (!hasWodButton) finalButtons.push({ id: "wods-default", label: "Provas", button_type: "wods", is_active: true });

      const hasLeaderboard = finalButtons.some(b => b.button_type === 'leaderboard');
      if (!hasLeaderboard) finalButtons.push({ id: "leaderboard-default", label: "Leaderboard", button_type: "leaderboard", is_active: true });

      const hasHeats = finalButtons.some(b => b.button_type === 'heats');
      if (!hasHeats) finalButtons.push({ id: "heats-default", label: "Baterias", button_type: "heats", is_active: true });

      setButtons(finalButtons);

    } catch (error: any) {
      console.error("Error loading page data:", error);
      toast.error("Erro ao carregar dados da página");
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (button: any) => {
    const cacheBust = `?v=${Date.now()}`;
    const champSlug = championship?.slug;
    if (!champSlug) return;

    if (button.button_type === "leaderboard") navigate(`/${champSlug}/leaderboard`);
    else if (button.button_type === "heats") navigate(`/${champSlug}/heats`);
    else if (button.button_type === "wods") navigate(`/${champSlug}/wods`);
    else if (button.button_type === "regulation") setIsRegulationOpen(true);
    else if (button.button_type === "registration") navigate(`/inscricao/${champSlug}`);
    else if (button.url) window.open(button.url, "_blank"); // External links usually still new tab? Let's keep existing behavior for custom URLs unless user specified ALL. User said "buttons... do not open in new tab". Custom URLs might be Instagram etc. Best to keep external in new tab? User said "buttons DO NOT open in new tab...". I will force external to new tab (_blank), but internal to navigate. 
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 data-testid="loading-spinner" className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!championship) return <div data-testid="not-found-message" className="min-h-screen bg-background text-center pt-20 text-muted-foreground">Campeonato não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col items-center">
      {/* 1. Navbar / Header */}
      <PublicHeader />

      <div className="w-full max-w-[600px] px-6 py-8 flex flex-col gap-6">
        {/* 2. Banner/Logo Area */}
        <div className="rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
          {(linkPage?.banner_url || championship.banner_url) ? (
            <img
              src={linkPage?.banner_url || championship.banner_url}
              alt={linkPage?.banner_alt || championship.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6">
              <h1 className="text-2xl font-bold text-foreground mb-3">{championship.name}</h1>
              <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10">AntCamp Eventos</Badge>
            </div>
          )}
        </div>

        {/* 3. Info Card - Compact */}
        <Card className="border-0 bg-card shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-medium">Data</span>
              </div>
              <span className="font-medium text-foreground text-[10px]">{new Date(championship.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-medium">Local</span>
              </div>
              <span className="font-medium text-foreground text-right max-w-[60%] truncate uppercase text-[10px]">{championship.location}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="text-[10px] font-medium">Organizador</span>
              </div>
              <span className="font-medium text-foreground text-[10px]">{organizerName}</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Main Actions / Links */}
        {/* Other Link Buttons */}
        {buttons.map(b => (
          <Button
            key={b.id}
            variant="outline"
            onClick={() => handleButtonClick(b)}
            className="w-full h-12 text-sm font-semibold border-none hover:opacity-90 transition-all justify-between px-4 group shadow-md rounded"
            style={{
              backgroundColor: linkPage?.theme_color || undefined,
              color: linkPage?.theme_color ? '#ffffff' : undefined, // Assuming white text for colored buttons
              boxShadow: linkPage?.theme_color ? `0 4px 6px -1px ${linkPage.theme_color}40` : undefined
            }}
          >

            {b.label}
            {/* Icon removed as requested */}
          </Button>
        ))}

        {/* Manual Regulation Button if not in list but text exists? 
            User said "regras" to "regulamento". If there is a "regras" button locally or db, rename it. 
            For now, let's append a Regulation button if championship.regulation exists and no button yet? 
            Or just rely on the Organizer to add it? User said "Dashboard... vamos adicionar".
            Let's add a default "Regulamento" button if text exists.
        */}
        {championship?.regulation && !buttons.find(b => b.button_type === 'regulation' || b.label.toLowerCase().includes('regras') || b.label.toLowerCase().includes('regulamento')) && (
          <Button
            variant="outline"
            onClick={() => setIsRegulationOpen(true)}
            className="w-full h-12 text-sm font-semibold border-none hover:opacity-90 transition-all justify-between px-4 group shadow-md rounded"
            style={{
              backgroundColor: linkPage?.theme_color || undefined,
              color: linkPage?.theme_color ? '#ffffff' : undefined,
              boxShadow: linkPage?.theme_color ? `0 4px 6px -1px ${linkPage.theme_color}40` : undefined
            }}
          >
            Regulamento
          </Button>
        )}

      </div>

      <Dialog open={isRegulationOpen} onOpenChange={setIsRegulationOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 bg-card text-foreground border-border">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Regulamento</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6 pt-2">
            <div className="text-sm whitespace-pre-wrap leading-relaxed space-y-4">
              {championship?.regulation ? championship.regulation : "Regulamento não disponível."}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>


      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-widest opacity-50">Desenvolvido por AntCamp</p>
      </div>

    </div >
  );
}
