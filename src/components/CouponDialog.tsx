import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Coupon, CouponFormData } from "@/types/coupon";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency } from "@/lib/utils";

interface CouponDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupon?: Coupon | null;
    championshipId: string;
    onSuccess: () => void;
}

export function CouponDialog({ open, onOpenChange, coupon, championshipId, onSuccess }: CouponDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CouponFormData>({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        max_uses: null,
        expires_at: "",
        is_active: true,
    });

    useEffect(() => {
        if (coupon) {
            setFormData({
                code: coupon.code,
                description: coupon.description || "",
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                max_uses: coupon.max_uses,
                expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : "",
                is_active: coupon.is_active,
            });
        } else {
            setFormData({
                code: "",
                description: "",
                discount_type: "percentage",
                discount_value: 0,
                max_uses: null,
                expires_at: "",
                is_active: true,
            });
        }
    }, [coupon, open]);



    const handleSubmit = async () => {
        // Validation
        if (!formData.code.trim()) {
            toast.error("Código do cupom é obrigatório");
            return;
        }

        if (formData.discount_value <= 0) {
            toast.error("Valor do cupom deve ser maior que zero");
            return;
        }

        if (formData.discount_type === "percentage" && formData.discount_value > 100) {
            toast.error("Desconto percentual não pode ser maior que 100%");
            return;
        }

        if (formData.expires_at) {
            const expirationDate = new Date(formData.expires_at);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (expirationDate < today) {
                toast.error("Data de expiração deve ser no futuro");
                return;
            }
        }

        setLoading(true);

        try {
            const couponData = {
                code: formData.code.trim().toUpperCase(),
                description: formData.description.trim() || null,
                discount_type: formData.discount_type,
                discount_value: formData.discount_value,
                championship_id: championshipId,
                max_uses: formData.max_uses,
                expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
                is_active: formData.is_active,
            };

            if (coupon) {
                // Update existing coupon
                const { error } = await supabase
                    .from("coupons")
                    .update(couponData)
                    .eq("id", coupon.id);

                if (error) throw error;
                toast.success("Cupom atualizado com sucesso!");
            } else {
                // Create new coupon
                const { error } = await supabase
                    .from("coupons")
                    .insert(couponData);

                if (error) {
                    // Check for unique violation (error code 23505) or explicit message
                    if (error.code === "23505" || error.message?.includes("duplicate") || error.details?.includes("already exists")) {
                        toast.error("O código deste cupom já está em uso neste ou em outro campeonato.");
                        return; // Stop execution here
                    }
                    throw error;
                }
                toast.success("Cupom criado com sucesso!");
            }

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error saving coupon:", error);
            toast.error("Erro ao salvar cupom: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{coupon ? "Editar cupom" : "Adicionar novo cupom"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Main Form Area */}
                    <div className="space-y-4">
                        {/* Código do cupom */}
                        <div className="space-y-2">
                            <Label htmlFor="code">Código do cupom</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="Ex: DESCONTO10"
                            />
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição (opcional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição do cupom"
                                rows={3}
                            />
                        </div>

                        {/* Dados do cupom (Direct Content, No Accordion) */}
                        <div className="bg-muted/30 rounded-lg border p-4">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium">Dados do cupom</h3>
                            </div>

                            <Tabs defaultValue="geral" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="geral">Geral</TabsTrigger>
                                    <TabsTrigger value="limites">Limites de uso</TabsTrigger>
                                </TabsList>

                                <TabsContent value="geral" className="space-y-4 mt-4">
                                    {/* Tipo de desconto */}
                                    <div className="space-y-2">
                                        <Label htmlFor="discount_type">Tipo de desconto</Label>
                                        <Select
                                            value={formData.discount_type}
                                            onValueChange={(value: "percentage" | "fixed") => {
                                                setFormData({ ...formData, discount_type: value, discount_value: 0 });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Desconto de porcentagem</SelectItem>
                                                <SelectItem value="fixed">Desconto Fixo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Valor do cupom */}
                                    <div className="space-y-2">
                                        <Label htmlFor="discount_value">Valor do cupom</Label>
                                        {formData.discount_type === 'fixed' ? (
                                            <CurrencyInput
                                                id="discount_value"
                                                valueCents={formData.discount_value}
                                                onChange={(cents) => setFormData({ ...formData, discount_value: cents })}
                                                placeholder="0,00"
                                            />
                                        ) : (
                                            <Input
                                                id="discount_value"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.discount_value}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                                                }
                                                placeholder="0-100"
                                            />
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {formData.discount_type === "percentage"
                                                ? "Porcentagem de desconto (0-100%)"
                                                : "Valor fixo"}
                                        </p>
                                    </div>

                                    {/* Data de expiração */}
                                    <div className="space-y-2">
                                        <Label htmlFor="expires_at">Data de expiração do cupom</Label>
                                        <Input
                                            id="expires_at"
                                            type="date"
                                            value={formData.expires_at}
                                            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="limites" className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="max_uses">Limite de uso</Label>
                                        <Input
                                            id="max_uses"
                                            type="number"
                                            min="0"
                                            value={formData.max_uses || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })
                                            }
                                            placeholder="Ilimitado"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Deixe em branco para uso ilimitado
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between w-full mt-6">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active" className="text-sm">
                            Status: {formData.is_active ? "Ativo" : "Rascunho"}
                        </Label>
                    </div>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {coupon ? "Atualizar" : "Publicar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
