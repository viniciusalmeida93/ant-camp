import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, Copy, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
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
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 999 : 1,
    scale: isDragging ? '1.02' : '1',
    boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.2)' : 'none',
  };

  // Calculate display price (lowest batch price if batches exist, else standard price)
  const displayPrice = category.has_batches && category.batches?.length > 0
    ? Math.min(...category.batches.map((b: any) => b.price_cents))
    : category.price_cents;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all overflow-hidden">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Arrastar para reorganizar"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h3 className="font-semibold text-base sm:text-lg truncate">{category.name}</h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {category.format}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {category.gender}
                </span>
                {category.has_batches && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    Lotes
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full sm:w-auto mt-1 sm:mt-0">
          <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
            <span className="whitespace-nowrap">Capacidade: {category.capacity === 999999 ? 'Ilimitada' : `${category.capacity}`}</span>
            <span className="font-semibold text-foreground whitespace-nowrap">{getCountText()}</span>
            <span className="whitespace-nowrap">
              {category.min_age && category.max_age ? `${category.min_age}-${category.max_age} anos` :
                category.min_age ? `+${category.min_age} anos` :
                  category.max_age ? `-${category.max_age} anos` : 'Idade Livre'}
            </span>
            {displayPrice > 0 && (
              <span className="font-semibold text-foreground whitespace-nowrap">
                {category.has_batches ? 'A partir ' : ''} R$ {(displayPrice / 100).toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="flex-1 sm:flex-initial h-8 px-2"
          >
            <Edit className="w-4 h-4 mr-1.5" />
            <span className="sm:hidden lg:inline text-xs">Editar</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDuplicate}
            title="Duplicar"
            className="h-8 w-8"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            title="Excluir"
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
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
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);

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

      // Load categories ordered by order_index
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_index", { ascending: true });

      if (catsError) throw catsError;

      // Load registrations
      const { data: regs, error: regsError } = await supabase
        .from("registrations")
        .select("id, category_id, team_name, athlete_name")
        .eq("championship_id", selectedChampionship.id)
        .eq("status", "approved");

      if (regsError) throw regsError;
      setRegistrations(regs || []);

      const categoriesWithOrder = (cats || []).map((cat, index) => ({
        ...cat,
        order_index: cat.order_index ?? index,
      }));

      setCategories(categoriesWithOrder);
    } catch (error: any) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
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
        has_batches: category.has_batches,
        batches: category.batches
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
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedChampionship) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
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
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Categorias</h1>
          <p className="text-muted-foreground">Gerencie as categorias do campeonato</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhuma categoria criada ainda.</p>
          <p className="text-sm text-muted-foreground mt-2">Clique no botão flutuante no canto inferior direito para criar uma nova categoria.</p>
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
                    onEdit={() => navigate(`/categories/${category.id}/edit`)}
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

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/categories/new')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D71C1D] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50"
        aria-label="Criar nova categoria"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
