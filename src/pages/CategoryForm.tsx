import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';

export default function CategoryForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { selectedChampionship } = useChampionship();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        format: 'individual',
        gender: 'masculino',
        capacity: '',
        teamSize: '',
        genderComposition: '',
        rules: '',
        price: '',
    });

    // Batches State
    const [hasBatches, setHasBatches] = useState(false);
    const [batches, setBatches] = useState<{ name: string, quantity: string, price: string, end_date: string }[]>([]);

    useEffect(() => {
        if (id) {
            loadCategory();
        }
    }, [id]);

    const loadCategory = async () => {
        try {
            const { data: rawData, error } = await supabase
                .from('categories')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            const data = rawData as any;

            if (data) {
                setFormData({
                    name: data.name,
                    format: data.format,
                    gender: data.gender,
                    capacity: data.capacity === 999999 ? '' : String(data.capacity),
                    teamSize: data.team_size ? String(data.team_size) : '',
                    genderComposition: data.gender_composition || '',
                    rules: data.rules || '',
                    price: data.price_cents ? (data.price_cents / 100).toFixed(2).replace('.', ',') : '',
                });

                setHasBatches(data.has_batches || false);
                if (data.batches && Array.isArray(data.batches)) {
                    setBatches(data.batches.map((b: any) => ({
                        name: b.name,
                        quantity: b.quantity ? String(b.quantity) : '',
                        price: b.price_cents ? (b.price_cents / 100).toFixed(2).replace('.', ',') : '',
                        end_date: b.end_date || ''
                    })));
                }
            }
        } catch (error) {
            console.error('Error loading category:', error);
            toast.error('Erro ao carregar categoria');
            navigate('/categories');
        } finally {
            setFetching(false);
        }
    };

    const handleAddBatch = () => {
        setBatches([...batches, { name: '', quantity: '', price: '', end_date: '' }]);
    };

    const handleRemoveBatch = (index: number) => {
        const newBatches = [...batches];
        newBatches.splice(index, 1);
        setBatches(newBatches);
    };

    const handleBatchChange = (index: number, field: 'name' | 'quantity' | 'price' | 'end_date', value: string) => {
        const newBatches = [...batches];
        newBatches[index][field] = value;
        setBatches(newBatches);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (!selectedChampionship) {
                toast.error("Selecione um campeonato primeiro");
                return;
            }

            const capacity = formData.capacity && formData.capacity.trim() !== ''
                ? parseInt(formData.capacity)
                : 999999;

            const price_cents = formData.price && formData.price.trim() !== ''
                ? Math.round(parseFloat(formData.price.replace(',', '.')) * 100)
                : 0;

            const athletes_per_heat = 10; // Default or add field if needed

            // Process batches
            let processedBatches: any[] = [];
            if (hasBatches) {
                processedBatches = batches.map(b => ({
                    name: b.name,
                    quantity: b.quantity ? parseInt(b.quantity) : null,
                    price_cents: b.price ? Math.round(parseFloat(b.price.replace(',', '.')) * 100) : 0,
                    end_date: b.end_date || null
                })).filter(b => b.name.trim() !== '');
            }

            const categoryData = {
                championship_id: selectedChampionship.id,
                name: formData.name,
                format: formData.format,
                gender: formData.gender,
                capacity: capacity,
                team_size: formData.teamSize ? parseInt(formData.teamSize) : null,
                gender_composition: formData.genderComposition || null,
                rules: formData.rules || null,
                price_cents: price_cents,
                athletes_per_heat: athletes_per_heat,
                has_batches: hasBatches,
                batches: processedBatches
            };

            if (id) {
                const { error } = await supabase
                    .from("categories")
                    .update(categoryData)
                    .eq("id", id);

                if (error) throw error;
                toast.success("Categoria atualizada com sucesso!");
            } else {
                // Get max order
                const { data: maxOrderData } = await supabase
                    .from('categories')
                    .select('order_index')
                    .eq('championship_id', selectedChampionship.id)
                    .order('order_index', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const maxOrderDataAny = maxOrderData as any;
                const orderIndex = maxOrderDataAny ? (maxOrderDataAny.order_index ?? 0) + 1 : 0;

                const { error } = await supabase
                    .from("categories")
                    .insert({ ...categoryData, order_index: orderIndex });

                if (error) throw error;
                toast.success("Categoria criada com sucesso!");
            }

            navigate('/categories');
        } catch (error: any) {
            console.error("Error saving category:", error);
            toast.error("Erro ao salvar categoria");
        } finally {
            setSaving(false);
        }
    };

    if (fetching) {
        return (
            <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div>
                    <h1 className="text-4xl font-bold mb-2">{id ? 'Editar Categoria' : 'Nova Categoria'}</h1>
                    <p className="text-muted-foreground">Preencha os dados da categoria</p>
                </div>
            </div>

            <div className="max-w-4xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <Label htmlFor="name">Nome da Categoria *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: RX Individual Masculino"
                                required
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <Label htmlFor="format">Formato *</Label>
                            <Select
                                value={formData.format}
                                onValueChange={(value) => setFormData({ ...formData, format: value })}
                                required
                            >
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

                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <Label htmlFor="gender">Gênero *</Label>
                            <Select
                                value={formData.gender}
                                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                                required
                            >
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
                        <div className="col-span-2 md:col-span-1">
                            <Label htmlFor="capacity">Capacidade</Label>
                            <Input
                                id="capacity"
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                placeholder="Deixe vazio para ilimitada"
                                min="1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Deixe vazio para capacidade ilimitada
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <Label htmlFor="teamSize">Tamanho do Time (se aplicável)</Label>
                            <Input
                                id="teamSize"
                                type="number"
                                value={formData.teamSize}
                                onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                                placeholder="4"
                                min="1"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <Label htmlFor="genderComposition">Composição de Gênero (misto)</Label>
                            <Input
                                id="genderComposition"
                                value={formData.genderComposition}
                                onChange={(e) => setFormData({ ...formData, genderComposition: e.target.value })}
                                placeholder="Ex: 2M/2F"
                            />
                        </div>
                    </div>

                    {/* Batches Section */}
                    <div className="space-y-4 border rounded-lg p-6 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Lotes</Label>
                                <p className="text-sm text-muted-foreground">
                                    Ative para configurar múltiplos lotes de inscrição
                                </p>
                            </div>
                            <Switch
                                checked={hasBatches}
                                onCheckedChange={setHasBatches}
                            />
                        </div>

                        {hasBatches && (
                            <div className="space-y-4 pt-4">
                                {batches.map((batch, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-4 items-end animate-fade-in border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                        <div className="col-span-12 md:col-span-4">
                                            <Label className="text-xs">Nome do Lote</Label>
                                            <Input
                                                value={batch.name}
                                                onChange={(e) => handleBatchChange(index, 'name', e.target.value)}
                                                placeholder="Ex: 1º Lote"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <Label className="text-xs">Qtd.</Label>
                                            <Input
                                                type="number"
                                                value={batch.quantity}
                                                onChange={(e) => handleBatchChange(index, 'quantity', e.target.value)}
                                                placeholder="20"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-3">
                                            <Label className="text-xs">Até (Data)</Label>
                                            <Input
                                                type="date"
                                                value={batch.end_date}
                                                onChange={(e) => handleBatchChange(index, 'end_date', e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="col-span-3 md:col-span-2">
                                            <Label className="text-xs">Valor (R$)</Label>
                                            <Input
                                                value={batch.price}
                                                onChange={(e) => handleBatchChange(index, 'price', e.target.value)}
                                                placeholder="0,00"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="col-span-1 md:col-span-1 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveBatch(index)}
                                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddBatch}
                                    className="w-full mt-2 border-dashed"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar Lote
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className={hasBatches ? "opacity-50 pointer-events-none" : ""}>
                        <Label htmlFor="price">Preço por Categoria (R$)</Label>
                        <Input
                            id="price"
                            inputMode="decimal"
                            readOnly={hasBatches}
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder={hasBatches ? "Definido nos lotes" : "300,00"}
                            className={hasBatches ? "bg-muted" : ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {hasBatches
                                ? "O preço é determinado pelo lote ativo no momento da inscrição."
                                : "Preço total da inscrição para esta categoria (não por atleta). Ex: Trio = R$ 300,00, Dupla = R$ 200,00, Individual = R$ 100,00"}
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="rules">Regras e Observações</Label>
                        <Textarea
                            id="rules"
                            value={formData.rules}
                            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                            placeholder="Regras específicas da categoria..."
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/categories')}
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
                                id ? 'Atualizar Categoria' : 'Criar Categoria'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
