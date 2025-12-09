import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Dumbbell, 
  ClipboardList, 
  Settings, 
  Calculator, 
  Award, 
  Grid,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { path: '/app', label: 'Dashboard', icon: Trophy },
  { path: '/categories', label: 'Categorias', icon: Users },
  { path: '/wods', label: 'WODs', icon: Dumbbell },
  { path: '/registrations', label: 'Inscrições', icon: ClipboardList },
  { path: '/scoring', label: 'Pontuação', icon: Settings },
  { path: '/results', label: 'Resultados', icon: Calculator },
  { path: '/heats', label: 'Baterias', icon: Grid },
  { path: '/leaderboard', label: 'Leaderboard', icon: Award },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logout realizado com sucesso');
      navigate('/auth');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-4">
            <img
              src="/logo-antcamp.svg"
              alt="AntCamp"
              className="h-8 w-auto"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">AntCamp</span>
              <span className="text-xs text-sidebar-foreground/70">Sistema de Gestão</span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/app' && location.pathname.startsWith(item.path));
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link to={item.path}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-1 items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {navItems.find(item => 
                location.pathname === item.path || 
                (item.path !== '/app' && location.pathname.startsWith(item.path))
              )?.label || 'Dashboard'}
            </span>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
