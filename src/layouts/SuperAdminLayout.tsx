import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminSidebar } from "@/components/layout/SuperAdminSidebar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminLayout() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/auth");
            return;
        }

        const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "super_admin")
            .maybeSingle();

        if (!roles) {
            toast.error("Acesso negado. Área restrita.");
            navigate("/dashboard");
            return;
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex">
            <SuperAdminSidebar />
            <main className="flex-1 lg:ml-64 p-6 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
