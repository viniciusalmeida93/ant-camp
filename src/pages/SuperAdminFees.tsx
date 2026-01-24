import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, Loader2, TrendingUp } from "lucide-react";

export default function SuperAdminFees() {
    const [loading, setLoading] = useState(true);
    const [feeConfig, setFeeConfig] = useState<{ type: 'percentage' | 'fixed', value: number }>({ type: 'percentage', value: 5 });
    const [savingFee, setSavingFee] = useState(false);
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadFeeConfig(), loadRevenueStats()]);
        } finally {
            setLoading(false);
        }
    };

    const loadRevenueStats = async () => {
        // Reusing the get_organizer_stats RPC for now to sum up revenue
        // Ideally we would have a dedicated RPC for platform revenue
        const { data: organizerData } = await supabase.rpc("get_organizer_stats");
        if (organizerData) {
            const total = organizerData.reduce((sum: number, org: any) => sum + org.total_revenue_cents, 0);
            setTotalRevenue(total);
        }
    };

    const loadFeeConfig = async () => {
        const { data } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'platform_fee_config')
            .maybeSingle();

        if (data?.value) {
            try {
                const parsed = JSON.parse(data.value);
                setFeeConfig(parsed);
            } catch (e) {
                console.error("Error parsing fee config", e);
            }
        }
    };

    const handleSaveFeeConfig = async () => {
        if (!confirm("Isso vai atualizar a taxa global e recalcular inscrições pendentes em todos os campeonatos que seguem a regra global. Deseja continuar?")) {
            return;
        }

        setSavingFee(true);
        try {
            const { data, error } = await supabase.rpc('update_global_platform_fee', {
                new_fee_config: feeConfig
            });

            if (error) throw error;

            const result = data as any;
            if (result && result.success) {
                toast.success(`Taxa atualizada! ${result.updated_registrations} inscrições pendentes foram recalculadas.`);
            } else {
                toast.success("Taxa atualizada com sucesso!");
            }
        } catch (error: any) {
            console.error("Error saving fee config:", error);
            toast.error(`Erro ao salvar taxa: ${error.message || 'Erro desconhecido'} ${error.details || ''}`);
        } finally {
            setSavingFee(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Taxas & Faturamento</h1>
                <p className="text-sm text-muted-foreground">
                    Gerencie a monetização da plataforma
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Faturamento Total Transacionado
                        </CardTitle>
                        <CardDescription>
                            Valor total que passou pela plataforma (Bruto)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {formatCurrency(totalRevenue)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Soma de todos os pagamentos aprovados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-primary" />
                            Taxa Global da Plataforma
                        </CardTitle>
                        <CardDescription>
                            Configure a taxa padrão aplicada a todos os campeonatos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Valor da Taxa (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={feeConfig.value / 100}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFeeConfig({
                                                    type: 'fixed',
                                                    value: Math.round(val * 100)
                                                });
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Taxa de {formatCurrency(feeConfig.value)} aplicada a cada inscrição individual ou por time.
                                    </p>
                                </div>
                            </div>
                            <Button onClick={handleSaveFeeConfig} disabled={savingFee} className="w-full">
                                {savingFee ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    "Salvar Configuração Global"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
