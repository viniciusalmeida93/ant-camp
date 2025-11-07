import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import PublicRegistration from "./pages/PublicRegistration";
import Checkout from "./pages/Checkout";
import ChampionshipFinance from "./pages/ChampionshipFinance";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import WODs from "./pages/WODs";
import Registrations from "./pages/Registrations";
import Scoring from "./pages/Scoring";
import Results from "./pages/Results";
import Heats from "./pages/Heats";
import Leaderboard from "./pages/Leaderboard";
import TVDisplay from "./pages/TVDisplay";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import Integrations from "./pages/Integrations";
import PublicLeaderboard from "./pages/PublicLeaderboard";
import PublicHeats from "./pages/PublicHeats";
import LinkPage from "./pages/LinkPage";
import LinkPageConfig from "./pages/LinkPageConfig";
import BulkImport from "./pages/BulkImport";
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
          <Route path="/" element={<LandingPage />} />
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
          <Route path="/championships/:championshipId/finance" element={<ChampionshipFinance />} />
          <Route path="/championships/:championshipId/links" element={<LinkPageConfig />} />
          
          {/* App routes with navbar */}
          <Route path="*" element={
            <div className="min-h-screen bg-background">
              <Navbar />
              <Routes>
                <Route path="/app" element={<Dashboard />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/wods" element={<WODs />} />
                <Route path="/registrations" element={<Registrations />} />
                <Route path="/bulk-import" element={<BulkImport />} />
                <Route path="/scoring" element={<Scoring />} />
                <Route path="/results" element={<Results />} />
                <Route path="/heats" element={<Heats />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          } />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ChampionshipProvider>
  </QueryClientProvider>
);

export default App;
