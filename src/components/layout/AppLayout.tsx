import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Trophy, Users, Dumbbell, ClipboardList, Settings, Calculator, 
  Award, Grid, ChevronRight, Home, Upload, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChampionship } from '@/contexts/ChampionshipContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mainNavItems = [
  { path: '/app', label: 'Dashboard', icon: Trophy },
  { path: '/categories', label: 'Categorias', icon: Users },
  { path: '/wods', label: 'WODs', icon: Dumbbell },
  { path: '/registrations', label: 'Inscrições', icon: ClipboardList },
  { path: '/bulk-import', label: 'Importar Atletas', icon: Upload },
];

const resultsNavItems = [
  { path: '/scoring', label: 'Pontuação', icon: Settings },
  { path: '/results', label: 'Resultados', icon: Calculator },
  { path: '/heats', label: 'Baterias', icon: Grid },
  { path: '/leaderboard', label: 'Leaderboard', icon: Award },
];

function getBreadcrumbs(pathname: string) {
  const breadcrumbs: { label: string; path: string }[] = [];
  
  const allItems = [...mainNavItems, ...resultsNavItems];
  const currentItem = allItems.find(item => 
    pathname === item.path || 
    (item.path !== '/app' && pathname.startsWith(item.path))
  );

  if (pathname !== '/app') {
    breadcrumbs.push({ label: 'Dashboard', path: '/app' });
  }
  
  if (currentItem && currentItem.path !== '/app') {
    breadcrumbs.push({ label: currentItem.label, path: currentItem.path });
  }

  return breadcrumbs;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedChampionship, setSelectedChampionship, championships } = useChampionship();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/app" className="flex items-center gap-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Trophy className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">AntCamp</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Gestão de Campeonatos
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Championship Selector */}
          <SidebarGroup>
            <SidebarGroupLabel>Campeonato Ativo</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 group-data-[collapsible=icon]:hidden">
                <Select
                  value={selectedChampionship?.id || ''}
                  onValueChange={(value) => {
                    const champ = championships.find(c => c.id === value);
                    if (champ) {
                      setSelectedChampionship(champ);
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {championships.map((champ) => (
                      <SelectItem key={champ.id} value={champ.id} className="text-xs">
                        {champ.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Configuração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => {
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
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Results Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Resultados</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {resultsNavItems.map((item) => {
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
                          <item.icon className="size-4" />
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

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Painel do Organizador">
                <Link to="/dashboard">
                  <Home className="size-4" />
                  <span>Painel do Organizador</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignOut}
                tooltip="Sair"
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.length === 0 ? (
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                ) : (
                  breadcrumbs.map((crumb, index) => (
                    <BreadcrumbItem key={crumb.path}>
                      {index < breadcrumbs.length - 1 ? (
                        <>
                          <BreadcrumbLink asChild>
                            <Link to={crumb.path}>{crumb.label}</Link>
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          {selectedChampionship && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {selectedChampionship.name}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
