import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useChampionship } from "@/contexts/ChampionshipContext";
import { getPixPayloadForDisplay, isEmvPixPayload } from "@/utils/pix";

export default function ChampionshipSettings() {
  const navigate = useNavigate();
  const { championshipId } = useParams<{ championshipId: string }>();
  const { championships, setSelectedChampionship, loadChampionships } = useChampionship();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [championship, setChampionship] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    location: "",
    date: "",
    registrationEndDate: "",
    description: "",
    address: "",
    city: "",
    state: "",
    regulation_url: "",
  });

  useEffect(() => {
    if (championshipId) {
      checkAuth();
      loadChampionship();
    }
  }, [championshipId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: champs, error } = await supabase
      .from("championships")
      .select("id")
      .eq("id", championshipId)
      .eq("organizer_id", session.user.id)
      .maybeSingle();

    if (error || !champs) {
      toast.error("Você não tem acesso a este campeonato");
      navigate("/dashboard");
    }
  };

  const loadChampionship = async () => {
    if (!championshipId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("championships")
        .select("id, name, slug, location, date, registration_end_date, is_published, description, city, state, address, regulation_url")
        .eq("id", championshipId)
        .single();

      if (error) throw error;

      setChampionship(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        location: data.location || "",
        date: data.date ? data.date.split("T")[0] : "",
        registrationEndDate: data.registration_end_date ? data.registration_end_date.split("T")[0] : "",
        description: data.description || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        regulation_url: data.regulation_url || "",
      });
      // Atualiza o contexto também
      if (championshipId) {
        setSelectedChampionship(data);
      }
    } catch (error: any) {
      console.error("Error loading championship:", error);
      toast.error("Erro ao carregar campeonato");
      setChampionship(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!championshipId) return;

    try {
      setSaving(true);

      const updateData: Record<string, any> = {
        name: formData.name,
        description: formData.description || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        regulation_url: formData.regulation_url || null,
      };

      // Construct location string
      let finalLocation = formData.location;
      if (formData.address || formData.city || formData.state) {
        finalLocation = `${formData.address}${formData.city ? ` - ${formData.city}` : ''}${formData.state ? `/${formData.state}` : ''}`;
      }

      if (finalLocation.trim()) {
        updateData.location = finalLocation.trim();
      }

      if (formData.date) {
        updateData.date = formData.date;
      }

      if (formData.registrationEndDate) {
        updateData.registration_end_date = formData.registrationEndDate;
      } else {
        updateData.registration_end_date = null;
      }

      const { error } = await supabase
        .from("championships")
        .update(updateData)
        .eq("id", championshipId);

      if (error) throw error;

      const updatedChampionship = {
        ...(championship || {}),
        ...updateData
      };
      setChampionship(updatedChampionship);
      if (championshipId) {
        setSelectedChampionship(updatedChampionship);
      }
      await loadChampionships();

      toast.success("Configurações atualizadas com sucesso!");
      await loadChampionship();
    } catch (error: any) {
      console.error("Error saving championship:", error);
      toast.error(
        error?.message
          ? `Não foi possível salvar as configurações: ${error.message}`
          : "Não foi possível salvar as configurações"
      );
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

  if (!championship) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Campeonato não encontrado</CardTitle>
            <CardDescription>Tente voltar ao dashboard e selecionar novamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="w-full mx-auto px-6 py-4 max-w-[98%]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold">Configurações do Campeonato</h1>
                <p className="text-sm text-muted-foreground">
                  Atualize informações gerais e dados de cobrança
                </p>
              </div>
              <Badge variant={championship.is_published ? "default" : "secondary"}>
                {championship.is_published ? "Publicado" : "Rascunho"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-6 py-6 max-w-[98%] space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>
              Configure data, local e encerramento de inscrições do campeonato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Campeonato *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data do Campeonato *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationEndDate">Data de Encerramento das Inscrições</Label>
                <Input
                  id="registrationEndDate"
                  type="date"
                  value={formData.registrationEndDate}
                  onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para não ter data limite de inscrição
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium">Endereço</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Número, Bairro"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF) *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Descreva o campeonato..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regulationUrl">Link do Regulamento (PDF)</Label>
              <Input
                id="regulationUrl"
                value={formData.regulation_url}
                onChange={(e) => setFormData({ ...formData, regulation_url: e.target.value })}
                placeholder="https://exemplo.com/regulamento.pdf"
              />
              <p className="text-xs text-muted-foreground">
                Se informado, um botão para baixar o PDF aparecerá na página pública do campeonato.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSave} disabled={saving} className="sm:w-auto">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Informações
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}

