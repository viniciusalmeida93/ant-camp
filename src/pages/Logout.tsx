import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Logout() {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                // 1. Tentar fazer logout no Supabase PRIMEIRO (ele precisa do token para isso)
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error("Supabase signOut error, forcing local clear", error);
                }
            } catch (error) {
                console.error("Error during sign out:", error);
            } finally {
                // 2. Limpeza agressiva local como fallback e complemento
                localStorage.removeItem('selectedChampionship');

                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                        localStorage.removeItem(key);
                    }
                });

                // 3. Redirecionar forçando reload real
                window.location.href = "/auth";
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
