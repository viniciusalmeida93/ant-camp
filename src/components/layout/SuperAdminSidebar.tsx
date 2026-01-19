import { Link, useLocation } from 'react-router-dom';
import {
    Trophy,
    Users,
    Settings,
    DollarSign,
    Menu,
    X,
    LayoutDashboard,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const navItems = [
    { path: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/super-admin/fees', label: 'Taxas & Faturamento', icon: DollarSign },
    { path: '/super-admin/organizers', label: 'Organizadores', icon: Users },
    { path: '/super-admin/championships', label: 'Campeonatos', icon: Trophy },
    { path: '/super-admin/settings', label: 'Configurações', icon: Settings },
];

export const SuperAdminSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-sm bg-[#051C2C] border border-[#1F3342] text-[#FAFAFA] shadow-md hover:bg-[#1F3342] transition-colors"
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <Menu className="w-6 h-6" />
                )}
            </button>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 h-full w-64 bg-[#051C2C] border-r border-[#1F3342] z-40 transition-transform duration-300",
                    "lg:translate-x-0",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-[#1F3342] flex flex-col gap-2">
                        <Link to="/super-admin" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                            <img
                                src="/logohorizontal.webp"
                                alt="AntCamp"
                                className="h-10 w-auto"
                            />
                        </Link>
                        <span className="text-xs font-bold text-[#D71C1D] uppercase tracking-wider px-1">Super Admin</span>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <div className="flex flex-col gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 text-sm",
                                            isActive
                                                ? "bg-[#D71C1D] text-white font-semibold"
                                                : "hover:bg-[#1F3342] text-[#D9D9D9] hover:text-[#FAFAFA]"
                                        )}
                                    >
                                        <Icon className="w-5 h-5 shrink-0" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* User / Logout section removed as requested */}
                    <div className="p-4 border-t border-[#1F3342] opacity-0 pointer-events-none">
                        {/* Hidden spacing to keep layout structure if needed, or just remove */}
                    </div>

                </div>
            </aside>
        </>
    );
};
