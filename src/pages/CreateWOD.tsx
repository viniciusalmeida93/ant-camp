import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CopyPlus, Globe, FileText, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type CategoryVariationForm = {
  displayName: string;
  description: string;
  notes: string;
  estimatedDuration: string;
  timeCap: string;
};

export default function CreateWOD() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('categoryId');
  const { selectedChampionship } = useChampionship();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingWOD, setEditingWOD] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);

  // State for the "Active" category we are editing
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryIdParam);

  // Form State
  const [wodType, setWodType] = useState<string>('for-time');
  const [applyToAllCategories, setApplyToAllCategories] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // We still keep a map of variations to know if other categories have specific data
  // But for the UI, we mostly care about the SELECTED category's data
  const [categoryVariations, setCategoryVariations] = useState<Record<string, CategoryVariationForm>>({});

  /* -------------------------------------------------------------------------- */
  /*                                STATE & LOADERS                             */
  /* -------------------------------------------------------------------------- */
  const [allWods, setAllWods] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato primeiro");
      navigate("/app");
      return;
    }
    const init = async () => {
      setLoading(true);
      await Promise.all([loadCategories(), loadAllWods()]);
      if (id) {
        await loadWOD();
      } else {
        setEditingWOD(null); // Ensure we clear editing state for New WOD
        const defaultVars: Record<string, CategoryVariationForm> = {};
        // We need to reset variations too, based on current categories
        // But loadCategories already does that?
        // Wait, loadCategories is called in Promise.all.
        // It sets categoryVariations. So we are good on variations.
        setLoading(false);
      }
    };
    init();
  }, [selectedChampionship, id]);

  const loadAllWods = async () => {
    if (!selectedChampionship) return;
    const { data } = await supabase
      .from("wods")
      .select("id, name")
      .eq("championship_id", selectedChampionship.id)
      .order("order_num", { ascending: true });
    setAllWods(data || []);
  };

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

      // Auto-select first category if none selected
      if (!selectedCategoryId && data && data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }

      // Init empty variations
      const emptyVariations: Record<string, CategoryVariationForm> = {};
      (data || []).forEach(cat => {
        emptyVariations[cat.id] = {
          displayName: '',
          description: '',
          notes: '',
          estimatedDuration: '',
          timeCap: '',
        };
      });
      setCategoryVariations(emptyVariations);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      toast.error("Erro ao carregar categorias");
    }
  };

  const loadWOD = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("wods")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setEditingWOD(data);
        const frontendType = mapDatabaseTypeToFrontend(data.type);
        setWodType(frontendType);

        // Load variations
        const { data: variations, error: varError } = await supabase
          .from("wod_category_variations")
          .select("*")
          .eq("wod_id", id);

        if (!varError && variations) {
          const loadedVariations: Record<string, CategoryVariationForm> = {};
          variations.forEach((v: any) => {
            loadedVariations[v.category_id] = {
              displayName: v.display_name || '',
              description: v.description || '',
              notes: v.notes || '',
              estimatedDuration: v.estimated_duration_minutes ? String(v.estimated_duration_minutes) : '',
              timeCap: v.time_cap || '',
            };
          });
          setCategoryVariations(prev => ({ ...prev, ...loadedVariations }));
        }
      }
    } catch (error: any) {
      console.error("Error loading WOD:", error);
      toast.error("Erro ao carregar WOD");
      navigate('/wods');
    } finally {
      setLoading(false);
    }
  };

  const mapDatabaseTypeToFrontend = (databaseType: string): string => {
    const typeMap: Record<string, string> = {
      'tempo': 'for-time',
      'amrap': 'amrap',
      'emom': 'emom',
      'reps': 'max-reps',
      'carga': 'carga-maxima',
    };
    return typeMap[databaseType] || 'for-time';
  };

  const mapWodTypeToDatabase = (frontendType: string): string => {
    const typeMap: Record<string, string> = {
      'for-time': 'tempo',
      'amrap': 'amrap',
      'emom': 'emom',
      'tonelagem': 'carga',
      'carga-maxima': 'carga',
      'max-reps': 'reps',
      'max-weight': 'carga',
      'tempo': 'tempo',
      'reps': 'reps',
      'carga': 'carga',
    };
    return typeMap[frontendType.toLowerCase()] || 'tempo';
  };

  // Helper to get current form values (Global WOD fallback + Variation Override)
  const getCurrentValues = () => {
    if (!selectedCategoryId) return {
      name: editingWOD?.name || '',
      description: editingWOD?.description || '',
      notes: editingWOD?.notes || '',
      timeCap: editingWOD?.time_cap || '',
      displayName: ''
    };

    const variation = categoryVariations[selectedCategoryId];
    const global = editingWOD;

    return {
      name: global?.name || '', // Name is always global for now, or could vary? Usually global.
      description: variation?.description || global?.description || '',
      notes: variation?.notes || global?.notes || '',
      // Time cap stored in 'estimatedDuration' for variation is actually minutes, but we use time_cap string for UI
      // If variation has duration, we might want to convert or just stick to global timeCap for simplicity unless explicit
      // For this refactor, let's assume Time Cap matches global unless we want to complicate it. 
      // The user asked for "Create WOD for category". 
      // Let's use Global Time Cap primarily. If they want split time caps, it's advanced.
      // But wait, variation HAS estimated_duration_minutes.
      timeCap: variation?.timeCap || global?.time_cap || '',
      displayName: variation?.displayName || ''
    };
  };



  // If no category selected (and creating new), show selection screen
  // But we now auto-select the first one, so this screen might only show if there are NO categories at all.
  if (!id && !selectedCategoryId && !loading) {
    if (categories.length === 0) {
      return (
        <div className="w-full mx-auto px-6 py-6 max-w-[98%] text-center">
          <p>Nenhuma categoria encontrada.</p>
          <Button onClick={() => navigate('/categories')} className="mt-4" variant="outline">Criar Categorias</Button>
        </div>
      )
    }

    // Since we auto-select, we shouldn't really hit this block unless something failed or categories loaded late.
    // We can keep it as a fallback or just let the auto-select handle it.
    // If we are here, it means categories exist but selectedCategoryId is null.
    // We can fix this by forcing selection even here if needed, but the useEffect should handle it.
    // Let's keep existing logic but it might just be skipped.
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/wods')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mb-2">Criar Novo Evento</h1>
          <p className="text-muted-foreground">Selecione a categoria para começar a criar o WOD.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">{cat.format} - {cat.gender}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleSubmit = async (publish: boolean = false, navigateBack: boolean = false) => {
    if (!formRef.current || !selectedCategoryId) return;
    setSaving(true);

    try {
      const formData = new FormData(formRef.current);
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const notes = formData.get('notes') as string;
      const timeCap = formData.get('timeCap') as string;
      const displayName = formData.get('displayName') as string; // Specific to variation

      // 1. Prepare Global WOD Data
      // If applying to all, these values become the global default.
      // If NOT applying to all, these values STILL become the global default if it's a NEW WOD.
      // If editing and NOT applying to all, we strictly should only update the variation?
      // But the user said "We remove the general part". 
      // So effectively, what you type HERE becomes      // Calcular duração estimada baseada no time_cap
      let estimatedDuration = 15; // Padrão
      if (timeCap) {
        if (timeCap.includes(':')) {
          const [minutes, seconds] = timeCap.split(':').map(Number);
          estimatedDuration = minutes + Math.ceil(seconds / 60); // time_cap exato
        } else {
          // Se for apenas número (ex: "10"), considerar como minutos
          const minutes = parseInt(timeCap, 10);
          if (!isNaN(minutes)) {
            estimatedDuration = minutes; // time_cap exato
          }
        }
      } const databaseType = mapWodTypeToDatabase(wodType);

      const globalWodData = {
        championship_id: selectedChampionship!.id,
        name: name,
        type: databaseType,
        description: description,
        time_cap: timeCap,
        notes: notes,
        estimated_duration_minutes: estimatedDuration,
        is_published: publish
      };

      // 2. Perform Insert/Update of Global WOD
      let targetWodId = id;

      if (targetWodId) {
        // Update
        // If we are NOT applying to all, and we are editing, we should NOT overwrite the Global WOD description/notes
        // because that would change the fallback for other categories.
        // We only update structural things like Name and Type (unless we want those to be variable too? User said "alterar detalhe" -> likely loads/desc).

        let updateData: any = { ...globalWodData };
        if (!applyToAllCategories) {
          // Remove content fields from global update to prevent affecting others
          delete updateData.description;
          delete updateData.notes;
          delete updateData.time_cap;
          delete updateData.estimated_duration_minutes;
        }

        const { error } = await supabase
          .from("wods")
          .update(updateData)
          .eq("id", targetWodId);
        if (error) throw error;
      } else {
        // Create
        // Get max order
        const { data: existing } = await supabase.from("wods").select("order_num").eq("championship_id", selectedChampionship!.id);
        const maxOrder = existing?.length ? Math.max(...existing.map(e => e.order_num || 0)) : 0;

        const { data: newWod, error } = await supabase
          .from("wods")
          .insert({ ...globalWodData, order_num: maxOrder + 1 })
          .select()
          .single();

        if (error) throw error;
        targetWodId = newWod.id;

        // If we created a new WOD without redirecting, update URL
        if (!navigateBack) {
          const currentCat = selectedCategoryId;
          navigate(`/wods/${targetWodId}?categoryId=${currentCat}`, { replace: true });
          setEditingWOD(newWod); // Update editingWOD state to reflect the new ID
        }
      }

      // 3. Handle Variations
      const variationsToUpsert = [];

      if (applyToAllCategories) {
        // Apply to ALL categories
        for (const cat of categories) {
          variationsToUpsert.push({
            wod_id: targetWodId,
            category_id: cat.id,
            description: description,
            notes: notes,
            estimated_duration_minutes: estimatedDuration,
            time_cap: timeCap,
            display_name: null
          });
        }
      } else {
        // Save ONLY for selected Category
        variationsToUpsert.push({
          wod_id: targetWodId,
          category_id: selectedCategoryId,
          description: description,
          notes: notes,
          estimated_duration_minutes: estimatedDuration,
          time_cap: timeCap,
          display_name: displayName || null
        });
      }

      if (variationsToUpsert.length > 0) {
        const { error: varError } = await supabase
          .from("wod_category_variations")
          .upsert(variationsToUpsert, { onConflict: 'wod_id,category_id' });

        if (varError && !varError.message.includes('wod_category_variations')) {
          console.error("Error saving variations", varError);
        } else {
          // --- FIX: Update Local State immediately so tab switching works ---
          setCategoryVariations(prev => {
            const next = { ...prev };

            console.log('🔍 DEBUG - Salvando variação:', {
              applyToAllCategories,
              selectedCategoryId,
              timeCap,
              description: description.substring(0, 30) + '...',
              prevState: prev
            });

            if (applyToAllCategories) {
              // Update ALL categories in local state
              categories.forEach(cat => {
                next[cat.id] = {
                  displayName: '',
                  description: description,
                  notes: notes,
                  estimatedDuration: String(estimatedDuration),
                  timeCap: timeCap
                };
              });
            } else {
              // Update ONLY selected category
              next[selectedCategoryId] = {
                displayName: displayName || '',
                description: description,
                notes: notes,
                estimatedDuration: String(estimatedDuration),
                timeCap: timeCap
              };
            }

            console.log('✅ DEBUG - Estado atualizado:', next);
            return next;
          });
        }
      }


      // --- FIX: Ensure editingWOD is updated with latest global values ---
      // BUT only update content fields if applyToAllCategories is true
      setEditingWOD((prev: any) => {
        let updateData = { ...globalWodData, id: targetWodId };

        if (!applyToAllCategories) {
          // Don't update content fields in global state to prevent affecting other categories
          updateData = {
            ...prev,
            championship_id: globalWodData.championship_id,
            name: globalWodData.name,
            type: globalWodData.type,
            is_published: globalWodData.is_published,
            id: targetWodId
          };
        }

        return updateData;
      });

      if (publish) {
        toast.success("WOD salvo e publicado com sucesso!");
      } else {
        toast.success("WOD salvo com sucesso!");
      }

      if (navigateBack) {
        navigate('/wods');
      }

    } catch (error: any) {
      console.error("Error saving WOD", error);
      toast.error("Erro ao salvar WOD");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/wods')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Eventos
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold">{editingWOD ? 'Editar Evento' : 'Criar Evento'}</h1>
          {selectedCategory && (
            <span className="text-xl text-muted-foreground font-normal">
              — {selectedCategory.name}
            </span>
          )}
        </div>
      </div>

      <Card className="p-6 mb-8 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Filter */}
          <div>
            <Label className="mb-2 block font-semibold">Evento (WOD)</Label>
            <Select
              value={id || "new"}
              onValueChange={(value) => {
                const currentCat = selectedCategoryId || '';
                navigate(`/wods/${value}/edit?categoryId=${currentCat}`);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento" />
              </SelectTrigger>
              <SelectContent>
                {allWods.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <Label className="mb-2 block font-semibold">Categoria em edição</Label>
            <Select
              value={selectedCategoryId || ''}
              onValueChange={(value) => setSelectedCategoryId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
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
        </div>
      </Card>

      {(() => {
        const currentValues = getCurrentValues();

        return (
          <form
            key={selectedCategoryId}
            ref={formRef}
            onSubmit={(e) => e.preventDefault()}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nome do WOD *</Label>
                <Input id="name" name="name" defaultValue={currentValues.name} required />
              </div>
              <div>
                <Label htmlFor="type">Tipo de WOD *</Label>
                <Select value={wodType} onValueChange={setWodType} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for-time">For Time</SelectItem>
                    <SelectItem value="amrap">AMRAP</SelectItem>
                    <SelectItem value="emom">EMOM</SelectItem>
                    <SelectItem value="tonelagem">Tonelagem</SelectItem>
                    <SelectItem value="carga-maxima">Carga Máxima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="timeCap">Time Cap *</Label>
              <Input
                id="timeCap"
                name="timeCap"
                type="time"
                defaultValue={currentValues.timeCap}
                placeholder="Ex: 12:00"
                required
                className="time-input-red-icon"
              />
              <p className="text-xs text-muted-foreground mt-1">MM:SS</p>
            </div>

            <div>
              <Label htmlFor="description">Descrição do WOD *</Label>
              <Textarea id="description" name="description" defaultValue={currentValues.description} rows={5} required placeholder="Descreva o WOD aqui..." />
            </div>

            <div>
              <Label htmlFor="notes">Notas e Padrões</Label>
              <Textarea id="notes" name="notes" defaultValue={currentValues.notes} rows={3} placeholder="Observações, padrões de movimento, etc." />
            </div>

            {/* Helper visual para campo específico da categoria se quiser */}
            <div>
              <Label htmlFor="displayName">Nome Personalizado (Opcional)</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={currentValues.displayName}
                placeholder={`Ex: ${currentValues.name} (Scale)`}
              />
              <p className="text-xs text-muted-foreground">Nome específico para exibir nesta categoria.</p>
            </div>

            <div className="flex items-center space-x-2 py-4 border-t border-b bg-muted/20 p-4 rounded-md">
              <Checkbox
                id="applyAll"
                checked={applyToAllCategories}
                onCheckedChange={(c) => setApplyToAllCategories(Boolean(c))}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="applyAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Aplicar este WOD para todas as categorias
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se marcado, a descrição e notas serão copiadas para todas as outras categorias.
                </p>
              </div>
            </div>

            <div className="flex gap-4 w-full pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleSubmit(false, false)}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Rascunho"
                )}
              </Button>

              <Button
                type="button"
                className="flex-1 bg-[#D71C1D] hover:bg-[#d11f2d] text-white"
                onClick={() => handleSubmit(true, true)}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar e Publicar"
                )}
              </Button>
            </div>
          </form>
        );
      })()}

      {/* Floating Action Button for New Event */}
      <button
        onClick={() => {
          const currentCat = selectedCategoryId || '';
          navigate(`/wods/new?categoryId=${currentCat}`);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#D71C1D] text-white flex items-center justify-center shadow-lg hover:bg-[#d11f2d] transition-colors z-50"
        title="Criar Novo Evento"
      >
        <Plus className="w-6 h-6" />
      </button>

    </div>
  );
}

