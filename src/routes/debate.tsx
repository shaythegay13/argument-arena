import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { ProtectedRoute } from "@/components/route-guards";

export const Route = createFileRoute("/debate")({
  component: () => (
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  ),
});
