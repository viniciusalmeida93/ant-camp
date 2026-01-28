import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChampionship } from "@/contexts/ChampionshipContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { CouponDialog } from "@/components/CouponDialog";
import { Coupon } from "@/types/coupon";
import { formatCurrency } from "@/lib/utils";

export default function Coupons() {
    const navigate = useNavigate();
    const { selectedChampionship } = useChampionship();

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [couponDialogOpen, setCouponDialogOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponSearchTerm, setCouponSearchTerm] = useState("");
    const [couponFilterType, setCouponFilterType] = useState("all");

    useEffect(() => {
        if (selectedChampionship) {
            loadCoupons();
        }
    }, [selectedChampionship]);

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
            setCoupons((data as any) || []);
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

    const handleEditCoupon = (coupon: Coupon) => {
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

    const formatCouponValue = (coupon: Coupon) => {
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
                        <CardDescription>Selecione um campeonato na sidebar para gerenciar cupons.</CardDescription>
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
                        <h1 className="text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
                        <p className="text-muted-foreground">{selectedChampionship.name}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Cupons de Desconto</CardTitle>
                            <CardDescription>Gerencie cupons de desconto para este campeonato</CardDescription>
                        </div>
                        <Button onClick={handleAddCoupon}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar novo cupom
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-6">
                            <Input
                                placeholder="Pesquisar cupons..."
                                value={couponSearchTerm}
                                onChange={(e) => setCouponSearchTerm(e.target.value)}
                                className="max-w-sm"
                            />
                            <Select value={couponFilterType} onValueChange={setCouponFilterType}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os tipos</SelectItem>
                                    <SelectItem value="percentage">Porcentagem</SelectItem>
                                    <SelectItem value="fixed">Fixo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Tipo de cupom</TableHead>
                                        <TableHead>Valor do cupom</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Uso / Limite</TableHead>
                                        <TableHead>Data de validade</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingCoupons ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredCoupons.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                {couponSearchTerm || couponFilterType !== "all"
                                                    ? "Nenhum cupom encontrado com os filtros aplicados"
                                                    : "Nenhum cupom criado ainda"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCoupons.map((coupon) => (
                                            <TableRow key={coupon.id}>
                                                <TableCell className="font-mono font-medium">
                                                    {coupon.code}
                                                    {!coupon.is_active && (
                                                        <Badge variant="outline" className="ml-2">Inativo</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {coupon.discount_type === "percentage"
                                                        ? "Desconto de porcentagem"
                                                        : "Desconto fixo de carrinho"}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCouponValue(coupon)}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {coupon.description || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {coupon.used_count} / {coupon.max_uses || "∞"}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {coupon.expires_at
                                                        ? new Date(coupon.expires_at).toLocaleDateString("pt-BR")
                                                        : "Sem expiração"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditCoupon(coupon)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteCoupon(coupon.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-4 text-sm text-muted-foreground">
                            {filteredCoupons.length} {filteredCoupons.length === 1 ? "item" : "itens"}
                        </div>
                    </CardContent>
                </Card>

                {/* Coupon Dialog */}
                <CouponDialog
                    open={couponDialogOpen}
                    onOpenChange={setCouponDialogOpen}
                    coupon={selectedCoupon}
                    championshipId={selectedChampionship.id}
                    onSuccess={loadCoupons}
                />
            </div>
        </div>
    );
}
