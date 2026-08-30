import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyAuthenticated from "@/pages/PrivacyPolicyAuthenticated";
import { ProtectedRoute } from "@/components/route-guards";

export const Route = createFileRoute("/app/privacy")({
  component: () => (
    <ProtectedRoute>
      <PrivacyPolicyAuthenticated />
    </ProtectedRoute>
  ),
});
