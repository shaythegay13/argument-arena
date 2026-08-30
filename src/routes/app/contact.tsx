import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";
import { ProtectedRoute } from "@/components/route-guards";

export const Route = createFileRoute("/app/contact")({
  component: () => (
    <ProtectedRoute>
      <Contact />
    </ProtectedRoute>
  ),
});
