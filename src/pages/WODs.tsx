import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Clock, Dumbbell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';

export default function WODs() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wods, setWODs] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWOD, setEditingWOD] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadWODs();
    }
  }, [selectedChampionship]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadWODs = async () => {
    try {
      if (!selectedChampionship) {
        toast.error("Selecione um campeonato primeiro");
        navigate("/app");
        return;
      }

      console.log("Loading WODs for championship:", selectedChampionship.id, selectedChampionship.name);

      // Load WODs
      const { data: wodsData, error: wodsError } = await supabase
        .from("wods")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_num", { ascending: true });

      if (wodsError) throw wodsError;
      
      console.log("WODs loaded:", wodsData);
      setWODs(wodsData || []);
    } catch (error: any) {
      console.error("Error loading WODs:", error);
      toast.error("Erro ao carregar WODs");
    } finally {
      setLoading(false);
    }
  };

  const [wodType, setWodType] = useState<string>('for-time');

  useEffect(() => {
    if (editingWOD) {
      setWodType(editingWOD.type || 'for-time');
    } else {
      setWodType('for-time');
    }
  }, [editingWOD]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      // Get max order_num to add new WOD at the end
      const maxOrder = wods.length > 0 
        ? Math.max(...wods.map(w => w.order_num || 0))
        : 0;

      const wodData = {
        championship_id: selectedChampionship.id,
        name: formData.get('name') as string,
        type: wodType || 'for-time',
        description: formData.get('description') as string,
        time_cap: formData.get('timeCap') as string || null,
        tiebreaker: null, // Removed
        notes: formData.get('notes') as string || null,
        estimated_duration_minutes: parseInt(formData.get('estimatedDuration') as string) || 15,
        order_num: editingWOD ? editingWOD.order_num : maxOrder + 1,
      };

      if (editingWOD) {
        const { error } = await supabase
          .from("wods")
          .update(wodData)
          .eq("id", editingWOD.id);

        if (error) throw error;
        toast.success("WOD atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("wods")
          .insert(wodData)
          .select()
          .single();

        if (error) throw error;
        toast.success("WOD criado com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingWOD(null);
      setWodType('for-time');
      await loadWODs();
    } catch (error: any) {
      console.error("Error saving WOD:", error);
      toast.error(error.message || "Erro ao salvar WOD");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este WOD?")) return;

    try {
      const { error } = await supabase
        .from("wods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("WOD removido com sucesso!");
      await loadChampionshipAndWODs();
    } catch (error: any) {
      console.error("Error deleting WOD:", error);
      toast.error("Erro ao remover WOD");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedChampionship) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">WODs</h1>
          <p className="text-muted-foreground">
            Gerencie os workouts do campeonato
            {selectedChampionship && (
              <span className="ml-2 text-primary font-semibold">
                - {selectedChampionship.name}
              </span>
            )}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingWOD(null);
            setWodType('for-time');
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingWOD(null);
              setWodType('for-time');
            }} className="shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Novo WOD
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWOD ? 'Editar' : 'Criar'} WOD</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do WOD *</Label>
                <Input 
                  id="name" 
                  name="name"
                  defaultValue={editingWOD?.name}
                  placeholder="Ex: Fran" 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de WOD *</Label>
                <Select 
                  value={wodType}
                  onValueChange={setWodType}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for-time">For Time</SelectItem>
                    <SelectItem value="amrap">AMRAP</SelectItem>
                    <SelectItem value="tonelagem">Tonelagem</SelectItem>
                    <SelectItem value="carga-maxima">Carga Máxima</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descrição do Workout *</Label>
                <Textarea 
                  id="description" 
                  name="description"
                  defaultValue={editingWOD?.description}
                  placeholder="21-15-9&#10;Thrusters (95/65 lb)&#10;Pull-ups"
                  rows={5}
                  required
                />
              </div>

              <div>
                <Label htmlFor="timeCap">Time Cap</Label>
                <Input 
                  id="timeCap" 
                  name="timeCap"
                  defaultValue={editingWOD?.time_cap}
                  placeholder="Ex: 12 minutos"
                />
              </div>

              <div>
                <Label htmlFor="estimatedDuration">Duração Estimada (minutos)</Label>
                <Input 
                  id="estimatedDuration" 
                  name="estimatedDuration"
                  type="number"
                  min="1"
                  defaultValue={editingWOD?.estimated_duration_minutes || 15}
                  placeholder="Ex: 15"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo estimado para completar todas as baterias desta prova (usado no cálculo automático de horários)
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notas e Padrões de Movimento</Label>
                <Textarea 
                  id="notes" 
                  name="notes"
                  defaultValue={editingWOD?.notes}
                  placeholder="Padrões de movimento, escalas, regras especiais..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingWOD ? 'Atualizar' : 'Criar'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {wods.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum WOD criado ainda para o campeonato "{selectedChampionship?.name}".</p>
          <p className="text-sm text-muted-foreground mt-2">Clique em "Novo WOD" para começar.</p>
          <p className="text-xs text-muted-foreground mt-4">
            Campeonato ID: {selectedChampionship?.id}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {wods.map((wod) => {
            return (
              <div
                key={wod.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{wod.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {wod.type === 'for-time' ? 'For Time' :
                       wod.type === 'amrap' ? 'AMRAP' :
                       wod.type === 'tonelagem' ? 'Tonelagem' :
                       wod.type === 'carga-maxima' ? 'Carga Máxima' :
                       wod.type}
                    </Badge>
                    {wod.time_cap && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {wod.time_cap}
                      </span>
                    )}
                  </div>
                  <div className="p-2 rounded bg-muted/50 mb-2">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{wod.description}</pre>
                  </div>
                  {wod.notes && (
                    <p className="text-xs text-muted-foreground">{wod.notes}</p>
                  )}
                </div>
                
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingWOD(wod);
                      setWodType(wod.type || 'for-time');
                      setIsDialogOpen(true);
                    }}
                    title="Editar WOD"
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(wod.id)}
                    title="Excluir WOD"
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
