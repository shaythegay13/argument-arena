import { createFileRoute } from "@tanstack/react-router";
import TermsAuthenticated from "@/pages/TermsAuthenticated";
import { ProtectedRoute } from "@/components/route-guards";

export const Route = createFileRoute("/app/terms")({
  component: () => (
    <ProtectedRoute>
      <TermsAuthenticated />
    </ProtectedRoute>
  ),
});
