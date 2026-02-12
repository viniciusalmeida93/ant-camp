import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useChampionship } from '@/contexts/ChampionshipContext';

export default function RegistrationForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category');
    const { selectedChampionship } = useChampionship();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [category, setCategory] = useState<any>(null);
    const [formData, setFormData] = useState({
        teamName: '',
        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
        boxName: '',
    });

    useEffect(() => {
        if (!selectedChampionship) {
            toast.error("Selecione um campeonato primeiro");
            navigate("/app");
            return;
        }

        if (!categoryId) {
            toast.error("Categoria não selecionada");
            navigate("/registrations");
            return;
        }

        loadCategory();
    }, [selectedChampionship, categoryId]);

    const loadCategory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .eq("id", categoryId)
                .single();

            if (error) throw error;

            if (data) {
                setCategory(data);

                // Initialize form based on category format
                const teamSize = data.team_size || (data.format === 'dupla' ? 2 : data.format === 'trio' ? 3 : data.format === 'time' ? 4 : 1);

                if (data.format === 'individual') {
                    setFormData({
                        teamName: '',
                        members: [{ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' }],
                        boxName: '',
                    });
                } else {
                    setFormData({
                        teamName: '',
                        members: Array(teamSize).fill(null).map(() => ({ name: '', email: '', whatsapp: '', shirtSize: 'M', cpf: '', birthDate: '', box: '' })),
                        boxName: '',
                    });
                }
            }
        } catch (error: any) {
            console.error("Error loading category:", error);
            toast.error("Erro ao carregar categoria");
            navigate("/registrations");
        } finally {
            setLoading(false);
        }
    };

    const updateMember = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            members: prev.members.map((member, i) =>
                i === index ? { ...member, [field]: value } : member
            ),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!category) {
            toast.error("Categoria não encontrada");
            return;
        }

        setSaving(true);

        try {
            const athleteName = category.format === 'individual'
                ? (formData.members[0]?.name || formData.teamName)
                : formData.teamName;

            const regData = {
                championship_id: selectedChampionship!.id,
                category_id: category.id,
                athlete_name: athleteName,
                team_name: category.format !== 'individual' ? formData.teamName : null,
                box_name: formData.boxName,
                status: 'approved',
                payment_status: 'approved',
                paid_at: new Date().toISOString(),
                total_cents: category.price_cents,
                subtotal_cents: category.price_cents,
                platform_fee_cents: 0,
                team_members: formData.members,
                athlete_email: formData.members[0]?.email || null,
                athlete_cpf: formData.members[0]?.cpf?.replace(/\D/g, '') || null,
                athlete_birth_date: formData.members[0]?.birthDate || null,
                athlete_phone: formData.members[0]?.whatsapp || null,
                shirt_size: formData.members[0]?.shirtSize || 'M'
            };

            const { error } = await supabase.from("registrations").insert(regData);

            if (error) throw error;

            toast.success("Inscrição criada com sucesso!");
            navigate('/registrations');
        } catch (error: any) {
            console.error("Error creating registration:", error);
            toast.error(error.message || "Erro ao criar inscrição");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="w-full mx-auto px-6 py-6 max-w-[98%]">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Categoria não encontrada</p>
                    <Button onClick={() => navigate("/registrations")} className="mt-4">
                        Voltar para Inscrições
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
                    onClick={() => navigate('/registrations')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Inscrições
                </Button>
                <h1 className="text-4xl font-bold mb-2">Nova Inscrição</h1>
                <p className="text-muted-foreground">
                    Preencha os dados da inscrição para {category.name}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="font-semibold">{category.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {category.format} - {category.gender}
                    </p>
                </div>

                {category.format !== 'individual' && (
                    <div>
                        <Label htmlFor="teamName">Nome do Time/Pessoa *</Label>
                        <Input
                            id="teamName"
                            value={formData.teamName}
                            onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                            placeholder="Ex: Time RX"
                            required
                        />
                    </div>
                )}

                {category.format === 'individual' && (
                    <div>
                        <Label htmlFor="teamName">Nome do Atleta *</Label>
                        <Input
                            id="teamName"
                            value={formData.teamName}
                            onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                            placeholder="Nome do atleta"
                            required
                        />
                    </div>
                )}

                <div>
                    <Label htmlFor="boxName">Box para Chamada *</Label>
                    <Input
                        id="boxName"
                        value={formData.boxName}
                        onChange={(e) => setFormData({ ...formData, boxName: e.target.value })}
                        placeholder="Ex: CrossFit SP (Nome do Box Principal)"
                        required
                    />
                </div>

                <div className="space-y-4">
                    <Label>
                        {category.format === 'individual' ? 'Dados do Atleta' : 'Integrantes'}
                    </Label>
                    {formData.members.map((member, index) => (
                        <Card key={index} className="p-4">
                            <div className="space-y-3">
                                {category.format !== 'individual' && (
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        Integrante {index + 1}
                                    </p>
                                )}
                                <div>
                                    <Label>Nome Completo *</Label>
                                    <Input
                                        value={member.name}
                                        onChange={(e) => updateMember(index, 'name', e.target.value)}
                                        placeholder="Nome completo"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>Email *</Label>
                                        <Input
                                            type="email"
                                            value={member.email}
                                            onChange={(e) => updateMember(index, 'email', e.target.value)}
                                            placeholder="email@exemplo.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>WhatsApp *</Label>
                                        <Input
                                            type="text"
                                            value={member.whatsapp}
                                            onChange={(e) => updateMember(index, 'whatsapp', e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>CPF *</Label>
                                        <Input
                                            type="text"
                                            value={member.cpf}
                                            onChange={(e) => updateMember(index, 'cpf', e.target.value)}
                                            placeholder="000.000.000-00"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Data de Nascimento *</Label>
                                        <Input
                                            type="date"
                                            value={member.birthDate}
                                            onChange={(e) => updateMember(index, 'birthDate', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label>Box do Atleta</Label>
                                        <Input
                                            value={member.box}
                                            onChange={(e) => updateMember(index, 'box', e.target.value)}
                                            placeholder="Box onde treina (Opcional)"
                                        />
                                    </div>
                                    <div>

                                        <Label>Tamanho da Camisa</Label>
                                        <Select
                                            value={member.shirtSize}
                                            onValueChange={(value) => updateMember(index, 'shirtSize', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="P">P</SelectItem>
                                                <SelectItem value="M">M</SelectItem>
                                                <SelectItem value="G">G</SelectItem>
                                                <SelectItem value="GG">GG</SelectItem>
                                                <SelectItem value="XG">XG</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="flex gap-4 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/registrations')}
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
                            "Criar Inscrição"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
