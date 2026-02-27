import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChampionship } from "@/contexts/ChampionshipContext";
import { getPixPayloadForDisplay, isEmvPixPayload } from "@/utils/pix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
    Loader2,
    Download,
    DollarSign,
    TrendingUp,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    QrCode,
    Copy,
    CheckCircle2,
    CreditCard,
    Building,
    ExternalLink,
    Send,
    Mail
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function PaymentConfig() {
    const navigate = useNavigate();
    const { selectedChampionship, loadChampionships, setSelectedChampionship } = useChampionship();
    const [activeTab, setActiveTab] = useState("dashboard");

    // --- States for Dashboard ---
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState({
        totalGross: 0,
        totalFees: 0,
        totalNet: 0,
        approvedCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
    });
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [batches, setBatches] = useState<any[]>([]);
    const [activeBatch, setActiveBatch] = useState<any>(null);
    const [nextBatch, setNextBatch] = useState<any>(null);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [sendingRecovery, setSendingRecovery] = useState<Set<string>>(new Set());

    // --- States for Settings ---
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [copyingPix, setCopyingPix] = useState(false);
    const [pixPayload, setPixPayload] = useState("");
    const [asaasWalletId, setAsaasWalletId] = useState("");
    const [showColumnError, setShowColumnError] = useState(false);

    // --- States for Coupons ---
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [couponDialogOpen, setCouponDialogOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
    const [couponFilterType, setCouponFilterType] = useState("all");
    const [couponSearchTerm, setCouponSearchTerm] = useState("");

    // --- Effects ---
    useEffect(() => {
        if (selectedChampionship) {
            loadDashboardData();
            loadSettingsData();
            loadBatches(selectedChampionship.id);
        }
    }, [selectedChampionship]);

    useEffect(() => {
        applyDashboardFilters();
    }, [registrations, filterStatus, searchTerm]);

    // --- Dashboard Logic ---
    const loadDashboardData = async () => {
        if (!selectedChampionship) return;
        try {
            setLoadingDashboard(true);
            const { data: regs, error: regsError } = await supabase
                .from("registrations")
                .select("*, categories(*), payments(*)")
                .eq("championship_id", selectedChampionship.id)
                .order("created_at", { ascending: false });

            if (regsError) throw regsError;
            setRegistrations(regs || []);

            const approved = regs?.filter(r => r.payment_status === "approved") || [];
            const pending = regs?.filter(r => r.payment_status === "pending") || [];
            const cancelled = regs?.filter(r => r.payment_status === "cancelled" || r.payment_status === "expired") || [];

            const totalGross = approved.reduce((sum, r) => sum + r.subtotal_cents, 0);
            const totalFees = approved.reduce((sum, r) => sum + r.platform_fee_cents, 0);

            setStats({
                totalGross,
                totalFees,
                totalNet: totalGross, // Simplificado conforme pedido anterior
                approvedCount: approved.length,
                pendingCount: pending.length,
                cancelledCount: cancelled.length,
            });
        } catch (error) {
            console.error("Error loading dashboard:", error);
            toast.error("Erro ao carregar dados do dashboard");
        } finally {
            setLoadingDashboard(false);
        }
    };

    const loadBatches = async (champId: string) => {
        try {
            const { data: batchData, error: batchError } = await supabase
                .from('registration_batches')
                .select('*')
                .eq('championship_id', champId)
                .order('start_date', { ascending: true });

            if (batchError) throw batchError;
            if (!batchData || batchData.length === 0) return;

            const { data: regsData } = await supabase
                .from('registrations')
                .select('batch_id, payment_status, amount')
                .eq('championship_id', champId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const processed = batchData.map(batch => {
                const batchRegs = (regsData || []).filter(r => r.batch_id === batch.id);
                const approvedSales = batchRegs.filter(r => r.payment_status === 'approved').length;
                const revenue = batchRegs
                    .filter(r => r.payment_status === 'approved')
                    .reduce((sum, r) => sum + (r.amount || 0), 0);

                const startDate = new Date(batch.start_date);
                const endDate = new Date(batch.end_date);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);

                let status = 'Futuro';
                let statusColor: any = 'secondary';

                if (approvedSales >= batch.max_slots) {
                    status = 'Esgotado';
                    statusColor = 'destructive';
                } else if (today >= startDate && today <= endDate) {
                    status = 'Ativo';
                    statusColor = 'default';
                } else if (today > endDate) {
                    status = 'Expirado';
                    statusColor = 'secondary';
                }

                return {
                    ...batch,
                    approvedSales,
                    revenue,
                    remaining: batch.max_slots - approvedSales,
                    occupancy: batch.max_slots > 0 ? Math.round((approvedSales / batch.max_slots) * 100) : 0,
                    status,
                    statusColor,
                };
            });

            setBatches(processed);
            setActiveBatch(processed.find(b => b.status === 'Ativo') || null);
            setNextBatch(processed.find(b => b.status === 'Futuro') || null);
        } catch (error) {
            console.error('Erro ao carregar lotes:', error);
        }
    };

    const sendCartRecovery = async (registrationIds: string[]) => {
        if (registrationIds.length === 0) return;
        setSendingRecovery(prev => new Set([...prev, ...registrationIds]));
        let successCount = 0;
        let failCount = 0;
        for (const id of registrationIds) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-cart-recovery`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({ registrationId: id }),
                    }
                );
                if (res.ok) successCount++;
                else failCount++;
            } catch {
                failCount++;
            }
        }
        setSendingRecovery(prev => {
            const next = new Set(prev);
            registrationIds.forEach(id => next.delete(id));
            return next;
        });
        setSelectedRows(new Set());
        if (successCount > 0) toast.success(`📧 ${successCount} email(s) de recuperação enviado(s)!`);
        if (failCount > 0) toast.error(`❌ Falha ao enviar ${failCount} email(s).`);
    };

    const applyDashboardFilters = () => {
        let filtered = [...registrations];
        if (filterStatus !== "all") {
            filtered = filtered.filter(r => r.payment_status === filterStatus);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.athlete_name.toLowerCase().includes(term) ||
                r.athlete_email.toLowerCase().includes(term) ||
                r.team_name?.toLowerCase().includes(term)
            );
        }
        setFilteredRegistrations(filtered);
    };

    const exportToCSV = () => {
        if (!selectedChampionship) return;
        const headers = ["Nome", "Email", "Categoria", "Status", "Valor", "Taxa", "Líquido", "Data"];
        const rows = filteredRegistrations.map(r => [
            r.athlete_name,
            r.athlete_email,
            r.categories?.name || "N/A",
            r.payment_status,
            formatCurrency(r.subtotal_cents),
            formatCurrency(r.platform_fee_cents),
            formatCurrency(r.subtotal_cents), // Simplificado
            new Date(r.created_at).toLocaleDateString("pt-BR"),
        ]);

        const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financeiro-${selectedChampionship.slug}.csv`;
        a.click();
        toast.success("CSV exportado com sucesso!");
    };


    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            approved: { variant: "default", icon: CheckCircle, label: "Aprovado" },
            pending: { variant: "secondary", icon: Clock, label: "Pendente" },
            cancelled: { variant: "destructive", icon: XCircle, label: "Cancelado" },
            expired: { variant: "destructive", icon: XCircle, label: "Expirado" },
            refunded: { variant: "outline", icon: XCircle, label: "Reembolsado" },
        };

        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1 shim-badge">
                <Icon className="w-3 h-3" />
                {config.label}
            </Badge>
        );
    };

    // --- Settings Logic ---
    const loadSettingsData = async () => {
        if (!selectedChampionship) return;
        setLoadingSettings(true);
        try {
            // Load Championship Data (PIX)
            const { data: champData, error: champError } = await supabase
                .from("championships")
                .select("pix_payload")
                .eq("id", selectedChampionship.id)
                .single();

            if (champError) {
                // Check for missing column error
                if (champError.message.includes("pix_payload") || champError.message.includes("column")) {
                    setShowColumnError(true);
                } else {
                    throw champError;
                }
            } else {
                setPixPayload(champData.pix_payload || "");
            }

            // Load Profile Data (Asaas Wallet)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("asaas_wallet_id")
                    .eq("id", session.user.id)
                    .single();

                if (!profileError && profileData) {
                    setAsaasWalletId(profileData.asaas_wallet_id || "");
                }
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            toast.error("Erro ao carregar configurações de pagamento");
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedChampionship) return;
        setSavingSettings(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const payload = pixPayload.trim();

            // PIX Validation
            if (payload && !isEmvPixPayload(payload)) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                const cpfCnpjRegex = /^\d{11,14}$/;
                const isValidKey =
                    emailRegex.test(payload) ||
                    phoneRegex.test(payload.replace(/\D/g, '')) ||
                    cpfCnpjRegex.test(payload.replace(/\D/g, '')) ||
                    payload.length >= 10;

                if (!isValidKey && payload.length < 10) {
                    toast.error("Chave PIX inválida.");
                    setSavingSettings(false);
                    return;
                }
            }

            // Update Championship (PIX)
            const { error: champError } = await supabase
                .from("championships")
                .update({ pix_payload: payload || null })
                .eq("id", selectedChampionship.id);

            if (champError) throw champError;

            // Update Profile (Asaas Wallet)
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ asaas_wallet_id: asaasWalletId.trim() || null })
                .eq("id", session.user.id);

            if (profileError) throw profileError;

            // Update Local Context
            const updatedChamp = { ...selectedChampionship, pix_payload: payload || null };
            setSelectedChampionship(updatedChamp);
            await loadChampionships(); // Refresh list

            toast.success("Configurações de pagamento salvas!");

        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleCopyPix = async () => {
        if (!pixDisplayData.copyPayload) return;
        try {
            setCopyingPix(true);
            await navigator.clipboard.writeText(pixDisplayData.copyPayload);
            toast.success("Código PIX copiado!");
            setTimeout(() => setCopyingPix(false), 3000);
        } catch {
            toast.error("Erro ao copiar");
            setCopyingPix(false);
        }
    };

    const pixDisplayData = useMemo(() =>
        getPixPayloadForDisplay({
            rawPayload: pixPayload,
            merchantName: selectedChampionship?.name,
            merchantCity: selectedChampionship?.location,
        }),
        [pixPayload, selectedChampionship]);

    const pixPreviewUrl = useMemo(() => {
        if (!pixDisplayData.qrPayload) return "";
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixDisplayData.qrPayload)}`;
    }, [pixDisplayData]);

    // --- Coupon Logic ---
    const loadCoupons = async () => {
        if (!selectedChampionship) return;
        setLoadingCoupons(true);
        try {
            const { data, error } = await supabase
                .from("coupons")
                .select("*")
                .eq("championship_id", selectedChampionship.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (error) {
            console.error("Error loading coupons:", error);
            toast.error("Erro ao carregar cupons");
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleDeleteCoupon = async (couponId: string) => {
        if (!confirm("Tem certeza que deseja excluir este cupom?")) return;

        try {
            const { error } = await supabase
                .from("coupons")
                .delete()
                .eq("id", couponId);

            if (error) throw error;
            toast.success("Cupom excluído com sucesso!");
            loadCoupons();
        } catch (error: any) {
            console.error("Error deleting coupon:", error);
            toast.error("Erro ao excluir cupom");
        }
    };

    const handleEditCoupon = (coupon: any) => {
        setSelectedCoupon(coupon);
        setCouponDialogOpen(true);
    };

    const handleAddCoupon = () => {
        setSelectedCoupon(null);
        setCouponDialogOpen(true);
    };

    const filteredCoupons = useMemo(() => {
        let filtered = [...coupons];

        if (couponFilterType !== "all") {
            filtered = filtered.filter(c => c.discount_type === couponFilterType);
        }

        if (couponSearchTerm) {
            const term = couponSearchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.code.toLowerCase().includes(term) ||
                c.description?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [coupons, couponFilterType, couponSearchTerm]);

    const formatCouponValue = (coupon: any) => {
        if (coupon.discount_type === "percentage") {
            return `${coupon.discount_value}%`;
        }
        return formatCurrency(coupon.discount_value);
    };


    if (!selectedChampionship) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Nenhum campeonato selecionado</CardTitle>
                        <CardDescription>Selecione um campeonato na sidebar para ver os pagamentos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate("/app")}>Ir para Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="flex flex-col gap-6 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
                        <p className="text-muted-foreground">{selectedChampionship.name}</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                        <TabsTrigger value="dashboard">Dashboard Financeiro</TabsTrigger>
                        <TabsTrigger value="settings">Configurações</TabsTrigger>
                    </TabsList>

                    {/* === TAB 1: DASHBOARD FINANCEIRO === */}
                    <TabsContent value="dashboard" className="space-y-6 mt-6">
                        {/* Cards financeiros */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(registrations.reduce((s, r) => s + (r.subtotal_cents || 0), 0))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Todas as inscrições</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Confirmado</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalGross)}</div>
                                    <p className="text-xs text-muted-foreground">{stats.approvedCount} pagamentos aprovados</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {formatCurrency(registrations.filter(r => r.payment_status === 'pending').reduce((s, r) => s + (r.subtotal_cents || 0), 0))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{stats.pendingCount} aguardando confirmação</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(registrations.length > 0
                                            ? Math.round(registrations.reduce((s, r) => s + (r.subtotal_cents || 0), 0) / registrations.length)
                                            : 0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Por atleta</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Métodos de Pagamento */}
                        {(() => {
                            const approved = registrations.filter(r => r.payment_status === 'approved');
                            const methodMap = new Map<string, number>();
                            approved.forEach(reg => {
                                const method = reg.payment_method || 'Não informado';
                                methodMap.set(method, (methodMap.get(method) || 0) + (reg.subtotal_cents || 0));
                            });
                            const methods = Array.from(methodMap.entries())
                                .map(([name, amount]) => ({
                                    name,
                                    amount,
                                    percentage: stats.totalGross > 0 ? Math.round((amount / stats.totalGross) * 100) : 0,
                                }))
                                .sort((a, b) => b.amount - a.amount);

                            return methods.length > 0 ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Métodos de Pagamento</CardTitle>
                                        <CardDescription>Distribuição dos pagamentos confirmados</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {methods.map((method) => (
                                                <div key={method.name}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium capitalize">{method.name}</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {method.percentage}% ({formatCurrency(method.amount)})
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-2">
                                                        <div
                                                            className="bg-[#D71C1D] h-2 rounded-full transition-all"
                                                            style={{ width: `${method.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : null;
                        })()}

                        {/* Cards Lote Ativo + Próximo */}
                        {(activeBatch || nextBatch) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {activeBatch && (
                                    <Card className="border-primary">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg">🎟️ {activeBatch.name}</CardTitle>
                                                <Badge variant={activeBatch.statusColor}>{activeBatch.status}</Badge>
                                            </div>
                                            <CardDescription>
                                                {new Date(activeBatch.start_date).toLocaleDateString('pt-BR')} até{' '}
                                                {new Date(activeBatch.end_date).toLocaleDateString('pt-BR')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-2xl font-bold text-primary">
                                                        R$ {(activeBatch.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">por atleta</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">Vendas</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {activeBatch.approvedSales}/{activeBatch.max_slots} ({activeBatch.occupancy}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-2.5">
                                                        <div
                                                            className="bg-primary h-2.5 rounded-full transition-all"
                                                            style={{ width: `${activeBatch.occupancy}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Vagas Restantes</p>
                                                        <p className="text-lg font-bold">{activeBatch.remaining}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Receita Gerada</p>
                                                        <p className="text-lg font-bold">
                                                            R$ {activeBatch.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                                {nextBatch && (
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg">⏳ {nextBatch.name}</CardTitle>
                                                <Badge variant={nextBatch.statusColor}>{nextBatch.status}</Badge>
                                            </div>
                                            <CardDescription>
                                                Inicia em {new Date(nextBatch.start_date).toLocaleDateString('pt-BR')}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-2xl font-bold">
                                                        R$ {(nextBatch.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">por atleta</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Vagas Totais</p>
                                                        <p className="text-lg font-bold">{nextBatch.max_slots}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Receita Potencial</p>
                                                        <p className="text-lg font-bold">
                                                            R$ {((nextBatch.price || 0) * nextBatch.max_slots).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Tabela de Todos os Lotes */}
                        {batches.length > 0 && (
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle>Resumo de Todos os Lotes</CardTitle>
                                    <CardDescription>Visão completa de todos os lotes de inscrição</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Lote</TableHead>
                                                <TableHead>Preço</TableHead>
                                                <TableHead>Vendas</TableHead>
                                                <TableHead>Vagas Rest.</TableHead>
                                                <TableHead>Receita</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batches.map((batch) => (
                                                <TableRow key={batch.id}>
                                                    <TableCell className="font-medium">
                                                        {batch.name}
                                                        <div className="text-xs text-muted-foreground">
                                                            {new Date(batch.start_date).toLocaleDateString('pt-BR')} –{' '}
                                                            {new Date(batch.end_date).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>R$ {(batch.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell>
                                                        {batch.approvedSales}/{batch.max_slots}
                                                        <div className="text-xs text-muted-foreground">{batch.occupancy}%</div>
                                                    </TableCell>
                                                    <TableCell>{batch.remaining}</TableCell>
                                                    <TableCell>R$ {batch.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell><Badge variant={batch.statusColor}>{batch.status}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/50 font-bold">
                                                <TableCell>TOTAL</TableCell>
                                                <TableCell>—</TableCell>
                                                <TableCell>
                                                    {batches.reduce((s, b) => s + b.approvedSales, 0)}/
                                                    {batches.reduce((s, b) => s + b.max_slots, 0)}
                                                </TableCell>
                                                <TableCell>{batches.reduce((s, b) => s + b.remaining, 0)}</TableCell>
                                                <TableCell>
                                                    R$ {batches.reduce((s, b) => s + b.revenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>—</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tabela de inscrições */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Inscrições e Pagamentos</CardTitle>
                                    <CardDescription>Gerencie todas as inscrições do campeonato</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedRows.size > 0 && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => sendCartRecovery(Array.from(selectedRows))}
                                            disabled={sendingRecovery.size > 0}
                                        >
                                            {sendingRecovery.size > 0
                                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                : <Mail className="mr-2 h-4 w-4" />}
                                            Enviar Recuperação ({selectedRows.size})
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar CSV
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 mb-6">
                                    <Input
                                        placeholder="Buscar por nome ou email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="max-w-sm"
                                    />
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="approved">Aprovado</SelectItem>
                                            <SelectItem value="pending">Pendente</SelectItem>
                                            <SelectItem value="cancelled">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10">
                                                    <Checkbox
                                                        checked={
                                                            filteredRegistrations.filter(r => r.payment_status === 'pending').length > 0 &&
                                                            filteredRegistrations.filter(r => r.payment_status === 'pending').every(r => selectedRows.has(r.id))
                                                        }
                                                        onCheckedChange={(checked) => {
                                                            const pending = filteredRegistrations.filter(r => r.payment_status === 'pending').map(r => r.id);
                                                            setSelectedRows(checked ? new Set(pending) : new Set());
                                                        }}
                                                        aria-label="Selecionar todos pendentes"
                                                    />
                                                </TableHead>
                                                <TableHead>Atleta/Time</TableHead>
                                                <TableHead>Categoria</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Método</TableHead>
                                                <TableHead>Parcelas</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingDashboard ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-24 text-center">Carregando...</TableCell>
                                                </TableRow>
                                            ) : filteredRegistrations.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-24 text-center">Nenhuma inscrição encontrada</TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredRegistrations.map(reg => (
                                                    <TableRow key={reg.id} className={selectedRows.has(reg.id) ? 'bg-muted/40' : ''}>
                                                        <TableCell>
                                                            {reg.payment_status === 'pending' ? (
                                                                <Checkbox
                                                                    checked={selectedRows.has(reg.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        setSelectedRows(prev => {
                                                                            const next = new Set(prev);
                                                                            checked ? next.add(reg.id) : next.delete(reg.id);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    aria-label={`Selecionar ${reg.athlete_name}`}
                                                                />
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{reg.athlete_name}</div>
                                                            <div className="text-xs text-muted-foreground">{reg.athlete_email}</div>
                                                        </TableCell>
                                                        <TableCell>{reg.categories?.name}</TableCell>
                                                        <TableCell>{getStatusBadge(reg.payment_status)}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(reg.subtotal_cents)}</TableCell>
                                                        <TableCell className="text-muted-foreground">{new Date(reg.created_at).toLocaleDateString("pt-BR")}</TableCell>
                                                        <TableCell>
                                                            {reg.payment_method === 'pix' && '💳 PIX'}
                                                            {reg.payment_method === 'credit_card' && '💳 Cartão'}
                                                            {reg.payment_method === 'boleto' && '📄 Boleto'}
                                                            {reg.payment_method === 'cash' && '💵 Dinheiro'}
                                                            {reg.payment_method === 'free' && '🎁 Cortesia'}
                                                            {!reg.payment_method && '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {reg.payment_method === 'credit_card'
                                                                ? `${reg.installments || 1}x`
                                                                : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {reg.payment_status === 'pending' && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title="Enviar email de recuperação"
                                                                    disabled={sendingRecovery.has(reg.id)}
                                                                    onClick={() => sendCartRecovery([reg.id])}
                                                                >
                                                                    {sendingRecovery.has(reg.id)
                                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                        : <Send className="h-4 w-4" />}
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* === TAB 2: CONFIGURAÇÕES === */}
                    <TabsContent value="settings" className="space-y-6 mt-6">

                        {showColumnError && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    <p className="font-semibold mb-2">⚠️ Coluna pix_payload não encontrada no banco de dados</p>
                                    <p className="mb-3">Como você é um organizador, pode ser necessário atualizar o esquema do banco. Execute este SQL no Supabase Dashboard:</p>
                                    <div className="bg-muted p-3 rounded-md mb-3">
                                        <code className="text-xs break-all text-destructive">
                                            ALTER TABLE public.championships ADD COLUMN IF NOT EXISTS pix_payload TEXT;
                                        </code>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 text-sm">
                                        <li>Acesse o <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a></li>
                                        <li>Vá em <strong>SQL Editor</strong></li>
                                        <li>Cole o comando SQL acima e clique em <strong>Run</strong></li>
                                        <li>Recarregue esta página</li>
                                    </ol>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* ASAAS CONFIG */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Recebimento via Cartão/Boleto (Asaas)
                                </CardTitle>
                                <CardDescription>
                                    Configure sua integração com o Asaas para receber pagamentos via Cartão de Crédito e Boleto.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="walletId">ID da Carteira (Wallet ID)</Label>
                                    <Input
                                        id="walletId"
                                        placeholder="Ex: 66367373-7373-7373-7373-737373737373"
                                        value={asaasWalletId}
                                        onChange={(e) => setAsaasWalletId(e.target.value)}
                                        className="font-mono"
                                    />
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p>Para obter seu Wallet ID:</p>
                                        <ol className="list-decimal list-inside pl-2">
                                            <li>Acesse sua conta Asaas.</li>
                                            <li>Vá em <strong>Minha Conta &gt; Integração</strong>.</li>
                                            <li>Procure pelo campo "Wallet ID".</li>
                                        </ol>
                                        <div className="pt-2">
                                            <a href="https://www.asaas.com/" target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                                Não tem conta Asaas? Crie aqui <ExternalLink className="w-3 h-3 ml-1" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PIX CONFIG REMOVED */}

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveSettings} disabled={savingSettings || loadingSettings}>
                                {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Todas as Configurações
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
