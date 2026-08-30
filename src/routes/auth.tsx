import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";
import { AuthRoute } from "@/components/route-guards";

export const Route = createFileRoute("/auth")({
  component: () => (
    <AuthRoute>
      <Auth />
    </AuthRoute>
  ),
});
