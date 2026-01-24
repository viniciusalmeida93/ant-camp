import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import Auth from "./pages/Auth";
import Logout from "./pages/Logout";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import PublicRegistration from "./pages/PublicRegistration";
import Checkout from "./pages/Checkout";
import ChampionshipFinance from "./pages/ChampionshipFinance";
import ChampionshipSettings from "./pages/ChampionshipSettings";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import CategoryForm from "./pages/CategoryForm";
import WODs from "./pages/WODs";
import CreateWOD from "./pages/CreateWOD";
import Registrations from "./pages/Registrations";
import Scoring from "./pages/Scoring";
import Results from "./pages/Results";
import HeatsNew from "./pages/HeatsNew";
import Leaderboard from "./pages/Leaderboard";
import TVDisplay from "./pages/TVDisplay";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import Integrations from "./pages/Integrations";
import AsaasIntegration from "./pages/AsaasIntegration";
import PublicLeaderboard from "./pages/PublicLeaderboard";
import PublicHeats from "./pages/PublicHeats";
import PublicWODs from "./pages/PublicWODs";
import LinkPage from "./pages/LinkPage";
import LinkPageConfig from "./pages/LinkPageConfig";
import BulkImport from "./pages/BulkImport";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import TestAsaasConnections from "./pages/TestAsaasConnections";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminFees from "./pages/SuperAdminFees";
import SuperAdminOrganizers from "./pages/SuperAdminOrganizers";
import SuperAdminChampionships from "./pages/SuperAdminChampionships";
import SuperAdminSettings from "./pages/SuperAdminSettings";
import AssignRoles from "./pages/AssignRoles";
import AthleteDashboard from "./pages/AthleteDashboard";
import PaymentConfig from "./pages/PaymentConfig";
import Coupons from "./pages/Coupons";
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
            <Route path="/logout" element={<Logout />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/links/:slug" element={<LinkPage />} />
            <Route path="/inscricao/:slug" element={<PublicRegistration />} />
            <Route path="/checkout/:registrationId" element={<Checkout />} />
            <Route path="/tv-display" element={<TVDisplay />} />
            <Route path="/:slug/leaderboard" element={<PublicLeaderboard />} />
            <Route path="/:slug/heats" element={<PublicHeats />} />
            <Route path="/:slug/wods" element={<PublicWODs />} />

            {/* Organizer dashboard */}
            <Route path="/dashboard" element={<OrganizerDashboard />} />
            <Route path="/athlete-dashboard" element={<AthleteDashboard />} />
            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="fees" element={<SuperAdminFees />} />
              <Route path="organizers" element={<SuperAdminOrganizers />} />
              <Route path="championships" element={<SuperAdminChampionships />} />
              <Route path="settings" element={<SuperAdminSettings />} />
            </Route>
            <Route path="/asaas-integration" element={<AsaasIntegration />} />
            <Route path="/test-asaas-connections" element={<TestAsaasConnections />} />
            <Route path="/assign-roles" element={<AssignRoles />} />
            <Route path="/assign-roles" element={<AssignRoles />} />

            {/* App routes with sidebar */}
            <Route path="*" element={
              <div className="min-h-screen bg-background flex">
                <Sidebar />
                <main className="flex-1 lg:ml-64">
                  <Routes>
                    <Route path="/championships/:championshipId/settings" element={<ChampionshipSettings />} />
                    <Route path="/championships/:championshipId/finance" element={<ChampionshipFinance />} />
                    <Route path="/championships/:championshipId/links" element={<LinkPageConfig />} />
                    <Route path="/app" element={<Dashboard />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/categories/new" element={<CategoryForm />} />
                    <Route path="/categories/:id/edit" element={<CategoryForm />} />
                    <Route path="/wods" element={<WODs />} />
                    <Route path="/wods/new" element={<CreateWOD />} />
                    <Route path="/registrations" element={<Registrations />} />
                    <Route path="/bulk-import" element={<BulkImport />} />
                    <Route path="/scoring" element={<Scoring />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/heats" element={<HeatsNew />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/payments" element={<PaymentConfig />} />
                    <Route path="/coupons" element={<Coupons />} />
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
