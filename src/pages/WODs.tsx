import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Clock, Dumbbell, Loader2, CopyPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type CategoryVariationForm = {
  displayName: string;
  description: string;
  notes: string;
  estimatedDuration: string;
};

export default function WODs() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wods, setWODs] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWOD, setEditingWOD] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryVariations, setCategoryVariations] = useState<Record<string, CategoryVariationForm>>({});
  const [variationCategoriesWithData, setVariationCategoriesWithData] = useState<string[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [applyToAllCategories, setApplyToAllCategories] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

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
    setCategoryVariations(prev => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || emptyVariation()),
        [field]: value,
      },
    }));
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
  // Banco usa: 'tempo', 'reps', 'carga', 'amrap'
  const mapDatabaseTypeToFrontend = (databaseType: string): string => {
    const typeMap: Record<string, string> = {
      'tempo': 'for-time',
      'amrap': 'amrap',
      'reps': 'max-reps',
      'carga': 'carga-maxima',
    };
    return typeMap[databaseType] || 'for-time'; // Default para 'for-time' se não encontrar
  };

  // Mapear tipos do frontend para tipos do banco de dados
  // Banco aceita: 'tempo', 'reps', 'carga', 'amrap'
  const mapWodTypeToDatabase = (frontendType: string): string => {
    if (!frontendType) return 'tempo';
    
    const typeMap: Record<string, string> = {
      'for-time': 'tempo',
      'amrap': 'amrap',
      'emom': 'tempo', // EMOM também é tempo
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
    setEditingWOD(null);
    setWodType('for-time');
    setCategoryVariations(createEmptyVariations());
    setVariationCategoriesWithData([]);
    setApplyToAllCategories(false);
  };

  const handleOpenEdit = async (wod: any) => {
    setEditingWOD(wod);
    // Converter tipo do banco para tipo do frontend
    const frontendType = mapDatabaseTypeToFrontend(wod.type || 'tempo');
    setWodType(frontendType);
    setIsDialogOpen(true);
    setCategoryVariations(createEmptyVariations());
    setVariationCategoriesWithData([]);
    setApplyToAllCategories(false);
    await loadWodVariations(wod.id);
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
      // Silenciar erro - não mostrar toast ao usuário
    } finally {
      setLoading(false);
    }
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
    } catch (error: any) {
      console.error("Error loading categories:", error);
      // Silenciar erro - não mostrar toast ao usuário
    }
  };

  const loadWodVariations = async (wodId: string) => {
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

        (data || []).forEach((variation: any) => {
          if (!base[variation.category_id]) {
            base[variation.category_id] = emptyVariation();
          }

          base[variation.category_id] = {
            displayName: variation.display_name || '',
            description: variation.description || '',
            notes: variation.notes || '',
            estimatedDuration:
              variation.estimated_duration_minutes !== null && variation.estimated_duration_minutes !== undefined
                ? String(variation.estimated_duration_minutes)
                : '',
          };

          categoriesWithData.push(variation.category_id);
        });

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const baseEstimatedDurationValue = formData.get('estimatedDuration') as string;
      const parsedBaseDuration = baseEstimatedDurationValue ? parseInt(baseEstimatedDurationValue, 10) : NaN;
      const baseEstimatedDuration = Number.isFinite(parsedBaseDuration) && parsedBaseDuration > 0
        ? parsedBaseDuration
        : 15;
      const applyAll = applyToAllCategories;
      
      // Get max order_num to add new WOD at the end
      const maxOrder = wods.length > 0 
        ? Math.max(...wods.map(w => w.order_num || 0))
        : 0;

      // Mapear o tipo do frontend para o tipo do banco
      // Banco aceita apenas: 'tempo', 'reps', 'carga', 'amrap'
      const databaseType = mapWodTypeToDatabase(wodType || 'for-time');
      
      // Validação extra: garantir que o tipo está na lista permitida
      const validTypes = ['tempo', 'reps', 'carga', 'amrap'];
      if (!validTypes.includes(databaseType)) {
        console.error('Tipo inválido após mapeamento:', databaseType, 'Tipo original:', wodType);
        throw new Error(`Tipo de WOD inválido: ${databaseType}. Tipos permitidos: ${validTypes.join(', ')}`);
      }
      
      console.log('Tipo do frontend:', wodType);
      console.log('Tipo mapeado para banco:', databaseType);

      const wodData = {
        championship_id: selectedChampionship.id,
        name: formData.get('name') as string,
        type: databaseType,
        description: formData.get('description') as string,
        time_cap: null,
        tiebreaker: null, // Removed
        notes: formData.get('notes') as string || null,
        estimated_duration_minutes: baseEstimatedDuration,
        order_num: editingWOD ? editingWOD.order_num : maxOrder + 1,
      };

      let wodId = editingWOD?.id ?? null;

      if (editingWOD) {
        const { error } = await supabase
          .from("wods")
          .update(wodData)
          .eq("id", editingWOD.id);

        if (error) throw error;
        wodId = editingWOD.id;
        setWODs(prev =>
          prev.map(w =>
            w.id === editingWOD.id
              ? { ...w, ...wodData, id: editingWOD.id }
              : w
          )
        );
        toast.success("WOD atualizado com sucesso!");
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
        toast.success("WOD criado com sucesso!");
      }

      if (wodId) {
        const variationsToUpsert = categories
          .map(cat => {
            const variation = categoryVariations[cat.id];
            const hasData = hasVariationData(variation);
            
            // Se applyAll está ativo, criar variação para todas as categorias (mesmo sem dados personalizados)
            // Se applyAll está desativado, só criar se houver dados personalizados
            if (!hasData && !applyAll) return null;

            const parsedVariationDuration = variation?.estimatedDuration?.trim()
              ? parseInt(variation.estimatedDuration, 10)
              : NaN;
            const estimatedDurationMinutes = Number.isFinite(parsedVariationDuration) && parsedVariationDuration > 0
              ? parsedVariationDuration
              : baseEstimatedDuration;

            // Quando applyAll está ativo mas não há dados personalizados, usar valores padrão do WOD
            return {
              wod_id: wodId,
              category_id: cat.id,
              display_name: variation?.displayName?.trim() || null,
              description: variation?.description?.trim() || null,
              notes: variation?.notes?.trim() || null,
              estimated_duration_minutes: hasData && estimatedDurationMinutes > 0 
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
              console.warn('Tabela wod_category_variations ausente; prosseguindo sem variações específicas.');
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
        hint: error?.hint
      });
      toast.error(`Erro ao salvar WOD: ${errorMessage}`);
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
      await loadWODs();
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
            setCategoryVariations(createEmptyVariations());
            setVariationCategoriesWithData([]);
            setApplyToAllCategories(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              Novo WOD
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWOD ? 'Editar' : 'Criar'} WOD</DialogTitle>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
                    <SelectItem value="emom">EMOM</SelectItem>
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
                <Label htmlFor="estimatedDuration">Time Cap (minutos)</Label>
                <Input 
                  id="estimatedDuration" 
                  name="estimatedDuration"
                  type="number"
                  min="1"
                  defaultValue={editingWOD?.estimated_duration_minutes || 15}
                  placeholder="Ex: 15"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo previsto para finalizar a prova (usado no cálculo automático de horários)
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

              <div className="pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="font-semibold">Variações por Categoria</Label>
                  {variationsLoading && (
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Carregando variações
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant={applyToAllCategories ? 'default' : 'outline'}
                    className="ml-auto flex items-center gap-1"
                    onClick={() => {
                      if (!applyToAllCategories && formRef.current) {
                        const data = new FormData(formRef.current);
                        const estimatedDurationValue = (data.get('estimatedDuration') as string) || '';
                        setCategoryVariations(prev => {
                          const updated: Record<string, CategoryVariationForm> = {};
                          categories.forEach(cat => {
                            const current = prev[cat.id] || emptyVariation();
                            updated[cat.id] = {
                              ...current,
                              estimatedDuration: current.estimatedDuration || estimatedDurationValue,
                            };
                          });
                          return updated;
                        });
                      }
                      setApplyToAllCategories(prev => !prev);
                    }}
                  >
                    <CopyPlus className="w-3 h-3" />
                    {applyToAllCategories ? 'Aplicar em todas as categorias (ativado)' : 'Adicionar WOD a todas as categorias'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Personalize detalhes do WOD para cada categoria. Campos em branco usam as informações padrão acima.
                  {applyToAllCategories && (
                    <span className="block text-[11px] text-primary mt-1">
                      Este WOD será aplicado automaticamente a todas as categorias.
                    </span>
                  )}
                </p>

                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-4">
                    Cadastre categorias para configurar variações específicas.
                  </p>
                ) : (
                  <Accordion type="multiple" className="mt-4 space-y-2">
                    {categories.map(category => {
                      const variation = categoryVariations[category.id] || emptyVariation();
                      const hasCustomData = hasVariationData(variation);

                      return (
                        <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="py-3 text-left">
                            <div className="flex flex-col text-left">
                              <span className="font-medium">{category.name}</span>
                              {hasCustomData && (
                                <span className="text-xs text-muted-foreground">Variação personalizada aplicada</span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-2 space-y-4">
                            <div>
                              <Label className="text-sm">Nome exibido</Label>
                              <Input
                                value={variation.displayName}
                                onChange={(event) => updateVariationField(category.id, 'displayName', event.target.value)}
                                placeholder={`Nome opcional para ${category.name}`}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Descrição personalizada</Label>
                              <Textarea
                                value={variation.description}
                                onChange={(event) => updateVariationField(category.id, 'description', event.target.value)}
                                placeholder={editingWOD?.description || 'Descrição específica desta categoria'}
                                rows={4}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Time Cap (min)</Label>
                              <Input
                                type="number"
                                min="1"
                                value={variation.estimatedDuration}
                                onChange={(event) => updateVariationField(category.id, 'estimatedDuration', event.target.value)}
                                placeholder={(editingWOD?.estimated_duration_minutes || 15).toString()}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Notas específicas</Label>
                              <Textarea
                                value={variation.notes}
                                onChange={(event) => updateVariationField(category.id, 'notes', event.target.value)}
                                placeholder={editingWOD?.notes || 'Observações ou padrões específicos desta categoria'}
                                rows={3}
                              />
                            </div>
                            {hasCustomData && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => resetCategoryVariation(category.id)}
                                className="text-xs"
                              >
                                Limpar variação desta categoria
                              </Button>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
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
                       wod.type === 'emom' ? 'EMOM' :
                       wod.type === 'tonelagem' ? 'Tonelagem' :
                       wod.type === 'carga-maxima' ? 'Carga Máxima' :
                       wod.type}
                    </Badge>
                    {wod.estimated_duration_minutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Time Cap: {wod.estimated_duration_minutes} min
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
                    onClick={() => handleOpenEdit(wod)}
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
