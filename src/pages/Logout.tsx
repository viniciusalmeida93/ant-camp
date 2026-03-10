import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Logout() {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                // 1. Limpar dados específicos do App e Supabase primeiro
                localStorage.removeItem('selectedChampionship');

                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });

                // 2. Tentar fazer logout no Supabase
                const { error } = await supabase.auth.signOut();
                if (error) throw error;

            } catch (error) {
                console.error("Error signing out:", error);
            } finally {
                // 4. Force reload para garantir que status de memória mudem
                // Usando window.location.href para forçar recarregamento real da página
                // Isso mata qualquer estado React residual
                setTimeout(() => {
                    window.location.href = "/auth";
                }, 100);
            }
        };

        performLogout();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Saindo...</p>
            </div>
        </div>
    );
}
