import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Clock, Dumbbell, Loader2, CopyPlus, GripVertical, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { cn } from "@/lib/utils";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type CategoryVariationForm = {
  displayName: string;
  description: string;
  notes: string;
  estimatedDuration: string;
};

// Componente SortableWODItem para drag and drop
function SortableWODItem({ wod, onEdit, onDelete, onTogglePublish, categoryId, variations }: { wod: any; onEdit: () => void; onDelete: () => void; onTogglePublish: () => void; categoryId?: string; variations?: Record<string, CategoryVariationForm> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Converter tipo do banco para exibição
  const getTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'tempo': 'For Time',
      'amrap': 'AMRAP',
      'emom': 'EMOM',
      'reps': 'Max Reps',
      'carga': 'Carga Máxima',
    };
    return typeMap[type] || type;
  };

  // Logic to override display if category is selected and variation exists
  let displayName = wod.name;
  let displayDescription = wod.description;
  let displayNotes = wod.notes;
  let displayDuration = wod.estimated_duration_minutes;

  // Override data if variation exists
  if (categoryId && variations && variations[wod.id]) {
    const v = variations[wod.id];
    // Only override if value exists and is not empty
    // @ts-ignore
    if (v.display_name) displayName = v.display_name;
    // @ts-ignore
    if (v.description) displayDescription = v.description;
    // @ts-ignore
    if (v.notes) displayNotes = v.notes;
    // @ts-ignore
    if (v.estimated_duration_minutes) displayDuration = v.estimated_duration_minutes;
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all shadow-sm">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
          title="Arrastar para reorganizar"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Dumbbell className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-base sm:text-lg truncate">{displayName}</h3>
            <div className={`w-2 h-2 rounded-full shrink-0 ${wod.is_published ? 'bg-green-600' : 'bg-yellow-500'}`} title={wod.is_published ? "Publicado" : "Rascunho"}></div>
            <Badge variant="outline" className="text-[10px] sm:text-xs ml-1">
              {getTypeDisplay(wod.type)}
            </Badge>
          </div>

        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onTogglePublish}
            className={cn(
              "h-8 px-3 transition-colors",
              wod.is_published
                ? "text-green-600 border-green-600 hover:bg-transparent hover:text-green-600 hover:border-green-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={wod.is_published ? "Despublicar" : "Publicar"}
          >
            <Globe className="w-4 h-4 mr-2" />
            {wod.is_published ? "Publicado" : "Publicar"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="h-8 px-3 text-muted-foreground hover:text-foreground"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            title="Excluir"
            className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WODs() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wods, setWODs] = useState<any[]>([]);
  const [filteredWods, setFilteredWods] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [variationsMap, setVariationsMap] = useState<Record<string, any>>({}); // Map wodId -> variationData

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWOD, setEditingWOD] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryVariations, setCategoryVariations] = useState<Record<string, CategoryVariationForm>>({});
  const [variationCategoriesWithData, setVariationCategoriesWithData] = useState<string[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [applyToAllCategories, setApplyToAllCategories] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isMissingVariationTable = (error: any) => {
    if (!error) return false;
    return error.code === '42P01' || (typeof error.message === 'string' && error.message.includes('wod_category_variations'));
  };

  const emptyVariation = (): CategoryVariationForm => ({
    displayName: '',
    description: '',
    notes: '',
    estimatedDuration: '',
  });

  const createEmptyVariations = () => {
    const result: Record<string, CategoryVariationForm> = {};
    categories.forEach(cat => {
      result[cat.id] = emptyVariation();
    });
    return result;
  };

  const updateVariationField = (categoryId: string, field: keyof CategoryVariationForm, value: string) => {
    setCategoryVariations(prev => {
      const currentVariation = prev[categoryId] || emptyVariation();
      return {
        ...prev,
        [categoryId]: {
          ...currentVariation,
          [field]: value, // Sempre usar o valor exato que foi digitado
        },
      };
    });

    // Marcar categoria como tendo dados personalizados
    if (!variationCategoriesWithData.includes(categoryId)) {
      setVariationCategoriesWithData(prev => [...prev, categoryId]);
    }
  };

  const hasVariationData = (variation?: CategoryVariationForm) => {
    if (!variation) return false;
    return Boolean(
      variation.displayName.trim() ||
      variation.description.trim() ||
      variation.notes.trim() ||
      variation.estimatedDuration.trim()
    );
  };

  const resetCategoryVariation = (categoryId: string) => {
    setCategoryVariations(prev => ({
      ...prev,
      [categoryId]: emptyVariation(),
    }));
  };

  // Mapear tipos do banco para tipos do frontend
  // Banco usa: 'tempo', 'reps', 'carga', 'amrap', 'emom'
  const mapDatabaseTypeToFrontend = (databaseType: string): string => {
    const typeMap: Record<string, string> = {
      'tempo': 'for-time',
      'amrap': 'amrap',
      'emom': 'emom',
      'reps': 'max-reps',
      'carga': 'carga-maxima',
    };
    return typeMap[databaseType] || 'for-time'; // Default para 'for-time' se não encontrar
  };

  // Mapear tipos do frontend para tipos do banco de dados
  // Banco aceita: 'tempo', 'reps', 'carga', 'amrap', 'emom'
  const mapWodTypeToDatabase = (frontendType: string): string => {
    if (!frontendType) return 'tempo';

    const typeMap: Record<string, string> = {
      'for-time': 'tempo',
      'amrap': 'amrap',
      'emom': 'emom', // EMOM agora é um tipo próprio no banco
      'tonelagem': 'carga', // Tonelagem é carga
      'carga-maxima': 'carga', // Carga máxima é carga
      'max-reps': 'reps',
      'max-weight': 'carga',
      'tempo': 'tempo',
      'reps': 'reps',
      'carga': 'carga',
    };

    const mapped = typeMap[frontendType.toLowerCase()] || 'tempo';
    console.log(`Mapeando "${frontendType}" para "${mapped}"`);
    return mapped;
  };

  const handleOpenCreate = () => {
    // Open dialog to select category first
    setIsDialogOpen(true);
    setEditingWOD(null); // Ensure we are in create mode
  };

  const handleCategorySelect = (categoryId: string) => {
    setIsDialogOpen(false);
    navigate(`/wods/new?categoryId=${categoryId}`);
  };

  // ... (inside return)

  // Logic continues...


  const handleWodDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = wods.findIndex((w) => w.id === active.id);
    const newIndex = wods.findIndex((w) => w.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newWods = arrayMove(wods, oldIndex, newIndex);
    setWODs(newWods);

    // Atualizar order_num no banco de dados
    try {
      const updates = newWods.map((wod, index) => ({
        id: wod.id,
        order_num: index + 1,
      }));

      // Atualizar todos os WODs em batch
      for (const update of updates) {
        const { error } = await supabase
          .from("wods")
          .update({ order_num: update.order_num })
          .eq("id", update.id);

        if (error) {
          console.error(`Erro ao atualizar order_num do WOD ${update.id}:`, error);
        }
      }

      toast.success("Ordem dos WODs atualizada!");
    } catch (error: any) {
      console.error("Erro ao atualizar ordem dos WODs:", error);
      toast.error("Erro ao salvar nova ordem dos WODs");
      // Reverter para ordem original em caso de erro
      await loadWODs();
    }
  };

  const handleOpenEdit = async (wod: any) => {
    if (selectedCategoryFilter && selectedCategoryFilter !== 'all') {
      navigate(`/wods/${wod.id}/edit?categoryId=${selectedCategoryFilter}`);
    } else {
      navigate(`/wods/${wod.id}/edit`);
    }
  };

  useEffect(() => {
    if (categories.length === 0) {
      setCategoryVariations({});
      setVariationCategoriesWithData([]);
      return;
    }

    setCategoryVariations(prev => {
      const updated: Record<string, CategoryVariationForm> = {};
      categories.forEach(cat => {
        updated[cat.id] = prev[cat.id] || emptyVariation();
      });
      return updated;
    });

    setVariationCategoriesWithData(prev =>
      prev.filter(categoryId => categories.some(cat => cat.id === categoryId))
    );
  }, [categories]);

  useEffect(() => {
    checkAuth();
    if (selectedChampionship) {
      loadCategories();
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
      console.log("Loading Events (WODs) for championship:", selectedChampionship.id, selectedChampionship.name);

      // Load WODs
      const { data: wodsData, error: wodsError } = await supabase
        .from("wods")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_num", { ascending: true });

      if (wodsError) throw wodsError;

      console.log("Events loaded:", wodsData);
      setWODs(wodsData || []);
      setFilteredWods(wodsData || []);
    } catch (error: any) {
      console.error("Error loading events:", error);
      // Silenciar erro - não mostrar toast ao usuário
    } finally {
      setLoading(false);
    }
  };

  // Effect to filter WODs
  useEffect(() => {
    let result = wods;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(w =>
        w.name.toLowerCase().includes(term) ||
        (w.type && w.type.toLowerCase().includes(term))
      );
    }

    setFilteredWods(result);
  }, [wods, searchTerm, selectedCategoryFilter]);

  // Load variations when category filter changes
  useEffect(() => {
    const loadCategoryVariationsForList = async () => {
      if (selectedCategoryFilter === 'all' || !selectedCategoryFilter) {
        setVariationsMap({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from("wod_category_variations")
          .select("*")
          .eq("category_id", selectedCategoryFilter)
          .in("wod_id", wods.map(w => w.id));

        if (error) {
          if (!error.message.includes('wod_category_variations')) {
            console.error("Error loading variations for filter:", error);
          }
          return;
        }

        const map: Record<string, any> = {};
        if (data) {
          data.forEach((v: any) => {
            map[v.wod_id] = v;
          });
        }
        setVariationsMap(map);
      } catch (err) {
        console.error("Error fetching variations:", err);
      }
    };

    if (wods.length > 0) {
      loadCategoryVariationsForList();
    }
  }, [selectedCategoryFilter, wods]);

  const loadCategories = async () => {
    if (!selectedChampionship) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("championship_id", selectedChampionship.id)
        .order("order_index", { ascending: true, nullsFirst: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      // Silenciar erro - não mostrar toast ao usuário
    }
  };

  const loadWodVariations = async (wodId: string, wodData?: any) => {
    setVariationsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wod_category_variations")
        .select("*")
        .eq("wod_id", wodId);

      if (error) {
        if (error.code === '42P01' || (error.message ?? '').includes('wod_category_variations')) {
          console.warn('Tabela wod_category_variations não encontrada; variações serão ignoradas.');
          setCategoryVariations(createEmptyVariations());
          setVariationCategoriesWithData([]);
        } else {
          throw error;
        }
      } else {
        const base = createEmptyVariations();
        const categoriesWithData: string[] = [];

        // Usar wodData passado como parâmetro ou editingWOD do estado
        const baseWod = wodData || editingWOD;

        (data || []).forEach((variation: any) => {
          if (!base[variation.category_id]) {
            base[variation.category_id] = emptyVariation();
          }

          // Carregar valores reais do banco
          // IMPORTANTE: Se há uma variação salva no banco, sempre carregar valores reais
          // Se description/notes são null, usar valores padrão do WOD para garantir texto editável
          let descriptionValue = '';
          let notesValue = '';

          // Se há uma variação salva no banco para esta categoria, sempre carregar valores reais
          // Prioridade: valor do banco > valor padrão do WOD > string vazia
          if (variation.description !== null && variation.description !== undefined) {
            // Valor real salvo no banco - usar diretamente
            descriptionValue = variation.description;
          } else {
            // Se null mas há variação salva, usar valor padrão do WOD (garantir texto editável)
            descriptionValue = baseWod?.description || '';
          }

          if (variation.notes !== null && variation.notes !== undefined) {
            // Valor real salvo no banco - usar diretamente
            notesValue = variation.notes;
          } else {
            // Se null mas há variação salva, usar valor padrão do WOD (garantir texto editável)
            notesValue = baseWod?.notes || '';
          }

          // IMPORTANTE: Sempre garantir que description e notes sejam strings (não null)
          // Isso permite que o Textarea mostre o valor como texto editável, não placeholder
          base[variation.category_id] = {
            displayName: variation.display_name || '',
            description: descriptionValue, // Sempre string (não null) para poder editar
            notes: notesValue, // Sempre string (não null) para poder editar
            estimatedDuration:
              variation.estimated_duration_minutes !== null && variation.estimated_duration_minutes !== undefined
                ? String(variation.estimated_duration_minutes)
                : (baseWod?.estimated_duration_minutes ? String(baseWod.estimated_duration_minutes) : ''),
          };

          categoriesWithData.push(variation.category_id);
        });

        // Se todas as categorias têm variações salvas, provavelmente applyToAllCategories estava ativo
        // Mas não vamos assumir isso automaticamente - deixar o usuário decidir
        // O importante é que os valores sejam carregados como strings reais

        setCategoryVariations(base);
        setVariationCategoriesWithData(categoriesWithData);
      }
    } catch (error: any) {
      console.error("Error loading WOD variations:", error);
      toast.error("Erro ao carregar variações por categoria");
    } finally {
      setVariationsLoading(false);
    }
  };

  const [wodType, setWodType] = useState<string>('for-time');

  useEffect(() => {
    if (editingWOD) {
      // Converter tipo do banco para tipo do frontend
      const frontendType = mapDatabaseTypeToFrontend(editingWOD.type || 'tempo');
      setWodType(frontendType);
    } else {
      setWodType('for-time');
    }
  }, [editingWOD]);

  const handleSubmit = async (publish: boolean = false) => {
    if (!formRef.current) {
      toast.error("Formulário não encontrado");
      return;
    }

    setSaving(true);

    try {
      const form = formRef.current;
      const formData = new FormData(form);
      const applyAll = applyToAllCategories;

      // Get max order_num to add new WOD at the end
      const maxOrder = wods.length > 0
        ? Math.max(...wods.map(w => w.order_num || 0))
        : 0;

      // Mapear o tipo do frontend para o tipo do banco
      // Banco aceita: 'tempo', 'reps', 'carga', 'amrap', 'emom'
      const databaseType = mapWodTypeToDatabase(wodType || 'for-time');

      // Validação extra: garantir que o tipo está na lista permitida
      const validTypes = ['tempo', 'reps', 'carga', 'amrap', 'emom'];
      if (!validTypes.includes(databaseType)) {
        console.error('Tipo inválido após mapeamento:', databaseType, 'Tipo original:', wodType);
        throw new Error(`Tipo de WOD inválido: ${databaseType}. Tipos permitidos: ${validTypes.join(', ')}`);
      }

      console.log('Tipo do frontend:', wodType);
      console.log('Tipo mapeado para banco:', databaseType);

      const timeCap = formData.get('timeCap') as string;

      // Calcular duração estimada baseada no time_cap
      let estimatedDuration = 15; // Padrão
      if (timeCap && timeCap.includes(':')) {
        const [minutes, seconds] = timeCap.split(':').map(Number);
        estimatedDuration = minutes + Math.ceil(seconds / 60) + 2; // time_cap + 2min de transição
      }

      // Validações antes de prosseguir
      const wodName = formData.get('name') as string;
      const wodDescription = formData.get('description') as string;

      if (!wodName || wodName.trim() === '') {
        toast.error("Nome do WOD é obrigatório");
        setSaving(false);
        return;
      }

      if (!wodDescription || wodDescription.trim() === '') {
        toast.error("Descrição do WOD é obrigatória");
        setSaving(false);
        return;
      }

      if (!timeCap || timeCap.trim() === '') {
        toast.error("Time Cap é obrigatório");
        setSaving(false);
        return;
      }

      if (!selectedChampionship || !selectedChampionship.id) {
        toast.error("Campeonato não selecionado");
        setSaving(false);
        return;
      }

      // Garantir que estimatedDuration seja válido (baseEstimatedDuration para variações)
      const baseEstimatedDuration = estimatedDuration > 0 ? estimatedDuration : 15;

      const wodData = {
        championship_id: selectedChampionship.id,
        name: formData.get('name') as string,
        type: databaseType,
        description: formData.get('description') as string,
        time_cap: timeCap?.trim() || null,
        tiebreaker: null, // Removed
        notes: formData.get('notes') as string || null,
        estimated_duration_minutes: estimatedDuration,
        order_num: editingWOD ? editingWOD.order_num : maxOrder + 1,
        // @ts-ignore
        is_published: publish, // Definir se está publicado ou não
      };

      let wodId = editingWOD?.id ?? null;

      if (editingWOD) {
        const { error } = await supabase
          .from("wods")
          .update(wodData)
          .eq("id", editingWOD.id);

        if (error) throw error;
        wodId = editingWOD.id;
        // Atualizar o estado local com o novo valor de is_published
        // @ts-ignore
        const updatedWOD = { ...editingWOD, ...wodData, id: editingWOD.id, is_published: publish };
        setWODs(prev =>
          prev.map(w =>
            w.id === editingWOD.id
              ? updatedWOD
              : w
          )
        );
        // Se estiver publicando ou despublicando, atualizar o status
        if (publish) {
          const { error: publishError } = await supabase
            .from("wods")
            // @ts-ignore
            .update({ is_published: true })
            .eq("id", editingWOD.id);

          if (publishError) throw publishError;
          toast.success("WOD atualizado e publicado com sucesso!");
        } else {
          // Garantir que WODs salvos sem publicar tenham is_published = false
          const { error: unpublishError } = await supabase
            .from("wods")
            // @ts-ignore
            .update({ is_published: false })
            .eq("id", editingWOD.id);

          if (unpublishError) throw unpublishError;
          toast.success("WOD atualizado com sucesso! (Não publicado ainda)");
        }
      } else {
        const { data: newWod, error } = await supabase
          .from("wods")
          .insert(wodData)
          .select()
          .single();

        if (error) throw error;
        wodId = newWod?.id ?? null;
        if (newWod) {
          setWODs(prev => {
            const next = [...prev, newWod];
            return next.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
          });
        }
        if (publish) {
          toast.success("WOD criado e publicado com sucesso!");
        } else {
          toast.success("WOD criado com sucesso! (Não publicado ainda)");
        }
      }

      // Validar se temos categories antes de processar variações
      if (!categories || categories.length === 0) {
        console.warn("Nenhuma categoria encontrada, pulando variações");
        setIsDialogOpen(false);
        setEditingWOD(null);
        setWodType('for-time');
        setCategoryVariations(createEmptyVariations());
        setVariationCategoriesWithData([]);
        setApplyToAllCategories(false);
        await loadWODs();
        setSaving(false);
        return;
      }

      if (wodId) {
        const variationsToUpsert = categories
          .map(cat => {
            const variation = categoryVariations[cat.id];
            const hasData = hasVariationData(variation);

            // Se applyAll está ativo, criar variação para todas as categorias (mesmo sem dados personalizados)
            // Se applyAll está desativado, só criar se houver dados personalizados
            if (!hasData && !applyAll) return null;

            // Calcular duração estimada para esta variação
            let parsedVariationDuration = NaN;
            if (variation?.estimatedDuration?.trim()) {
              const parsed = parseInt(variation.estimatedDuration.trim(), 10);
              if (!isNaN(parsed) && parsed > 0) {
                parsedVariationDuration = parsed;
              }
            }

            // Usar duração da variação se válida, senão usar a base
            const estimatedDurationMinutes = Number.isFinite(parsedVariationDuration) && parsedVariationDuration > 0
              ? parsedVariationDuration
              : baseEstimatedDuration;

            // Quando applyAll está ativo, usar os valores da variação (que foram copiados do padrão)
            // Os valores em categoryVariations já foram copiados como strings reais quando o botão foi clicado
            const form = formRef.current;
            const formData = form ? new FormData(form) : null;
            const baseDescription = formData?.get('description') as string || '';
            const baseNotes = formData?.get('notes') as string || '';

            // Obter valores da variação (que foram copiados quando applyAll foi ativado)
            let finalDescription = '';
            let finalNotes = '';

            if (applyAll) {
              // Quando applyAll está ativo, SEMPRE usar os valores que foram copiados para categoryVariations
              // Se os valores em categoryVariations estão vazios, usar os valores padrão do formulário
              // Isso garante que sempre há valores reais para salvar
              finalDescription = variation?.description || baseDescription;
              finalNotes = variation?.notes || baseNotes;

              // Garantir que sejam sempre strings não-vazias quando applyAll está ativo
              if (!finalDescription || finalDescription.trim() === '') {
                finalDescription = baseDescription;
              }
              if (!finalNotes || finalNotes.trim() === '') {
                finalNotes = baseNotes;
              }
            } else {
              // Quando applyAll não está ativo, só salvar se houver dados personalizados
              finalDescription = variation?.description?.trim() || '';
              finalNotes = variation?.notes?.trim() || '';
            }

            // Quando applyAll está ativo, SEMPRE salvar valores reais (não null, não vazio)
            // Isso permite que sejam editáveis ao recarregar
            return {
              wod_id: wodId,
              category_id: cat.id,
              display_name: variation?.displayName?.trim() || null,
              description: applyAll ? (finalDescription || null) : (finalDescription || null),
              notes: applyAll ? (finalNotes || null) : (finalNotes || null),
              estimated_duration_minutes: estimatedDurationMinutes > 0
                ? estimatedDurationMinutes
                : (baseEstimatedDuration > 0 ? baseEstimatedDuration : null),
            };
          })
          .filter(Boolean);

        if (variationsToUpsert.length > 0) {
          try {
            const { error: variationError } = await supabase
              .from("wod_category_variations")
              .upsert(variationsToUpsert as any[], { onConflict: "wod_id,category_id" });

            if (variationError) {
              // Se a tabela não existe, apenas logar e continuar
              if (isMissingVariationTable(variationError)) {
                console.warn('Tabela wod_category_variations ausente durante upsert; prosseguindo sem variações específicas.');
              } else {
                // Para outros erros, logar detalhes e lançar
                console.error("Erro ao salvar variações:", variationError);
                throw variationError;
              }
            }
          } catch (variationError: any) {
            // Se for erro de tabela ausente, apenas logar
            if (isMissingVariationTable(variationError)) {
              console.warn('Tabela wod_category_variations ausente durante remoção; prosseguindo sem variações específicas.');
            } else {
              // Para outros erros, lançar para ser capturado pelo catch externo
              throw variationError;
            }
          }
        }

        const existingSet = new Set(variationCategoriesWithData);
        const categoriesToDelete = Array.from(existingSet).filter(categoryId => {
          const variation = categoryVariations[categoryId];
          if (applyAll) return false;
          return !hasVariationData(variation);
        });

        if (categoriesToDelete.length > 0) {
          const { error: deleteVariationsError } = await supabase
            .from("wod_category_variations")
            .delete()
            .eq("wod_id", wodId)
            .in("category_id", categoriesToDelete);

          if (deleteVariationsError && !isMissingVariationTable(deleteVariationsError)) {
            throw deleteVariationsError;
          }

          if (deleteVariationsError && isMissingVariationTable(deleteVariationsError)) {
            console.warn('Tabela wod_category_variations ausente durante remoção; prosseguindo sem variações específicas.');
          }
        }
      }

      setIsDialogOpen(false);
      setEditingWOD(null);
      setWodType('for-time');
      setCategoryVariations(createEmptyVariations());
      setVariationCategoriesWithData([]);
      setApplyToAllCategories(false);
      await loadWODs();
    } catch (error: any) {
      console.error("Error saving WOD:", error);
      const errorMessage = error?.message || error?.details || "Erro desconhecido";
      console.error("Detalhes do erro:", {
        message: errorMessage,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });

      // Mensagem de erro mais amigável
      let userMessage = "Erro ao salvar WOD";
      if (errorMessage.includes("is not defined")) {
        userMessage = "Erro interno: variável não definida. Por favor, recarregue a página e tente novamente.";
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        userMessage = "Dados inválidos. Verifique se todos os campos obrigatórios foram preenchidos.";
      } else if (errorMessage.includes("permission") || errorMessage.includes("policy")) {
        userMessage = "Você não tem permissão para realizar esta ação.";
      } else if (errorMessage.includes("duplicate") || errorMessage.includes("unique")) {
        userMessage = "Já existe um WOD com este nome ou dados duplicados.";
      } else {
        userMessage = `Erro ao salvar WOD: ${errorMessage}`;
      }

      toast.error(userMessage);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (wod: any) => {
    try {
      const newStatus = !wod.is_published;
      const { error } = await supabase
        .from("wods")
        .update({ is_published: newStatus })
        .eq("id", wod.id);

      if (error) throw error;

      // Update local state
      setWODs(wods.map(w => w.id === wod.id ? { ...w, is_published: newStatus } : w));

      toast.success(newStatus ? "WOD publicado com sucesso!" : "WOD despublicado com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar status de publicação:", error);
      toast.error("Erro ao alterar status de publicação");
    }
  };

  const handleDelete = async (wodId: string) => {
    if (!confirm("Tem certeza que deseja excluir este WOD?")) return;

    try {
      const { error } = await supabase.from("wods").delete().eq("id", wodId);
      if (error) throw error;

      toast.success("WOD removido com sucesso!");
      await loadWODs();
    } catch (error: any) {
      console.error("Error deleting WOD:", error);
      toast.error("Erro ao remover WOD");
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
    <div className="w-full mx-auto px-4 py-8 max-w-[98%]">
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Eventos</h1>
          <p className="text-muted-foreground">
            Gerencie os eventos do campeonato - <span className="font-semibold text-primary">{selectedChampionship.name}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-foreground"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
          </div>
          <div className="w-full sm:w-[250px]">
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Categoria *</Label>
            <Select onValueChange={handleCategorySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>


      {
        filteredWods.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {wods.length === 0
                ? "Nenhum Evento ainda."
                : "Nenhum evento encontrado para o filtro selecionado."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {wods.length === 0
                ? "Clique no botão flutuante no canto inferior direito para criar um novo Evento"
                : "Tente selecionar outra categoria."}
            </p>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWodDragEnd}
          >
            <SortableContext
              items={filteredWods.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredWods.map((wod) => (
                  <SortableWODItem
                    key={wod.id}
                    wod={wod}
                    categoryId={selectedCategoryFilter !== 'all' ? selectedCategoryFilter : undefined}
                    variations={variationsMap}
                    onEdit={() => handleOpenEdit(wod)}
                    onDelete={() => handleDelete(wod.id)}
                    onTogglePublish={() => togglePublish(wod)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      }

      {/* Floating Action Button */}
      <button
        onClick={handleOpenCreate}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D71C1D] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50 animation-fade-in"
        aria-label="Criar novo Evento"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div >
  );
}
