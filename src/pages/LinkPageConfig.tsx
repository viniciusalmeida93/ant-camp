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
} from "lucide-react";

const buttonTypes = [
  { value: "external", label: "Link Externo", icon: ExternalLink },
  { value: "leaderboard", label: "Leaderboard", icon: Award },
  { value: "registration", label: "Inscrições", icon: Users },
  { value: "heats", label: "Baterias", icon: Calendar },
  { value: "rules", label: "Regras", icon: FileText },
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
    title: "Meus Links",
    slug: "",
    banner_alt: "",
    theme_color: "#ED1B24",
  });

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
          title: page.title || "Meus Links",
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
        setButtons(normalizedButtons);
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
        title: formData.title,
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
        .filter((b) => b.label && (b.url || b.button_type !== "external"))
        .map((b, index) => ({
          link_page_id: pageId,
          label: b.label,
          url: b.url || "",
          icon: b.icon || b.button_type,
          button_type: b.button_type,
          order_index: index,
          is_active: b.is_active,
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
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Configurar Página de Links
          </h1>
          <p className="text-muted-foreground">
            Configure sua página de links para compartilhar no Instagram
          </p>
        </div>

        <div className="space-y-6">
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
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Meus Links"
                />
              </div>
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
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Sua URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-background px-2 py-1 rounded flex-1 break-all">
                        {previewUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(previewUrl);
                          toast.success("URL copiada!");
                        }}
                      >
                        Copiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use esta URL na bio do seu Instagram! 
                      <br />
                      <span className="font-semibold">Domínio de produção:</span> antsports.com.br/links/{formData.slug}
                    </p>
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
                Adicione uma imagem de banner no topo da página (recomendado: 1200x400px)
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
                                    console.log("Select onValueChange called:", value, "for button:", button.id);
                                    console.log("Button before update:", button);
                                    // Atualizar ambos os campos em uma única operação
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
                              {currentButtonType !== "external" && (
                                <div className="text-sm text-muted-foreground">
                                  Este botão será vinculado automaticamente ao seu campeonato.
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
            <Button onClick={handleSave} disabled={saving} className="flex-1">
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
      </div>
    </div>
  );
}

