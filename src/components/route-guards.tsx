// Ported from src/App.tsx during the TanStack Start migration — these guards
// previously lived inline in the route config.
import { Navigate } from "@/lib/router-compat";
import { useAuth } from "@/hooks/useAuth";
import { useTermsAccepted } from "@/hooks/useTermsAccepted";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { accepted, loading: termsLoading } = useTermsAccepted(user?.id);

  if (loading || termsLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (accepted === false) return <Navigate to="/accept-terms" replace />;
  return <>{children}</>;
}

export function TermsGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { accepted, loading: termsLoading } = useTermsAccepted(user?.id);

  if (loading || termsLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (accepted) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
