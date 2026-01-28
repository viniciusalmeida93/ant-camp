import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Trophy, Users, Calendar, ArrowRight, Home } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { motion } from "framer-motion";

export default function RegistrationSuccess() {
    const { registrationId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [registration, setRegistration] = useState<any>(null);

    useEffect(() => {
        if (registrationId) {
            loadRegistration();
        }
    }, [registrationId]);

    const loadRegistration = async () => {
        try {
            const { data, error } = await supabase
                .from("registrations")
                .select("*, categories(*), championships(*)")
                .eq("id", registrationId)
                .single();

            if (error) throw error;
            setRegistration(data);
        } catch (error) {
            console.error("Error loading registration:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!registration) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <h2 className="text-xl font-bold mb-2">Inscrição não encontrada</h2>
                        <p className="text-muted-foreground mb-6">Não conseguimos localizar os detalhes da sua inscrição.</p>
                        <Button onClick={() => navigate("/")} className="w-full">
                            Voltar ao Início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
            <PublicHeader />

            <main className="flex-1 flex items-center justify-center p-4 py-12">
                <div className="max-w-2xl w-full space-y-8">
                    {/* Success Animation & Header */}
                    <div className="text-center space-y-4">
                        <motion.div
                            initial={{ scale: 0, shadow: "0px 0px 0px rgba(0,0,0,0)" }}
                            animate={{ scale: 1, shadow: "0px 10px 40px rgba(22, 163, 74, 0.2)" }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 mb-2 relative"
                        >
                            <CheckCircle2 className="w-14 h-14 text-green-500" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1.2 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="absolute inset-0 rounded-full border-4 border-green-500/20"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h1 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
                                Inscrição <span className="text-primary">Confirmada!</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-md mx-auto mt-2">
                                Parabéns, {registration.athlete_name}! Sua vaga está garantida no {registration.championships.name}.
                            </p>
                        </motion.div>
                    </div>

                    {/* Registration Details Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="border-border/50 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
                            <div className="h-2 bg-primary w-full" />
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-lg bg-primary/5 text-primary">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Campeonato</p>
                                                <p className="font-semibold text-lg leading-tight">{registration.championships.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-lg bg-primary/5 text-primary">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Categoria</p>
                                                <p className="font-semibold text-lg leading-tight">{registration.categories.name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-lg bg-primary/5 text-primary">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Data do Evento</p>
                                                <p className="font-semibold text-lg leading-tight">
                                                    {new Date(registration.championships.date).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        {registration.team_name && (
                                            <div className="flex items-start gap-4">
                                                <div className="p-2.5 rounded-lg bg-primary/5 text-primary">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Equipe</p>
                                                    <p className="font-semibold text-lg leading-tight">{registration.team_name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border/50">
                                    <div className="bg-muted/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="text-center md:text-left">
                                            <p className="text-xs font-medium text-muted-foreground">Status do Pagamento</p>
                                            <p className="text-sm font-bold text-green-500 uppercase flex items-center gap-1.5 mt-0.5">
                                                <CheckCircle2 className="w-4 h-4" /> Aprovado
                                            </p>
                                        </div>
                                        <div className="text-center md:text-right">
                                            <p className="text-xs font-medium text-muted-foreground">Código da Inscrição</p>
                                            <p className="text-sm font-mono font-medium mt-0.5">#{registration.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-4 items-center justify-center"
                    >
                        <Button
                            size="lg"
                            className="w-full sm:w-auto px-8 h-12 text-base font-bold"
                            onClick={() => navigate("/athlete-dashboard")}
                        >
                            Meu Painel de Atleta
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto px-8 h-12 text-base font-bold bg-background/50"
                            onClick={() => navigate(`/links/${registration.championships.slug}`)}
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Página do Evento
                        </Button>
                    </motion.div>

                    <p className="text-center text-xs text-muted-foreground mt-8">
                        Enviamos um e-mail de confirmação para sua caixa de entrada.
                    </p>
                </div>
            </main>
        </div>
    );
}
