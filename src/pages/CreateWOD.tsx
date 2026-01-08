import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CopyPlus, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

export default function CreateWOD() {
  const navigate = useNavigate();
  const { selectedChampionship } = useChampionship();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryVariations, setCategoryVariations] = useState<Record<string, CategoryVariationForm>>({});
  const [variationCategoriesWithData, setVariationCategoriesWithData] = useState<string[]>([]);
  const [applyToAllCategories, setApplyToAllCategories] = useState(false);
  const [wodType, setWodType] = useState<string>('for-time');
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!selectedChampionship) {
      toast.error("Selecione um campeonato primeiro");
      navigate("/app");
      return;
    }
    loadCategories();
  }, [selectedChampionship]);

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
      
      // Inicializar variações vazias
      const emptyVariations: Record<string, CategoryVariationForm> = {};
      (data || []).forEach(cat => {
        emptyVariations[cat.id] = {
          displayName: '',
          description: '',
          notes: '',
          estimatedDuration: '',
        };
      });
      setCategoryVariations(emptyVariations);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      toast.error("Erro ao carregar categorias");
    }
  };

  const emptyVariation = (): CategoryVariationForm => ({
    displayName: '',
    description: '',
    notes: '',
    estimatedDuration: '',
  });

  const updateVariationField = (categoryId: string, field: keyof CategoryVariationForm, value: string) => {
    setCategoryVariations(prev => {
      const currentVariation = prev[categoryId] || emptyVariation();
      return {
        ...prev,
        [categoryId]: {
          ...currentVariation,
          [field]: value,
        },
      };
    });

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

  const mapWodTypeToDatabase = (frontendType: string): string => {
    if (!frontendType) return 'tempo';
    
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
      
      // Get max order_num
      const { data: existingWods } = await supabase
        .from("wods")
        .select("order_num")
        .eq("championship_id", selectedChampionship!.id);
      
      const maxOrder = existingWods && existingWods.length > 0
        ? Math.max(...existingWods.map(w => w.order_num || 0))
        : 0;

      const databaseType = mapWodTypeToDatabase(wodType || 'for-time');
      
      const validTypes = ['tempo', 'reps', 'carga', 'amrap', 'emom'];
      if (!validTypes.includes(databaseType)) {
        throw new Error(`Tipo de WOD inválido: ${databaseType}`);
      }

      const timeCap = formData.get('timeCap') as string;
      
      let estimatedDuration = 15;
      if (timeCap && timeCap.includes(':')) {
        const [minutes, seconds] = timeCap.split(':').map(Number);
        estimatedDuration = minutes + Math.ceil(seconds / 60) + 2;
      }
      
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
      
      const baseEstimatedDuration = estimatedDuration > 0 ? estimatedDuration : 15;
      
      const wodData = {
        championship_id: selectedChampionship.id,
        name: formData.get('name') as string,
        type: databaseType,
        description: formData.get('description') as string,
        time_cap: timeCap?.trim() || null,
        tiebreaker: null,
        notes: formData.get('notes') as string || null,
        estimated_duration_minutes: estimatedDuration,
        order_num: maxOrder + 1,
        is_published: publish,
      };

      const { data: newWod, error } = await supabase
        .from("wods")
        .insert(wodData)
        .select()
        .single();

      if (error) throw error;

      if (publish) {
        toast.success("WOD criado e publicado com sucesso!");
      } else {
        toast.success("WOD criado com sucesso! (Não publicado ainda)");
      }

      // Processar variações por categoria
      if (newWod && categories.length > 0) {
        const variationsToInsert: any[] = [];

        for (const category of categories) {
          const variation = categoryVariations[category.id] || emptyVariation();
          const hasData = hasVariationData(variation);

          if (applyAll || hasData || variationCategoriesWithData.includes(category.id)) {
            const variationData: any = {
              wod_id: newWod.id,
              category_id: category.id,
              display_name: variation.displayName || null,
              description: variation.description || null,
              notes: variation.notes || null,
              estimated_duration_minutes: variation.estimatedDuration 
                ? parseInt(variation.estimatedDuration) 
                : baseEstimatedDuration,
            };

            variationsToInsert.push(variationData);
          }
        }

        if (variationsToInsert.length > 0) {
          const { error: variationsError } = await supabase
            .from("wod_category_variations")
            .insert(variationsToInsert);

          if (variationsError) {
            if (variationsError.code === '42P01' || (variationsError.message ?? '').includes('wod_category_variations')) {
              console.warn('Tabela wod_category_variations não encontrada; variações serão ignoradas.');
            } else {
              throw variationsError;
            }
          }
        }
      }

      // Redirecionar de volta para /wods
      navigate('/wods');
    } catch (error: any) {
      console.error("Error creating WOD:", error);
      toast.error(error.message || "Erro ao criar WOD");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedChampionship) {
    return (
      <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Selecione um campeonato primeiro</p>
          <Button onClick={() => navigate("/app")} className="mt-4">
            Voltar para Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/wods')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para WODs
        </Button>
        <h1 className="text-4xl font-bold mb-2">Criar Novo WOD</h1>
        <p className="text-muted-foreground">
          Preencha os dados do workout do campeonato
        </p>
      </div>

      <form ref={formRef} onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name">Nome do WOD *</Label>
            <Input 
              id="name" 
              name="name"
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
        </div>

        <div>
          <Label htmlFor="description">Descrição do Workout *</Label>
          <Textarea 
            id="description" 
            name="description"
            placeholder="21-15-9&#10;Thrusters (95/65 lb)&#10;Pull-ups"
            rows={5}
            required
          />
        </div>

        <div>
          <Label htmlFor="timeCap">Time Cap da Prova *</Label>
          <Input 
            id="timeCap" 
            name="timeCap"
            type="text"
            placeholder="Ex: 6:00 (6 minutos)"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Formato: MM:SS (minutos:segundos) - Exemplo: 10:00 = 10 minutos
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Notas e Padrões de Movimento</Label>
          <Textarea 
            id="notes" 
            name="notes"
            placeholder="Padrões de movimento, escalas, regras especiais..."
            rows={3}
          />
        </div>

        <div className="pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Label className="font-semibold">Variações por Categoria</Label>
            <Button
              type="button"
              size="sm"
              variant={applyToAllCategories ? 'default' : 'outline'}
              onClick={() => {
                if (!applyToAllCategories && formRef.current) {
                  const descriptionInput = formRef.current.querySelector('[name="description"]') as HTMLTextAreaElement;
                  const notesInput = formRef.current.querySelector('[name="notes"]') as HTMLTextAreaElement;
                  
                  const descriptionValue = descriptionInput?.value ?? '';
                  const notesValue = notesInput?.value ?? '';
                  
                  setCategoryVariations(prev => {
                    const updated: Record<string, CategoryVariationForm> = {};
                    categories.forEach(cat => {
                      const current = prev[cat.id] || emptyVariation();
                      updated[cat.id] = {
                        displayName: current.displayName || '',
                        description: descriptionValue,
                        notes: notesValue,
                        estimatedDuration: '',
                      };
                    });
                    return updated;
                  });
                  
                  const allCategoryIds = categories.map(cat => cat.id);
                  setVariationCategoriesWithData(prev => {
                    const combined = new Set([...prev, ...allCategoryIds]);
                    return Array.from(combined);
                  });
                }
                setApplyToAllCategories(prev => !prev);
              }}
            >
              <CopyPlus className="w-3 h-3 mr-2" />
              {applyToAllCategories ? 'Aplicar em todas as categorias (ativado)' : 'Adicionar WOD a todas as categorias'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Personalize detalhes do WOD para cada categoria. Campos em branco usam as informações padrão acima.
            {applyToAllCategories && (
              <span className="block text-[11px] text-primary mt-1">
                Este WOD será aplicado automaticamente a todas as categorias.
              </span>
            )}
          </p>

          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre categorias para configurar variações específicas.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
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
                          value={variation.displayName ?? ''}
                          onChange={(event) => updateVariationField(category.id, 'displayName', event.target.value)}
                          placeholder={`Nome opcional para ${category.name}`}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Descrição personalizada</Label>
                        <Textarea
                          value={variation.description ?? ''}
                          onChange={(event) => updateVariationField(category.id, 'description', event.target.value)}
                          placeholder="Descrição específica desta categoria"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Time Cap (min)</Label>
                        <Input
                          type="text"
                          value={variation.estimatedDuration ?? ''}
                          onChange={(event) => updateVariationField(category.id, 'estimatedDuration', event.target.value)}
                          placeholder="15"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Notas específicas</Label>
                        <Textarea
                          value={variation.notes ?? ''}
                          onChange={(event) => updateVariationField(category.id, 'notes', event.target.value)}
                          placeholder="Observações ou padrões específicos desta categoria"
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

        <div className="flex gap-4 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/wods')}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => handleSubmit(false)}
            className="flex-1" 
            disabled={saving}
          >
            <FileText className="w-4 h-4 mr-2" />
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar WOD'
            )}
          </Button>
          <Button 
            type="button"
            onClick={() => handleSubmit(true)}
            className="flex-1" 
            disabled={saving}
          >
            <Globe className="w-4 h-4 mr-2" />
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar WOD'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

