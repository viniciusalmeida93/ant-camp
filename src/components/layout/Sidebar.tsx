import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, Dumbbell, ClipboardList, Settings, Calculator, Award, Grid, Menu, X, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { path: '/app', label: 'Dashboard', icon: Trophy },
  { path: '/categories', label: 'Categorias', icon: Users },
  { path: '/wods', label: 'WODs', icon: Dumbbell },
  { path: '/registrations', label: 'Inscrições', icon: ClipboardList },
  { path: '/scoring', label: 'Pontuação', icon: Settings },
  { path: '/results', label: 'Resultados', icon: Calculator },
  { path: '/heats', label: 'Baterias', icon: Grid },
  { path: '/global-heats', label: 'Baterias Globais', icon: LayoutGrid },
  { path: '/leaderboard', label: 'Leaderboard', icon: Award },
];

export const Sidebar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-sm bg-white border border-border shadow-md hover:bg-secondary transition-colors"
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
          "fixed left-0 top-0 h-full w-64 bg-white border-r border-border z-40 transition-transform duration-300",
          "lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/app" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
              <img
                src="/logo-antcamp.svg"
                alt="AntCamp"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
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
                        ? "bg-primary text-primary-foreground font-semibold" 
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
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

