import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  ExternalLink,
  Trophy,
  Users,
  FileText,
  Calendar,
  Award,
  Upload,
  Loader2,

  ArrowLeft,
  Share2,
  MapPin,
  User,
  Menu,
} from "lucide-react";

const buttonTypes = [
  { value: "external", label: "Link Externo", icon: ExternalLink },
  { value: "leaderboard", label: "Leaderboard", icon: Award },
  { value: "registration", label: "Inscrições", icon: Users },
  { value: "heats", label: "Baterias", icon: Calendar },
  { value: "rules", label: "Regras", icon: FileText },
  { value: "wods", label: "WODs", icon: Trophy },
];

export default function LinkPageConfig() {
  const { championshipId } = useParams<{ championshipId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkPage, setLinkPage] = useState<any>(null);
  const [buttons, setButtons] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    slug: "",
    banner_alt: "",
    theme_color: "#ED1B24",
  });
  const [championshipInfo, setChampionshipInfo] = useState<any>(null);

  useEffect(() => {
    if (championshipId) {
      loadLinkPage();
    }
  }, [championshipId]);

  const loadLinkPage = async () => {
    try {
      const { data: page, error } = await supabase
        .from("link_pages")
        .select("*")
        .eq("championship_id", championshipId)
        .maybeSingle();

      if (error) throw error;

      if (page) {
        setLinkPage(page);
        setFormData({
          slug: page.slug || "",
          banner_alt: page.banner_alt || "",
          theme_color: page.theme_color || "#ED1B24",
        });

        const { data: linkButtons } = await supabase
          .from("link_buttons")
          .select("*")
          .eq("link_page_id", page.id)
          .order("order_index", { ascending: true });

        // Garantir que todos os botões tenham button_type
        const normalizedButtons = (linkButtons || []).map((btn: any) => ({
          ...btn,
          button_type: btn.button_type || "external",
          icon: btn.icon || btn.button_type || "external",
        }));

        console.log("Loaded buttons:", normalizedButtons);
        let finalButtons = [...normalizedButtons];

        const hasWodsButton = finalButtons.some(
          (btn) => (btn.button_type || btn.icon) === "wods"
        );

        if (!hasWodsButton) {
          finalButtons.push({
            id: "wods-default",
            label: "WODs",
            url: null,
            icon: "wods",
            button_type: "wods",
            order_index: finalButtons.length,
            is_active: true,
            isNew: true,
          });
        }

        setButtons(finalButtons);
      } else {
        // Get championship slug for default
        const { data: champ } = await supabase
          .from("championships")
          .select("slug")
          .eq("id", championshipId)
          .single();

        if (champ) {
          setFormData((prev) => ({
            ...prev,
            slug: champ.slug || "",
          }));
        }
      }

      // Fetch Championship Info for Preview
      const { data: champDetails } = await supabase
        .from("championships")
        .select("name, date, location, organizer_id")
        .eq("id", championshipId)
        .single();

      if (champDetails) {
        let organizerName = "Organizador";
        if (champDetails.organizer_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", champDetails.organizer_id)
            .maybeSingle();
          if (profile && profile.full_name) organizerName = profile.full_name;
        }

        setChampionshipInfo({
          name: champDetails.name,
          date: champDetails.date,
          location: champDetails.location,
          organizer: organizerName
        });
      }

    } catch (error: any) {
      console.error("Error loading link page:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${championshipId}/banner-${Date.now()}.${fileExt}`;

      // Delete old banner if exists
      if (linkPage?.banner_url) {
        const oldFileName = linkPage.banner_url.split("/").pop();
        if (oldFileName) {
          await supabase.storage
            .from("link-banners")
            .remove([`${championshipId}/${oldFileName}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("link-banners")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("link-banners")
        .getPublicUrl(fileName);

      setLinkPage((prev: any) => ({ ...prev, banner_url: publicUrl }));
      toast.success("Banner enviado com sucesso!");
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      toast.error("Erro ao enviar banner");
    } finally {
      setUploading(false);
    }
  };

  const addButton = () => {
    const newButton = {
      id: `temp-${Date.now()}`,
      label: "",
      url: "",
      icon: "external",
      button_type: "external",
      order_index: buttons.length,
      is_active: true,
      isNew: true,
    };
    setButtons([...buttons, newButton]);
  };

  const removeButton = (id: string) => {
    setButtons(buttons.filter((b) => b.id !== id));
  };

  const updateButton = (id: string, field: string, value: any) => {
    console.log("Updating button:", id, field, value, "Current buttons:", buttons);
    setButtons(prevButtons => {
      const updated = prevButtons.map((b) => (b.id === id ? { ...b, [field]: value } : b));
      console.log("Updated buttons:", updated);
      return updated;
    });
  };

  const moveButton = (index: number, direction: "up" | "down") => {
    const newButtons = [...buttons];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newButtons.length) return;

    [newButtons[index], newButtons[newIndex]] = [
      newButtons[newIndex],
      newButtons[index],
    ];

    setButtons(newButtons.map((b, i) => ({ ...b, order_index: i })));
  };

  const handleSave = async () => {
    if (!formData.slug) {
      toast.error("Slug é obrigatório");
      return;
    }

    setSaving(true);
    try {
      let pageId = linkPage?.id;

      // Create or update link page
      const pageData = {
        championship_id: championshipId,
        slug: formData.slug,
        // title: formData.title, // Removed title
        banner_url: linkPage?.banner_url,
        banner_alt: formData.banner_alt,
        theme_color: formData.theme_color,
      };

      if (pageId) {
        const { error } = await supabase
          .from("link_pages")
          .update(pageData)
          .eq("id", pageId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("link_pages")
          .insert(pageData)
          .select()
          .single();

        if (error) throw error;
        pageId = data.id;
        setLinkPage(data);
      }

      // Delete existing buttons
      if (pageId) {
        await supabase.from("link_buttons").delete().eq("link_page_id", pageId);
      }

      // Insert new buttons
      const buttonsToSave = buttons
        .filter((b) => b.label?.trim() && (b.button_type !== "external" || b.url?.trim()))
        .map((b, index) => ({
          link_page_id: pageId,
          label: b.label,
          url: b.button_type === "external" ? (b.url || "") : "",
          icon: b.icon || b.button_type,
          button_type: b.button_type,
          order_index: index,
          is_active: b.is_active ?? true,
        }));

      if (buttonsToSave.length > 0) {
        const { error: buttonsError } = await supabase
          .from("link_buttons")
          .insert(buttonsToSave);

        if (buttonsError) throw buttonsError;
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const previewUrl = formData.slug
    ? `${window.location.origin}/links/${formData.slug}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Configurar Página de Links
          </h1>
          <p className="text-muted-foreground">
            Configure sua página de links para compartilhar no Instagram
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Configure o título e URL da sua página de links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      antsports.com.br/links/
                    </span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                        })
                      }
                      placeholder="meu-campeonato"
                    />
                  </div>
                  {previewUrl && (
                    <div className="mt-4 space-y-4">
                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">LINK DA BIO:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-background px-2 py-1.5 rounded flex-1 break-all border border-input">
                            {previewUrl}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(previewUrl);
                              toast.success("Link da Bio copiado!");
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            asChild
                          >
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">LINK DE INSCRIÇÃO:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-background px-2 py-1.5 rounded flex-1 break-all border border-input">
                            {previewUrl.replace('/links/', '/inscricao/')}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(previewUrl.replace('/links/', '/inscricao/'));
                              toast.success("Link de Inscrição copiado!");
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            asChild
                          >
                            <a href={previewUrl.replace('/links/', '/inscricao/')} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="theme_color">Cor do Tema</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="theme_color"
                      type="color"
                      value={formData.theme_color}
                      onChange={(e) =>
                        setFormData({ ...formData, theme_color: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.theme_color}
                      onChange={(e) =>
                        setFormData({ ...formData, theme_color: e.target.value })
                      }
                      placeholder="#ED1B24"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Banner */}
            <Card>
              <CardHeader>
                <CardTitle>Banner</CardTitle>
                <CardDescription>
                  Adicione uma imagem de banner no topo da página (proporção sugerida 3:1, ex: 1200x400px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkPage?.banner_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={linkPage.banner_url}
                      alt={formData.banner_alt}
                      className="w-full h-auto"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="banner">Upload de Banner</Label>
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploading}
                    className="mt-2"
                  />
                  {uploading && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="banner_alt">Texto Alternativo (Alt)</Label>
                  <Input
                    id="banner_alt"
                    value={formData.banner_alt}
                    onChange={(e) =>
                      setFormData({ ...formData, banner_alt: e.target.value })
                    }
                    placeholder="Descrição da imagem"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Buttons */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Botões</CardTitle>
                    <CardDescription>
                      Adicione e organize os botões da sua página
                    </CardDescription>
                  </div>
                  <Button onClick={addButton} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {buttons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum botão adicionado. Clique em "Adicionar" para começar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {buttons.map((button, index) => {
                      const currentButtonType = button.button_type || "external";
                      return (
                        <Card key={button.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-start gap-3">
                              <div className="flex flex-row sm:flex-col gap-1 pt-2">
                                <button
                                  onClick={() => moveButton(index, "up")}
                                  disabled={index === 0}
                                  className="disabled:opacity-30 p-1"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveButton(index, "down")}
                                  disabled={index === buttons.length - 1}
                                  className="disabled:opacity-30 p-1"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex-1 space-y-3 w-full">
                                <div>
                                  <Label>Rótulo do Botão</Label>
                                  <Input
                                    value={button.label || ""}
                                    onChange={(e) =>
                                      updateButton(button.id, "label", e.target.value)
                                    }
                                    placeholder="Ex: Leaderboard"
                                  />
                                </div>
                                <div>
                                  <Label>Tipo de Botão</Label>
                                  <Select
                                    value={currentButtonType}
                                    onValueChange={(value) => {
                                      setButtons(prevButtons =>
                                        prevButtons.map((b) =>
                                          b.id === button.id
                                            ? { ...b, button_type: value, icon: value }
                                            : b
                                        )
                                      );
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {buttonTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Tipo atual: {currentButtonType}
                                  </p>
                                </div>
                                {currentButtonType === "external" && (
                                  <div>
                                    <Label>URL</Label>
                                    <Input
                                      value={button.url || ""}
                                      onChange={(e) =>
                                        updateButton(button.id, "url", e.target.value)
                                      }
                                      placeholder="https://exemplo.com"
                                    />
                                  </div>
                                )}
                                {currentButtonType !== "external" && currentButtonType !== "wods" && (
                                  <div className="text-sm text-muted-foreground">
                                    Este botão será vinculado automaticamente ao seu campeonato.
                                  </div>
                                )}
                                {currentButtonType === "wods" && (
                                  <div className="text-sm text-muted-foreground">
                                    Este botão abre a página pública de WODs do campeonato.
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeButton(button.id)}
                                className="text-destructive hover:text-destructive shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1" size="lg">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Mobile Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h3 className="text-lg font-bold mb-4">Prévia</h3>
              <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10"></div>
                <div className="h-[14px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
                <div className="h-[26px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                <div className="h-[26px] w-[3px] bg-gray-800 absolute -start-[17px] top-[164px] rounded-s-lg"></div>
                <div className="h-[40px] w-[3px] bg-gray-800 absolute -end-[17px] top-[110px] rounded-e-lg"></div>
                <div className="rounded-[2rem] overflow-hidden w-full h-full bg-background relative flex flex-col font-sans">
                  {/* HEADER - MATCHING PublicHeader.tsx */}
                  <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0f172a] text-white shrink-0">
                    <div className="px-4 h-16 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src="/logohorizontal.webp"
                          alt="AntCamp"
                          className="h-6 w-auto"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerText = 'AntCamp';
                            e.currentTarget.parentElement!.className = "text-xl font-bold text-primary tracking-tighter"
                          }}
                        />
                      </div>
                      <button className="text-white">
                        <Menu className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* MAIN CONTENT AREA - MATCHING LinkPage.tsx */}
                  <div className="flex-1 overflow-y-auto bg-background">
                    <div className="w-full h-full px-4 py-8 flex flex-col gap-6">

                      {/* 1. Banner/Logo Area */}
                      <div className="rounded-xl overflow-hidden relative flex items-center justify-center bg-muted shrink-0 w-full min-h-[80px]">
                        {linkPage?.banner_url ? (
                          <img
                            src={linkPage.banner_url}
                            alt="Banner Preview"
                            className="w-full h-auto block"
                          />
                        ) : (
                          <div className="text-center p-2 aspect-video flex items-center justify-center w-full">
                            <div className="text-muted-foreground text-[10px] uppercase">
                              Sem Banner
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Info Card - MATCHING LinkPage.tsx */}
                      {championshipInfo && (
                        <Card className="border-0 bg-card shadow-lg shrink-0">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[10px] font-medium">Data</span>
                              </div>
                              <span className="font-medium text-foreground text-[10px]">
                                {championshipInfo.date ? new Date(championshipInfo.date).toLocaleDateString('pt-BR') : 'Data não definida'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-border pb-2">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                <span className="text-[10px] font-medium">Local</span>
                              </div>
                              <span className="font-medium text-foreground text-right max-w-[60%] truncate uppercase text-[10px]">
                                {championshipInfo.location || 'Local não definido'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span className="text-[10px] font-medium">Organizador</span>
                              </div>
                              <span className="font-medium text-foreground text-[10px]">
                                {championshipInfo.organizer || 'Organizador'}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* 3. Buttons - MATCHING LinkPage.tsx */}
                      <div className="space-y-4 shrink-0">
                        {buttons.length === 0 ? (
                          <p className="text-xs text-center text-muted-foreground mt-4">Adicione botões para visualizar</p>
                        ) : (
                          buttons.map((btn, idx) => (
                            <div
                              key={idx}
                              className="w-full h-12 flex items-center justify-between px-4 text-sm font-semibold border-none shadow-md rounded cursor-default transition-opacity hover:opacity-90"
                              style={{
                                backgroundColor: formData.theme_color || undefined,
                                color: formData.theme_color ? '#ffffff' : undefined,
                                boxShadow: formData.theme_color ? `0 4px 6px -1px ${formData.theme_color}40` : undefined
                              }}
                            >
                              <span className="truncate w-full text-center">{btn.label || "Sem rótulo"}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer Mockup */}
                      <div className="pb-8 pt-2 text-center shrink-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">Desenvolvido por AntCamp</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Prévia aproximada do layout móvel
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

