import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, Trophy, LogOut, User, Pencil } from "lucide-react";
import { toast } from "sonner";

import { ProfileDialog } from "@/components/ProfileDialog";

export default function AthleteDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);

    // New States
    const [profileOpen, setProfileOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/auth");
            return;
        }
        setUser(session.user);
        loadProfileStats(session.user.id);
        loadRegistrations(session.user);
    };

    const loadProfileStats = async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", userId)
            .single();

        if (data) setAvatarUrl(data.avatar_url);
    };

    const loadRegistrations = async (currentUser: any) => {
        try {
            let query = supabase
                .from("registrations")
                .select(`
          *,
          championships (
            name,
            date,
            location,
            slug,
            link_pages (
              banner_url
            )
          ),
          categories (
            name,
            format
          )
        `)
                .order("created_at", { ascending: false });

            const { data, error } = await query.or(`user_id.eq.${currentUser.id},athlete_email.eq.${currentUser.email}`);

            if (error) throw error;
            if (error) throw error;

            // Deduplicate by ID
            const uniqueRegistrations = Array.from(new Map(data?.map(item => [item['id'], item])).values());
            setRegistrations(uniqueRegistrations || []);
        } catch (error: any) {
            console.error("Erro ao carregar inscrições:", error);
            toast.error("Erro ao carregar suas inscrições");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "default";
            case "pending":
                return "secondary";
            case "cancelled":
                return "destructive";
            default:
                return "outline";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "approved":
                return "Confirmado";
            case "pending":
                return "Pendente";
            case "cancelled":
                return "Cancelado";
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <ProfileDialog
                open={profileOpen}
                onOpenChange={setProfileOpen}
                user={user}
                onProfileUpdate={() => checkAuth()}
            />

            {/* Header */}
            <div className="border-b bg-[#0f172a] text-white">
                <div className="w-full mx-auto px-6 py-4 max-w-[98%]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setProfileOpen(true)}>
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted/10 flex items-center justify-center">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-white" />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                                    <Pencil className="w-3 h-3 text-black" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Área do Atleta</h1>
                                <p className="text-sm text-gray-400">
                                    Bem-vindo, {user?.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:text-white hover:bg-white/10"
                                onClick={() => navigate("/dashboard")}
                            >
                                <span className="hidden md:inline">Área do Organizador</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full mx-auto px-6 py-8 max-w-[98%]">
                {registrations.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <Trophy className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Nenhuma inscrição encontrada</h3>
                            <p className="text-muted-foreground mb-6">
                                Você ainda não se inscreveu em nenhum campeonato.
                            </p>
                            {/* Aqui poderia ter um link para "Buscar Eventos" se houvesse uma página pública de lista */}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {registrations.map((reg) => (
                            <Card key={reg.id} className="group overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-300">
                                {/* Banner Area */}
                                <div className="relative h-32 w-full bg-muted">
                                    {/* Helper to get banner URL safely */}
                                    {(() => {
                                        const bannerUrl =
                                            // @ts-ignore
                                            reg.championships?.link_pages?.[0]?.banner_url ||
                                            // @ts-ignore
                                            reg.championships?.link_pages?.banner_url;

                                        if (bannerUrl) {
                                            return (
                                                <img
                                                    src={bannerUrl}
                                                    alt={reg.championships?.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={getStatusColor(reg.payment_status)} className="shadow-sm border-0">
                                            {getStatusLabel(reg.payment_status)}
                                        </Badge>
                                    </div>
                                </div>

                                <CardContent className="p-5 pt-4 relative">
                                    {/* Championship Name */}
                                    <h3 className="text-lg font-bold text-card-foreground leading-tight mb-1 line-clamp-1">
                                        {reg.championships?.name || "Campeonato Desconhecido"}
                                    </h3>

                                    {/* Category & Athlete/Team */}
                                    <div className="text-muted-foreground text-sm font-medium mb-4">
                                        <p className="line-clamp-1 text-[#D71C1D] font-semibold">{reg.categories?.name}</p>
                                        <p className="line-clamp-1 text-xs opacity-80">{reg.team_name || reg.athlete_name}</p>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 text-sm text-muted-foreground/80 mb-5">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary/70" />
                                            <span>
                                                {reg.championships?.date
                                                    ? new Date(reg.championships.date).toLocaleDateString('pt-BR')
                                                    : "Data não definida"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-primary/70" />
                                            <span className="line-clamp-1">
                                                {reg.championships?.location || "Local não definido"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {/* Botão para Checkout se pendente */}
                                        {reg.payment_status !== 'approved' && (
                                            <Button
                                                className="w-full bg-[#D71C1D] hover:bg-[#b01617] text-white font-bold shadow-md"
                                                onClick={() => navigate(`/checkout/${reg.id}`)}
                                            >
                                                Finalizar Inscrição
                                            </Button>
                                        )}

                                        {/* Botão para Leaderboard se aprovado */}
                                        {reg.payment_status === 'approved' && reg.championships?.slug && (
                                            <Button
                                                variant="outline"
                                                className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                                                onClick={() => navigate(`/${reg.championships.slug}/leaderboard`)}
                                            >
                                                Ver Leaderboard
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
