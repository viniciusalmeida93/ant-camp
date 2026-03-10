import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Mail, Edit, Trash2 } from "lucide-react";
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

    // Create state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creatingOrganizer, setCreatingOrganizer] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgEmail, setNewOrgEmail] = useState("");
    const [newOrgPassword, setNewOrgPassword] = useState("");

    // Edit state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrganizer, setEditingOrganizer] = useState(false);
    const [editOrgName, setEditOrgName] = useState("");
    const [editOrgEmail, setEditOrgEmail] = useState("");
    const [editOrgPassword, setEditOrgPassword] = useState("");
    const [selectedOrg, setSelectedOrg] = useState<OrganizerStats | null>(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingOrganizer, setDeletingOrganizer] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
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
            if (data?.error) throw new Error(data.error);

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

    const handleEditClick = (org: OrganizerStats) => {
        setSelectedOrg(org);
        setEditOrgName(org.organizer_name || "");
        setEditOrgEmail(org.organizer_email);
        setEditOrgPassword(""); // left blank intentionally
        setIsEditModalOpen(true);
    };

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrg || !editOrgName || !editOrgEmail) {
            toast.error("Preencha nome e email");
            return;
        }

        setEditingOrganizer(true);
        try {
            const { data, error } = await supabase.functions.invoke("edit-organizer", {
                body: {
                    userId: selectedOrg.organizer_id,
                    email: editOrgEmail,
                    fullName: editOrgName,
                    password: editOrgPassword // Optional
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success("Organizador editado com sucesso!");
            setIsEditModalOpen(false);
            loadData();
        } catch (error: any) {
            console.error("Error editing organizer:", error);
            toast.error("Erro ao editar organizador: " + (error.message || "Erro desconhecido"));
        } finally {
            setEditingOrganizer(false);
        }
    };

    const handleDeleteClick = (org: OrganizerStats) => {
        setSelectedOrg(org);
        setIsDeleteModalOpen(true);
    };

    const submitDelete = async () => {
        if (!selectedOrg) return;

        setDeletingOrganizer(true);
        try {
            const { data, error } = await supabase.functions.invoke("delete-organizer", {
                body: {
                    userId: selectedOrg.organizer_id
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success("Organizador removido com sucesso!");
            setIsDeleteModalOpen(false);
            loadData();
        } catch (error: any) {
            console.error("Error deleting organizer:", error);
            toast.error("Erro ao remover organizador: " + (error.message || "Erro desconhecido"));
        } finally {
            setDeletingOrganizer(false);
        }
    };

    const handleResendInvite = async (org: OrganizerStats) => {
        if (!confirm(`Deseja gerar nova senha e enviar por e-mail para ${org.organizer_name || org.organizer_email}?`)) return;

        toast.info("Processando reenvio de convite...");
        try {
            const { data, error } = await supabase.functions.invoke("resend-organizer-invite", {
                body: {
                    userId: org.organizer_id,
                    email: org.organizer_email,
                    fullName: org.organizer_name || "Organizador"
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            toast.success("Credenciais reenviadas com sucesso!");
        } catch (error: any) {
            console.error("Error resending invite:", error);
            toast.error("Erro ao reenviar credenciais: " + (error.message || "Erro desconhecido"));
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
                                        <TableHead className="text-right">Ações</TableHead>
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
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="✉️ Reenviar Acesso"
                                                        className="h-8 w-8"
                                                        onClick={() => handleResendInvite(org)}
                                                    >
                                                        <Mail className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="Editar"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEditClick(org)}
                                                    >
                                                        <Edit className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="Excluir"
                                                        className="h-8 w-8 hover:text-red-600"
                                                        onClick={() => handleDeleteClick(org)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
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
                        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white p-0 flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-95"
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
                                className="bg-primary hover:bg-primary/90 text-white"
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

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Organizador</DialogTitle>
                        <DialogDescription>
                            Atualize os dados de {selectedOrg?.organizer_name}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitEdit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome Completo</Label>
                            <Input
                                id="edit-name"
                                value={editOrgName}
                                onChange={(e) => setEditOrgName(e.target.value)}
                                placeholder="Ex: João Silva"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editOrgEmail}
                                onChange={(e) => setEditOrgEmail(e.target.value)}
                                placeholder="organizador@email.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">Nova Senha</Label>
                            <Input
                                id="edit-password"
                                type="text"
                                value={editOrgPassword}
                                onChange={(e) => setEditOrgPassword(e.target.value)}
                                placeholder="Deixe em branco para manter a atual"
                                minLength={6}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Preencha apenas se desejar forçar a troca de senha.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={editingOrganizer}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90 text-white"
                                disabled={editingOrganizer}
                            >
                                {editingOrganizer ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    "Salvar Alterações"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remover Organizador</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja remover <strong>{selectedOrg?.organizer_name}</strong>?
                            Esta ação excluirá o usuário de forma permanente e não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={deletingOrganizer}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={submitDelete}
                            disabled={deletingOrganizer}
                        >
                            {deletingOrganizer ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                "Remover Permanentemente"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
