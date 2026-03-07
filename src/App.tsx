import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTermsAccepted } from "@/hooks/useTermsAccepted";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAuthenticated from "./pages/TermsAuthenticated";
import PrivacyPolicyAuthenticated from "./pages/PrivacyPolicyAuthenticated";
import Contact from "./pages/Contact";
import AcceptTerms from "./pages/AcceptTerms";
import ResultPage from "./pages/ResultPage";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import AIDisclosureModal from "./components/AIDisclosureModal";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { accepted, loading: termsLoading } = useTermsAccepted(user?.id);

  if (loading || termsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (accepted === false) return <Navigate to="/accept-terms" replace />;
  return <>{children}</>;
}

function TermsGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { accepted, loading: termsLoading } = useTermsAccepted(user?.id);

  if (loading || termsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (accepted) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AIDisclosureModal />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-terms" element={<TermsGate><AcceptTerms /></TermsGate>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/debate" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/terms" element={<AuthRoute><Terms /></AuthRoute>} />
          <Route path="/privacy" element={<AuthRoute><PrivacyPolicy /></AuthRoute>} />
          <Route path="/app/terms" element={<ProtectedRoute><TermsAuthenticated /></ProtectedRoute>} />
          <Route path="/app/privacy" element={<ProtectedRoute><PrivacyPolicyAuthenticated /></ProtectedRoute>} />
          <Route path="/app/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
