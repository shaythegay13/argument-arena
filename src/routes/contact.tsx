import { createFileRoute } from "@tanstack/react-router";
import ContactPage from "@/pages/ContactPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Startup Jury AI — Support & Questions" },
      { name: "description", content: "Reach the Startup Jury AI team about credits, plans, or feedback on your AI investor panel evaluations." },
      { property: "og:title", content: "Contact Startup Jury AI" },
      { property: "og:description", content: "Questions about credits, plans, or the AI jury? Get in touch with our team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});
