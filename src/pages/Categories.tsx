import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, Copy, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { ensureScaleTrios } from '@/utils/ensureScaleTrios';
import { ensureRandomResults } from '@/utils/ensureRandomResults';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente SortableItem para cada categoria
function SortableCategoryItem({ category, registrations, onEdit, onDuplicate, onDelete }: {
  category: any;
  registrations: any[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  // Contar inscrições desta categoria
  const categoryRegs = registrations.filter(r => r.category_id === category.id);
  const teamsCount = categoryRegs.filter(r => r.team_name).length;
  const individualsCount = categoryRegs.filter(r => !r.team_name).length;
  
  // Formatar texto de contagem
  const getCountText = () => {
    if (category.format === 'individual') {
      return individualsCount > 0 ? `${individualsCount} atleta(s)` : '0 atletas';
    } else {
      const formatNames: { [key: string]: string } = {
        'dupla': 'dupla(s)',
        'trio': 'trio(s)',
        'time': 'time(s)',
      };
      const formatName = formatNames[category.format] || 'time(s)';
      return teamsCount > 0 ? `${teamsCount} ${formatName}` : `0 ${formatName}`;
    }
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Arrastar para reorganizar"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold">{category.name}</h3>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {category.format}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                {category.gender}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span>Capacidade: {category.capacity === 999999 ? 'Ilimitada' : `${category.capacity} atletas`}</span>
            {category.team_size && <span>• Tamanho do time: {category.team_size} pessoas</span>}
            <span className="font-semibold text-foreground">• {getCountText()} cadastrado(s)</span>
            {category.gender_composition && <span>• {category.gender_composition}</span>}
            {category.price_cents > 0 && (
              <span className="font-semibold text-foreground">
                • R$ {(category.price_cents / 100).toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            title="Editar categoria"
            className="h-8 w-8"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDuplicate}
            title="Duplicar categoria"
            className="h-8 w-8"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            title="Excluir categoria"
            className="h-8 w-8"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [heats, setHeats] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadChampionshipAndCategories();
    }
  }, [selectedChampionship]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadChampionshipAndCategories = async () => {
    try {
      if (!selectedChampionship) {
        toast.error("Selecione um campeonato primeiro");
        navigate("/app");
        return;
      }

      const [scaleResult, randomResult] = await Promise.all([
        ensureScaleTrios(selectedChampionship.id),
        ensureRandomResults(selectedChampionship.id),
      ]);

      // Development helpers removed - no need to show to end users

      // Load categories ordered by order_index
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_index", { ascending: true });

      if (catsError) throw catsError;
      
      // Load registrations com nomes
      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select("id, category_id, team_name, athlete_name")
        .eq("championship_id", selectedChampionship.id)
        .eq("status", "approved");

      if (regsError) throw regsError;
      setRegistrations(regs || []);
      
      // Se não tiver order_index, inicializar com base no índice
      const categoriesWithOrder = (cats || []).map((cat, index) => ({
        ...cat,
        order_index: cat.order_index ?? index,
      }));
      
      setCategories(categoriesWithOrder);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      // Silenciar erro - não mostrar toast ao usuário
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const capacityValue = formData.get('capacity') as string;
      const capacity = capacityValue && capacityValue.trim() !== '' 
        ? parseInt(capacityValue) 
        : 999999; // 999999 representa capacidade ilimitada

      // Converter preço de reais para centavos
      const priceValue = formData.get('price') as string;
      const price_cents = priceValue && priceValue.trim() !== '' 
        ? Math.round(parseFloat(priceValue.replace(',', '.')) * 100)
        : 0;

      // Obter athletes_per_heat
      const athletesPerHeatValue = formData.get('athletesPerHeat') as string;
      const athletes_per_heat = athletesPerHeatValue && athletesPerHeatValue.trim() !== '' 
        ? parseInt(athletesPerHeatValue)
        : 10; // Valor padrão

      // Determinar order_index: se for nova categoria, adiciona no final
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order_index ?? 0))
        : -1;

      if (!selectedChampionship) {
        toast.error("Selecione um campeonato primeiro");
        setSaving(false);
        return;
      }

      const categoryData = {
        championship_id: selectedChampionship.id,
        name: formData.get('name') as string,
        format: formData.get('format') as string,
        gender: formData.get('gender') as string,
        capacity: capacity,
        team_size: formData.get('teamSize') ? parseInt(formData.get('teamSize') as string) : null,
        gender_composition: formData.get('genderComposition') as string || null,
        rules: formData.get('rules') as string || null,
        price_cents: price_cents,
        athletes_per_heat: athletes_per_heat,
        order_index: editingCategory ? editingCategory.order_index : maxOrder + 1,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(categoryData)
          .select()
          .single();

        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      await loadChampionshipAndCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (category: any) => {
    try {
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order_index ?? 0))
        : -1;

      const categoryData = {
        championship_id: selectedChampionship.id,
        name: `${category.name} (Cópia)`,
        format: category.format,
        gender: category.gender,
        capacity: category.capacity,
        team_size: category.team_size,
        gender_composition: category.gender_composition,
        rules: category.rules,
        price_cents: category.price_cents,
        athletes_per_heat: category.athletes_per_heat || 10,
        order_index: maxOrder + 1,
      };

      const { error } = await supabase
        .from("categories")
        .insert(categoryData)
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Categoria duplicada com sucesso!");
      await loadChampionshipAndCategories();
    } catch (error: any) {
      console.error("Error duplicating category:", error);
      toast.error("Erro ao duplicar categoria");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Categoria removida com sucesso!");
      await loadChampionshipAndCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao remover categoria");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Atualizar ordem localmente
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Atualizar order_index no banco de dados
    setUpdatingOrder(true);
    try {
      const updates = newCategories.map((cat, index) => ({
        id: cat.id,
        order_index: index,
      }));

      // Atualizar todas as categorias de uma vez
      for (const update of updates) {
        const { error } = await supabase
          .from("categories")
          .update({ order_index: update.order_index })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success("Ordem das categorias atualizada!");
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar ordem das categorias");
      // Reverter em caso de erro
      await loadChampionshipAndCategories();
    } finally {
      setUpdatingOrder(false);
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
          <h1 className="text-4xl font-bold mb-2">Categorias</h1>
          <p className="text-muted-foreground">Gerencie as categorias do campeonato</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)} className="shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar' : 'Criar'} Categoria</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Categoria *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    defaultValue={editingCategory?.name}
                    placeholder="Ex: RX Individual Masculino" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="format">Formato *</Label>
                  <Select name="format" defaultValue={editingCategory?.format || 'individual'} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="dupla">Dupla</SelectItem>
                      <SelectItem value="trio">Trio</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">Gênero *</Label>
                  <Select name="gender" defaultValue={editingCategory?.gender || 'masculino'} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="misto">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="capacity">Capacidade</Label>
                  <Input 
                    id="capacity" 
                    name="capacity" 
                    type="number" 
                    defaultValue={editingCategory?.capacity && editingCategory.capacity !== 999999 ? editingCategory.capacity : ''}
                    placeholder="Deixe vazio para ilimitada" 
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para capacidade ilimitada
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamSize">Tamanho do Time (se aplicável)</Label>
                  <Input 
                    id="teamSize" 
                    name="teamSize" 
                    type="number"
                    defaultValue={editingCategory?.team_size}
                    placeholder="4"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="genderComposition">Composição de Gênero (misto)</Label>
                  <Input 
                    id="genderComposition" 
                    name="genderComposition"
                    defaultValue={editingCategory?.gender_composition}
                    placeholder="Ex: 2M/2F"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="athletesPerHeat">Atletas/Times por Bateria</Label>
                <Input 
                  id="athletesPerHeat" 
                  name="athletesPerHeat" 
                  type="number" 
                  defaultValue={editingCategory?.athletes_per_heat || 10}
                  placeholder="10" 
                  min="1"
                  max="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número padrão de atletas/times por bateria para esta categoria. Este valor será usado automaticamente ao gerar baterias.
                </p>
              </div>

              <div>
                <Label htmlFor="price">Preço por Categoria (R$)</Label>
                <Input 
                  id="price" 
                  name="price" 
                  type="text"
                  inputMode="decimal"
                  defaultValue={editingCategory?.price_cents ? (editingCategory.price_cents / 100).toFixed(2).replace('.', ',') : ''}
                  placeholder="300,00"
                  pattern="[0-9]+([,\.][0-9]{1,2})?"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preço total da inscrição para esta categoria (não por atleta). Ex: Trio = R$ 300,00, Dupla = R$ 200,00, Individual = R$ 100,00
                </p>
              </div>

              <div>
                <Label htmlFor="rules">Regras e Observações</Label>
                <Textarea 
                  id="rules" 
                  name="rules"
                  defaultValue={editingCategory?.rules}
                  placeholder="Regras específicas da categoria..."
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
                    editingCategory ? 'Atualizar' : 'Criar'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhuma categoria criada ainda.</p>
          <p className="text-sm text-muted-foreground mt-2">Clique em "Nova Categoria" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            Arraste as categorias para reorganizar a ordem no leaderboard
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((cat) => cat.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {categories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    registrations={registrations}
                    onEdit={() => {
                      setEditingCategory(category);
                      setIsDialogOpen(true);
                    }}
                    onDuplicate={() => handleDuplicate(category)}
                    onDelete={() => handleDelete(category.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {updatingOrder && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Atualizando ordem...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
