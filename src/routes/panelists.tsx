import { createFileRoute } from "@tanstack/react-router";
import PanelistsPage from "@/pages/PanelistsPage";
import { ProtectedRoute } from "@/components/route-guards";

export const Route = createFileRoute("/panelists")({
  head: () => ({
    meta: [
      { title: "Panelist Database — Build Your Real Jury | Startup Jury AI" },
      {
        name: "description",
        content:
          "Create and edit real panelists with photos, credentials and track records, then seat them on your jury in the director console.",
      },
      { property: "og:title", content: "Panelist Database — Startup Jury AI" },
      {
        property: "og:description",
        content: "Maintain a roster of real panelists with photos, credentials and voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <PanelistsPage />
    </ProtectedRoute>
  ),
});
