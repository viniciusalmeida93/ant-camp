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
    ExternalLink
} from "lucide-react";

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
            formatPrice(r.subtotal_cents),
            formatPrice(r.platform_fee_cents),
            formatPrice(r.subtotal_cents), // Simplificado
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

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
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
        return formatPrice(coupon.discount_value);
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
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatPrice(stats.totalGross)}</div>
                                    <p className="text-xs text-muted-foreground">{stats.approvedCount} pagamentos confirmados</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Taxas (5%)</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatPrice(stats.totalFees)}</div>
                                    <p className="text-xs text-muted-foreground">Taxa da plataforma</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Líquido</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatPrice(stats.totalNet)}</div>
                                    <p className="text-xs text-muted-foreground">Seu total líquido</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs space-y-1">
                                        <div className="flex justify-between"><span>Aprovados:</span> <span className="font-medium">{stats.approvedCount}</span></div>
                                        <div className="flex justify-between"><span>Pendentes:</span> <span className="font-medium">{stats.pendingCount}</span></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Inscrições e Pagamentos</CardTitle>
                                    <CardDescription>Gerencie todas as inscrições do campeonato</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={exportToCSV}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Exportar CSV
                                </Button>
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
                                                <TableHead>Atleta/Time</TableHead>
                                                <TableHead>Categoria</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                                <TableHead>Data</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingDashboard ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">Carregando...</TableCell>
                                                </TableRow>
                                            ) : filteredRegistrations.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">Nenhuma inscrição encontrada</TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredRegistrations.map(reg => (
                                                    <TableRow key={reg.id}>
                                                        <TableCell>
                                                            <div className="font-medium">{reg.athlete_name}</div>
                                                            <div className="text-xs text-muted-foreground">{reg.athlete_email}</div>
                                                        </TableCell>
                                                        <TableCell>{reg.categories?.name}</TableCell>
                                                        <TableCell>{getStatusBadge(reg.payment_status)}</TableCell>
                                                        <TableCell className="text-right">{formatPrice(reg.subtotal_cents)}</TableCell>
                                                        <TableCell className="text-muted-foreground">{new Date(reg.created_at).toLocaleDateString("pt-BR")}</TableCell>
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
                                <AlertDescription>Erro de configuração no banco de dados. Contate o suporte.</AlertDescription>
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
