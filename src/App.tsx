import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import Auth from "./pages/Auth";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import PublicRegistration from "./pages/PublicRegistration";
import Checkout from "./pages/Checkout";
import ChampionshipFinance from "./pages/ChampionshipFinance";
import ChampionshipSettings from "./pages/ChampionshipSettings";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import WODs from "./pages/WODs";
import Registrations from "./pages/Registrations";
import Scoring from "./pages/Scoring";
import Results from "./pages/Results";
import Heats from "./pages/Heats";
import GlobalHeats from "./pages/GlobalHeats";
import Leaderboard from "./pages/Leaderboard";
import TVDisplay from "./pages/TVDisplay";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import Integrations from "./pages/Integrations";
import AsaasIntegration from "./pages/AsaasIntegration";
import PublicLeaderboard from "./pages/PublicLeaderboard";
import PublicHeats from "./pages/PublicHeats";
import LinkPage from "./pages/LinkPage";
import LinkPageConfig from "./pages/LinkPageConfig";
import BulkImport from "./pages/BulkImport";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import TestAsaasConnections from "./pages/TestAsaasConnections";
import AssignRoles from "./pages/AssignRoles";
import { ChampionshipProvider } from "./contexts/ChampionshipContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChampionshipProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          {/* Public routes without navbar */}
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/links/:slug" element={<LinkPage />} />
          <Route path="/register/:slug" element={<PublicRegistration />} />
          <Route path="/checkout/:registrationId" element={<Checkout />} />
          <Route path="/tv-display" element={<TVDisplay />} />
          <Route path="/:slug/leaderboard" element={<PublicLeaderboard />} />
          <Route path="/:slug/heats" element={<PublicHeats />} />
          
          {/* Organizer dashboard */}
          <Route path="/dashboard" element={<OrganizerDashboard />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/asaas-integration" element={<AsaasIntegration />} />
          <Route path="/test-asaas-connections" element={<TestAsaasConnections />} />
          <Route path="/assign-roles" element={<AssignRoles />} />
          <Route path="/championships/:championshipId/finance" element={<ChampionshipFinance />} />
          <Route path="/championships/:championshipId/settings" element={<ChampionshipSettings />} />
          <Route path="/championships/:championshipId/links" element={<LinkPageConfig />} />
          
          {/* App routes with sidebar */}
          <Route path="*" element={
            <div className="min-h-screen bg-background flex">
              <Sidebar />
              <main className="flex-1 lg:ml-64">
                <Routes>
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/wods" element={<WODs />} />
                  <Route path="/registrations" element={<Registrations />} />
                  <Route path="/bulk-import" element={<BulkImport />} />
                  <Route path="/scoring" element={<Scoring />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/heats" element={<Heats />} />
                  <Route path="/global-heats" element={<GlobalHeats />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ChampionshipProvider>
  </QueryClientProvider>
);

export default App;
