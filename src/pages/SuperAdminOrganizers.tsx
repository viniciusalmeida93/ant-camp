import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrganizerStats {
    organizer_id: string;
    organizer_email: string;
    organizer_name: string | null;
    total_championships: number;
    total_registrations: number;
    paid_payments: number;
    total_revenue_cents: number;
}

export default function SuperAdminOrganizers() {
    const [loading, setLoading] = useState(true);
    const [organizers, setOrganizers] = useState<OrganizerStats[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creatingOrganizer, setCreatingOrganizer] = useState(false);

    // Form states
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgEmail, setNewOrgEmail] = useState("");
    const [newOrgPassword, setNewOrgPassword] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore - RPC might not be in types yet
            const { data: organizerData, error: orgError } = await supabase.rpc("get_organizer_stats" as any);

            if (orgError) {
                console.error("Error calling RPC:", orgError);
                toast.error("Erro ao carregar dados dos organizadores");
                return;
            }

            if (organizerData) {
                setOrganizers(organizerData as any as OrganizerStats[]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrganizer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName || !newOrgEmail || !newOrgPassword) {
            toast.error("Preencha todos os campos");
            return;
        }

        setCreatingOrganizer(true);
        try {
            const { data, error } = await supabase.functions.invoke("invite-organizer", {
                body: {
                    email: newOrgEmail,
                    fullName: newOrgName,
                    password: newOrgPassword
                }
            });

            if (error) throw error;

            toast.success("Organizador criado e e-mail enviado com sucesso!");
            setIsCreateModalOpen(false);
            setNewOrgName("");
            setNewOrgEmail("");
            setNewOrgPassword("");
            loadData();
        } catch (error: any) {
            console.error("Error creating organizer:", error);
            toast.error("Erro ao criar organizador: " + (error.message || "Erro desconhecido"));
        } finally {
            setCreatingOrganizer(false);
        }
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Organizadores</h1>
                    <p className="text-sm text-muted-foreground">
                        Lista de todos os organizadores cadastrados na plataforma e seus desempenhos.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Organizadores e Faturamento</CardTitle>
                    <CardDescription>
                        Detalhamento por organizador
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {organizers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum organizador encontrado
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Organizador</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Campeonatos</TableHead>
                                        <TableHead>Inscrições</TableHead>
                                        <TableHead>Pagamentos</TableHead>
                                        <TableHead className="text-right">Faturamento Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {organizers.map((org) => (
                                        <TableRow key={org.organizer_id}>
                                            <TableCell className="font-medium">
                                                {org.organizer_name || "Sem nome"}
                                            </TableCell>
                                            <TableCell>{org.organizer_email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{org.total_championships}</Badge>
                                            </TableCell>
                                            <TableCell>{org.total_registrations}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{org.paid_payments}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(org.total_revenue_cents)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Floating Action Button */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                    <Button
                        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-2xl bg-[#D71C1D] hover:bg-[#b01617] text-white p-0 flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-95"
                        aria-label="Cadastrar Novo Organizador"
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cadastrar Novo Organizador</DialogTitle>
                        <DialogDescription>
                            O novo organizador receberá um e-mail com as credenciais de acesso.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateOrganizer} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input
                                id="name"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                placeholder="Ex: João Silva"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newOrgEmail}
                                onChange={(e) => setNewOrgEmail(e.target.value)}
                                placeholder="organizador@email.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha Inicial</Label>
                            <Input
                                id="password"
                                type="text"
                                value={newOrgPassword}
                                onChange={(e) => setNewOrgPassword(e.target.value)}
                                placeholder="Defina uma senha segura"
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsCreateModalOpen(false)}
                                disabled={creatingOrganizer}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#D71C1D] hover:bg-[#b01617] text-white"
                                disabled={creatingOrganizer}
                            >
                                {creatingOrganizer ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Criando...
                                    </>
                                ) : (
                                    "Criar e Notificar"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
