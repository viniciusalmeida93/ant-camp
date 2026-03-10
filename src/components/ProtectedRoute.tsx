import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [fallbackRoute, setFallbackRoute] = useState("/auth");
    const location = useLocation();

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setLoading(false);
                    return;
                }

                // Se não exige role específica, qualquer logado (mesmo sem roles na tabela) tem acesso (ex: Atleta recém criado)
                if (!allowedRoles || allowedRoles.length === 0) {
                    setHasAccess(true);
                    setLoading(false);
                    return;
                }

                const { data: roles } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", session.user.id);

                const userRoles = roles?.map(r => r.role) || [];

                // Definir fallback baseado nas roles que ele POSSUI, para não voltar pra /auth sendo que está logado
                if (userRoles.includes('super_admin')) {
                    setFallbackRoute('/super-admin');
                } else if (userRoles.includes('organizer')) {
                    setFallbackRoute('/dashboard');
                } else {
                    setFallbackRoute('/athlete-dashboard'); // everyone else is an athlete or guest
                }

                const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));

                // Permite super_admin acessar (quase) tudo do organizador, se quiser.
                if (hasRequiredRole || (allowedRoles.includes('organizer') && userRoles.includes('super_admin'))) {
                    setHasAccess(true);
                }
            } catch (error) {
                console.error("Erro varrendo permissoes na rota", error);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [allowedRoles, location.pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasAccess) {
        // Evita loop infinito se jogar pra uma tela que ele não tem e ele tentar carregar
        if (location.pathname === fallbackRoute) {
            return <Navigate to="/auth" replace />;
        }
        return <Navigate to={fallbackRoute} replace />;
    }

    return <>{children}</>;
}
