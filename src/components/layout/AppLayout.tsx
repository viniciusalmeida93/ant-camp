import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <img
              src="/logo-antcamp.svg"
              alt="AntCamp"
              className="h-8 w-auto"
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-auto bg-background">
          <div className="flex-1">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
