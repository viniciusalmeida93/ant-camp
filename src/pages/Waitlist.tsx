import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Phone, Mail, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useChampionship } from "@/contexts/ChampionshipContext";

export default function Waitlist() {
    const { selectedChampionship } = useChampionship();
    const [loading, setLoading] = useState(true);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    useEffect(() => {
        if (selectedChampionship) {
            loadData();
        }
    }, [selectedChampionship, selectedCategory]);

    const loadData = async () => {
        try {
            setLoading(true);

            const { data: catsData } = await supabase
                .from("categories")
                .select("id, name")
                .eq("championship_id", selectedChampionship!.id)
                .order("order_index");

            if (catsData) setCategories(catsData);

            let query = supabase
                .from("waitlist")
                .select("*, categories(name)")
                .eq("championship_id", selectedChampionship!.id)
                .order("position", { ascending: true });

            if (selectedCategory && selectedCategory !== "all") {
                query = query.eq("category_id", selectedCategory);
            }

            const { data, error } = await query;
            if (error) throw error;

            setWaitlist(data || []);
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao carregar fila de espera");
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (item: any) => {
        try {
            // Criar inscrição com status pending
            const { error: regError } = await supabase
                .from("registrations")
                .insert({
                    championship_id: selectedChampionship!.id,
                    category_id: item.category_id,
                    athlete_name: item.athlete_name,
                    athlete_email: item.athlete_email,
                    athlete_phone: item.athlete_phone,
                    user_id: item.user_id || null,
                    status: "pending",
                    payment_status: "pending",
                    platform_fee_cents: 0,
                    subtotal_cents: 0,
                    total_cents: 0,
                });

            if (regError) throw regError;

            // Marcar como convertido na waitlist
            await updateStatus(item.id, 'converted');

            toast.success(`${item.athlete_name} promovido para inscrição com sucesso!`);
        } catch (err: any) {
            console.error(err);
            toast.error("Erro ao promover atleta para inscrição");
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from("waitlist")
                .update({ status })
                .eq("id", id);

            if (error) throw error;
            toast.success("Status atualizado com sucesso");
            loadData();
        } catch (err: any) {
            console.error(err);
            toast.error("Erro ao atualizar a inscrição na fila de espera");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "waiting":
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Aguardando Vaga</Badge>;
            case "notified":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Notificado</Badge>;
            case "converted":
                return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Vaga Concedida</Badge>;
            case "expired":
                return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Expirado</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (!selectedChampionship) {
        return (
            <div className="p-6">
                <div className="text-center py-12 text-muted-foreground">Selecione um campeonato para ver a fila de espera.</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Fila de Espera</h1>
                    <p className="text-muted-foreground">Gerencie os atletas que aguardam vagas em categorias esgotadas.</p>
                </div>
            </div>

            <Card className="border-border/40 shadow-sm bg-card/50">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-lg">Inscritos na Fila</CardTitle>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[200px] h-9">
                                <SelectValue placeholder="Todas as Categorias" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Categorias</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : waitlist.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Nenhum atleta na fila de espera para este filtro.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {waitlist.map((item) => (
                                <div key={item.id} className="flex flex-col sm:flex-row justify-between items-center bg-background border border-border/50 rounded-lg p-4 shadow-sm gap-4 transition-colors hover:border-primary/30">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="bg-muted w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                            <span className="font-bold text-sm text-foreground">#{item.position}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                                {item.athlete_name}
                                                {getStatusBadge(item.status || 'waiting')}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {item.categories?.name}</span>
                                                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {item.athlete_email}</span>
                                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {item.athlete_phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        {item.status !== 'converted' && item.status !== 'expired' && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        window.open(`https://wa.me/55${item.athlete_phone?.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(item.athlete_name)}!%20Temos%20uma%20vaga%20dispon%C3%ADvel%20para%20voc%C3%AA%20no%20${encodeURIComponent(selectedChampionship?.name || 'campeonato')}.`, '_blank');
                                                        if (item.status === 'waiting') updateStatus(item.id, 'notified');
                                                    }}
                                                >
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    Notificar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50"
                                                    onClick={() => handlePromote(item)}
                                                >
                                                    <ArrowRight className="w-4 h-4 mr-2" />
                                                    Promover para Inscrição
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
                                                    onClick={() => updateStatus(item.id, 'expired')}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Expirar
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
