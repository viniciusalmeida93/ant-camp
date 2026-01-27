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
        minAge: '',
        maxAge: '',
        rules: '',
        price: '',
    });

    // Team Config State
    const [teamConfig, setTeamConfig] = useState<{ gender: string, minAge: string, maxAge: string }[]>([
        { gender: 'misto', minAge: '', maxAge: '' },
        { gender: 'misto', minAge: '', maxAge: '' },
        { gender: 'misto', minAge: '', maxAge: '' },
        { gender: 'misto', minAge: '', maxAge: '' },
    ]);

    // Batches State
    const [hasBatches, setHasBatches] = useState(false);
    const [batches, setBatches] = useState<{ name: string, quantity: string, price: string, end_date: string }[]>([]);

    // Kits State
    const [hasKits, setHasKits] = useState(false);
    const [kitsActive, setKitsActive] = useState(true);
    const [kitsConfig, setKitsConfig] = useState<{ size: string, total: string }[]>([]);

    const availableSizes = ["PP", "P", "M", "G", "GG", "XG", "XXG", "XXXG"];

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

            setFormData({
                name: data.name,
                format: data.format,
                gender: data.gender,
                capacity: data.capacity === 999999 ? '' : String(data.capacity),
                minAge: data.min_age ? String(data.min_age) : '',
                maxAge: data.max_age ? String(data.max_age) : '',
                rules: data.rules || '',
                price: data.price_cents ? (data.price_cents / 100).toFixed(2).replace('.', ',') : '',
            });

            if (data.team_config && Array.isArray(data.team_config) && data.team_config.length > 0) {
                setTeamConfig(data.team_config.map((m: any) => ({
                    gender: m.gender || 'misto',
                    minAge: m.min_age ? String(m.min_age) : '',
                    maxAge: m.max_age ? String(m.max_age) : ''
                })));
            } else if (data.format === 'time') {
                setTeamConfig([
                    { gender: 'misto', minAge: '', maxAge: '' },
                    { gender: 'misto', minAge: '', maxAge: '' },
                    { gender: 'misto', minAge: '', maxAge: '' },
                    { gender: 'misto', minAge: '', maxAge: '' },
                ]);
            }

            setHasBatches(data.has_batches || false);
            if (data.batches && Array.isArray(data.batches)) {
                setBatches(data.batches.map((b: any) => ({
                    name: b.name,
                    quantity: b.quantity ? String(b.quantity) : '',
                    price: b.price_cents ? (b.price_cents / 100).toFixed(2).replace('.', ',') : '',
                    end_date: b.end_date || ''
                })));
            }

            setHasKits(data.has_kits || false);
            setKitsActive(data.kits_active !== false); // Default to true
            if (data.kits_config && Array.isArray(data.kits_config)) {
                setKitsConfig(data.kits_config.map((k: any) => ({
                    size: k.size,
                    total: k.total ? String(k.total) : ''
                })));
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

    const handleAddTeamMember = () => {
        setTeamConfig([...teamConfig, { gender: 'misto', minAge: '', maxAge: '' }]);
    };

    const handleRemoveTeamMember = (index: number) => {
        const newConfig = [...teamConfig];
        newConfig.splice(index, 1);
        setTeamConfig(newConfig);
    };

    const handleTeamConfigChange = (index: number, field: 'gender' | 'minAge' | 'maxAge', value: string) => {
        const newConfig = [...teamConfig];
        // @ts-ignore
        newConfig[index][field] = value;
        setTeamConfig(newConfig);
    };

    const handleToggleSize = (size: string) => {
        const isSelected = kitsConfig.some(k => k.size === size);
        if (isSelected) {
            setKitsConfig(kitsConfig.filter(k => k.size !== size));
        } else {
            setKitsConfig([...kitsConfig, { size, total: '' }]);
        }
    };

    const handleKitInventoryChange = (size: string, value: string) => {
        setKitsConfig(kitsConfig.map(k => k.size === size ? { ...k, total: value } : k));
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

            // Process team config
            const processedTeamConfig = formData.format === 'time' ? teamConfig.map(m => ({
                gender: m.gender,
                min_age: m.minAge ? parseInt(m.minAge) : null,
                max_age: m.maxAge ? parseInt(m.maxAge) : null
            })) : [];

            // Calculate derived fields (backward compatibility)
            const teamSize = formData.format === 'time' ? processedTeamConfig.length : null;
            let genderComposition = null;
            if (formData.format === 'time') {
                const m = processedTeamConfig.filter(t => t.gender === 'masculino').length;
                const f = processedTeamConfig.filter(t => t.gender === 'feminino').length;
                const x = processedTeamConfig.filter(t => t.gender === 'misto').length;

                const parts = [];
                if (m > 0) parts.push(`${m}M`);
                if (f > 0) parts.push(`${f}F`);
                if (x > 0) parts.push(`${x}X`);
                genderComposition = parts.join('/');
            }

            const categoryData = {
                championship_id: selectedChampionship.id,
                name: formData.name,
                format: formData.format,
                gender: formData.gender,
                capacity: capacity,
                min_age: formData.minAge ? parseInt(formData.minAge) : null,
                max_age: formData.maxAge ? parseInt(formData.maxAge) : null,
                team_size: teamSize,
                gender_composition: genderComposition,
                team_config: processedTeamConfig,
                rules: formData.rules || null,
                price_cents: price_cents,
                athletes_per_heat: athletes_per_heat,
                has_batches: hasBatches,
                batches: processedBatches,
                has_kits: hasKits,
                kits_active: kitsActive,
                kits_config: hasKits ? kitsConfig.map(k => ({
                    size: k.size,
                    total: k.total ? parseInt(k.total) : null
                })) : []
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
                        <div className="grid grid-cols-2 gap-6">
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
                            <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="minAge">Idade Mínima</Label>
                                    <Input
                                        id="minAge"
                                        type="number"
                                        value={formData.minAge}
                                        onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                                        placeholder="Min"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="maxAge">Idade Máxima</Label>
                                    <Input
                                        id="maxAge"
                                        type="number"
                                        value={formData.maxAge}
                                        onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                                        placeholder="Max"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {formData.format === 'time' && (
                        <div className="space-y-4 border rounded-lg p-6 bg-muted/20">
                            <div className="space-y-0.5">
                                <Label className="text-base">Composição do Time</Label>
                                <p className="text-sm text-muted-foreground">
                                    Defina os integrantes do time. Deixe as idades vazias para qualquer idade.
                                </p>
                            </div>

                            <div className="space-y-4 pt-2">
                                {teamConfig.map((member, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-4 items-end animate-fade-in border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                        <div className="col-span-12 md:col-span-4">
                                            <Label className="text-xs">Gênero</Label>
                                            <Select
                                                value={member.gender}
                                                onValueChange={(value) => handleTeamConfigChange(index, 'gender', value)}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="masculino">Masculino</SelectItem>
                                                    <SelectItem value="feminino">Feminino</SelectItem>
                                                    <SelectItem value="misto">Misto/Qualquer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-5 md:col-span-3">
                                            <Label className="text-xs">Idade Min.</Label>
                                            <Input
                                                type="number"
                                                value={member.minAge}
                                                onChange={(e) => handleTeamConfigChange(index, 'minAge', e.target.value)}
                                                placeholder="Qualquer"
                                                className="mt-1"
                                                min="0"
                                            />
                                        </div>
                                        <div className="col-span-5 md:col-span-3">
                                            <Label className="text-xs">Idade Max.</Label>
                                            <Input
                                                type="number"
                                                value={member.maxAge}
                                                onChange={(e) => handleTeamConfigChange(index, 'maxAge', e.target.value)}
                                                placeholder="Qualquer"
                                                className="mt-1"
                                                min="0"
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-2 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveTeamMember(index)}
                                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                                disabled={teamConfig.length <= 1}
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
                                    onClick={handleAddTeamMember}
                                    className="w-full mt-2 border-dashed"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar Integrante
                                </Button>
                            </div>
                        </div>
                    )}

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

                    {/* Kits Section */}
                    <div className="space-y-4 border rounded-lg p-6 bg-primary/5 border-primary/20">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Kits do Evento</Label>
                                <p className="text-sm text-muted-foreground">
                                    Ative se esta categoria oferecer kit (ex: camiseta) aos atletas
                                </p>
                            </div>
                            <Switch
                                checked={hasKits}
                                onCheckedChange={setHasKits}
                            />
                        </div>

                        {hasKits && (
                            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">Permitir escolha de kit</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Desative para encerrar a escolha de kits sem afetar os já realizados
                                        </p>
                                    </div>
                                    <Switch
                                        checked={kitsActive}
                                        onCheckedChange={setKitsActive}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm">Tamanhos Disponíveis</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableSizes.map(size => {
                                            const isSelected = kitsConfig.some(k => k.size === size);
                                            return (
                                                <Button
                                                    key={size}
                                                    type="button"
                                                    variant={isSelected ? "default" : "outline"}
                                                    size="sm"
                                                    className={`h-10 min-w-12 transition-all ${isSelected ? 'bg-primary border-primary' : ''}`}
                                                    onClick={() => handleToggleSize(size)}
                                                >
                                                    {size}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {kitsConfig.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <Label className="text-sm">Controle de Estoque por Tamanho</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {kitsConfig.map(k => (
                                                <div key={k.size} className="space-y-1.5 p-3 border rounded-md bg-background/50">
                                                    <Label className="text-xs font-bold">{k.size}</Label>
                                                    <Input
                                                        type="number"
                                                        value={k.total}
                                                        onChange={(e) => handleKitInventoryChange(k.size, e.target.value)}
                                                        placeholder="∞"
                                                        className="h-8"
                                                        min="0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            * Deixe o campo vazio para estoque ilimitado
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
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
