
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, User } from "lucide-react";

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: any;
    onProfileUpdate: () => void;
}

export function ProfileDialog({ open, onOpenChange, user, onProfileUpdate }: ProfileDialogProps) {
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [cpf, setCpf] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (open && user) {
            loadProfile();
        }
    }, [open, user]);

    async function loadProfile() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("full_name, phone, cpf, avatar_url, birth_date")
                .eq("id", user.id)
                .single();

            if (error) {
                // Se não achar perfil, tenta usar metadados do user auth se tiver
                setFullName(user.user_metadata?.full_name || "");
            } else if (data) {
                // @ts-ignore
                setFullName(data.full_name || "");
                // @ts-ignore
                setPhone(data.phone || "");
                // @ts-ignore
                setCpf(data.cpf || "");
                // @ts-ignore
                setBirthDate(data.birth_date || "");
                // @ts-ignore
                setAvatarUrl(data.avatar_url);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    }

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullName || !phone || !cpf || !birthDate) {
            toast.error("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        // Validação de senha se preenchido
        if (newPassword) {
            if (newPassword.length < 6) {
                toast.error("A nova senha deve ter pelo menos 6 caracteres.");
                return;
            }
            if (newPassword !== confirmPassword) {
                toast.error("As senhas não coincidem.");
                return;
            }
        }

        setLoading(true);

        try {
            // 1. Atualizar Perfil
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    phone: phone,
                    cpf: cpf,
                    birth_date: birthDate,
                    avatar_url: avatarUrl,
                    email: user.email
                });

            if (profileError) throw profileError;

            // 2. Atualizar Senha se informado
            if (newPassword) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: newPassword
                });
                if (authError) throw authError;
            }

            toast.success("Perfil atualizado com sucesso!");
            setNewPassword("");
            setConfirmPassword("");
            onProfileUpdate();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + (error.message || "Erro desconhecido"));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Você deve selecionar uma imagem para upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            setAvatarUrl(data.publicUrl);
            toast.success("Imagem carregada! Clique em Salvar para confirmar.");

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">

                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer w-24 h-24">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 text-muted-foreground" />
                                    )}
                                </div>
                                <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                    <Upload className="w-6 h-6" />
                                </label>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                />
                            </div>
                            {uploading && <span className="text-xs text-muted-foreground animate-pulse">Carregando imagem...</span>}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input
                                        id="cpf"
                                        value={cpf}
                                        onChange={(e) => setCpf(e.target.value)}
                                        disabled={!!user?.user_metadata?.cpf || (!!cpf && cpf.length > 0)} // Disabled if exists
                                        className={!!cpf ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                                        title={!!cpf ? "O CPF não pode ser alterado." : "Digite seu CPF"}
                                        placeholder="000.000.000-00"
                                        required
                                    />
                                    {!!cpf && <span className="text-[10px] text-muted-foreground">CPF não pode ser alterado.</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Data de Nascimento</Label>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="pt-4 border-t border-border mt-4">
                                <h4 className="text-sm font-semibold mb-3">Alterar Senha (Opcional)</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">Nova Senha</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repita a nova senha"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={uploading}>
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
