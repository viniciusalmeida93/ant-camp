import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Trophy, User, LogOut, LayoutDashboard, Menu } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PublicHeader() {
    const navigate = useNavigate();
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
        if (data) setProfile(data);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-[#0f172a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f172a]/60 text-white">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Left: Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <img
                        src="/logohorizontal.webp"
                        alt="AntCamp"
                        className="h-8 w-auto"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerText = 'AntCamp';
                        }}
                    />
                </Link>

                {/* Right: Auth Actions */}
                {/* Right: Auth Actions */}
                <div className="flex items-center gap-4">
                    {session ? (
                        <>
                            {/* Desktop View: Explicit Text Links */}
                            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                                <Link to="/dashboard" className="flex items-center gap-2 transition-colors hover:text-[#D71C1D]">
                                    Área do Organizador
                                </Link>
                                <Link to="/athlete-dashboard" className="flex items-center gap-2 transition-colors hover:text-[#D71C1D]">
                                    Área do Atleta
                                </Link>
                                <a href="mailto:contato@antcamp.com.br" className="flex items-center gap-2 transition-colors hover:text-[#D71C1D]">
                                    Contato
                                </a>
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="text-white hover:bg-white/10 hover:text-white"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sair
                                </Button>
                            </nav>

                            {/* Mobile View: Hamburger Menu */}
                            <div className="md:hidden">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                                            <Menu className="w-6 h-6" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 bg-[#0f172a] border-[#1e293b] text-white" align="end">
                                        <DropdownMenuLabel>
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{profile?.full_name || "Usuário"}</p>
                                                <p className="text-xs leading-none text-muted-foreground">
                                                    {session.user.email}
                                                </p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-[#1e293b]" />

                                        <DropdownMenuItem onClick={() => navigate("/dashboard")} className="focus:bg-[#1e293b] focus:text-white cursor-pointer">
                                            <span>Área do Organizador</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => navigate("/athlete-dashboard")} className="focus:bg-[#1e293b] focus:text-white cursor-pointer">
                                            <span>Área do Atleta</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild className="focus:bg-[#1e293b] focus:text-white cursor-pointer">
                                            <a href="mailto:contato@antcamp.com.br" className="flex items-center w-full">
                                                <span>Contato</span>
                                            </a>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator className="bg-[#1e293b]" />
                                        <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-400 focus:bg-[#1e293b] cursor-pointer">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Sair</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <a href="mailto:contato@antcamp.com.br" className="text-sm font-medium hover:text-[#D71C1D] transition-colors hidden md:block">
                                Contato
                            </a>
                            <Button
                                variant="ghost"
                                className="text-white hover:bg-white/10 hover:text-white"
                                onClick={() => navigate("/auth?mode=login")}
                            >
                                Login
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
