import { Link, useLocation } from 'react-router-dom';
import {
  Trophy,
  Users,
  Dumbbell,
  ClipboardList,
  Settings,
  Calculator,
  Award,
  Grid,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

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

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/app" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Trophy className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">AntCamp</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Sistema de Gestão
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/app' && location.pathname.startsWith(item.path));

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link to={item.path}>
                        <Icon className="size-4" />
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
      
      <SidebarRail />
    </Sidebar>
  );
}
