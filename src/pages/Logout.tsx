import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Logout() {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                await supabase.auth.signOut();
                // Clear anything else if needed, e.g. custom localStorage items
                // We keep 'rememberedEmail' probably, but clear session stuff.
                // Supabase client handles one part, but we can be extra safe:
                // localStorage.removeItem('sb-jxuhmqctiyeheamhviob-auth-token'); // If we knew the key name
                localStorage.removeItem('selectedChampionship');
            } catch (error) {
                console.error("Error signing out:", error);
            } finally {
                // Navigate to auth after a small delay to ensure state propagation
                setTimeout(() => {
                    navigate("/auth", { replace: true });
                }, 500);
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
