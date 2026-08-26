import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { VotingProvider } from "@/contexts/VotingContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import CandidatesPage from "./pages/CandidatesPage";
import VotingPage from "./pages/VotingPage";
import ResultsPage from "./pages/ResultsPage";
import AdminDashboard from "./pages/AdminDashboard";
import RegistrationsPage from "./pages/RegistrationsPage";
import VotersPage from "./pages/VotersPage";
import SectionsPage from "./pages/SectionsPage";
import PositionsPage from "./pages/PositionsPage";
import ElectionReportPage from "./pages/ElectionReportPage";
import SessionManagerPage from '@/pages/SessionManagerPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <VotingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/vote" element={<VotingPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/sessions" element={<SessionManagerPage />} />
            <Route path="/registrations" element={<RegistrationsPage />} />
            <Route path="/voters" element={<VotersPage />} />
            <Route path="/sections" element={<SectionsPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/election-report" element={<ElectionReportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </VotingProvider>
  </QueryClientProvider>
);

export default App;
