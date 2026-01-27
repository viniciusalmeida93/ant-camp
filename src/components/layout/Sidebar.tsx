import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Users, Dumbbell, ClipboardList, Settings, Calculator, Award, Grid, Menu, X, CreditCard, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/app', label: 'Dashboard', icon: Trophy },
  { path: '/scoring', label: 'Pontuação', icon: Settings },
  { path: '/categories', label: 'Categorias', icon: Users },
  { path: '/wods', label: 'Eventos', icon: Dumbbell },
  { path: '/registrations', label: 'Inscrições', icon: ClipboardList },
  { path: '/heats', label: 'Baterias', icon: Grid },
  { path: '/results', label: 'Resultados', icon: Calculator },
  { path: '/leaderboard', label: 'Leaderboard', icon: Award },
  { path: '/payments', label: 'Pagamento', icon: CreditCard },
  { path: '/coupons', label: 'Cupons', icon: Ticket },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (data) {
          setRoles(data.map(r => r.role));
        }

        // Fallback para organizadores legados (dono de algum campeonato)
        const { count } = await supabase
          .from('championships')
          .select('id', { count: 'exact', head: true })
          .eq('organizer_id', session.user.id);

        if (count && count > 0 && !roles.includes('organizer')) {
          setRoles(prev => [...prev, 'organizer']);
        }
      }
      setLoading(false);
    };

    fetchRoles();
  }, []);

  const isSuperAdmin = roles.includes('super_admin');
  const isOrganizer = roles.includes('organizer') || isSuperAdmin;

  const filteredNavItems = navItems.filter(item => {
    // Todos podem ver Leaderboard (se estiverem na aba app)
    // Mas para simplicidade, se for atleta, ele cairá em /athlete-dashboard que não usa essa sidebar
    // Mas se ele digitar /app, ele deve ver o dashboard dele
    return isOrganizer;
  });

  // Se super admin, adicionar links extras (opcional, já que eles acessam via layout próprio, 
  // mas é bom ter no menu geral se estiverem no dashboard)
  const superAdminItems = isSuperAdmin ? [
    { path: '/super-admin', label: 'Super Admin', icon: Settings },
  ] : [];

  const finalItems = [...filteredNavItems, ...superAdminItems];

  if (loading) return null;

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
          <div className="p-6 border-b border-[#1F3342]">
            <Link to="/app" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
              <img
                src="/logohorizontal.webp"
                alt="AntCamp"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-1">
              {finalItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path !== '/app' && location.pathname.startsWith(item.path));

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

        </div>
      </aside>
    </>
  );
};

