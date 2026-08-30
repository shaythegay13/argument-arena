import { createFileRoute } from "@tanstack/react-router";
import AcceptTerms from "@/pages/AcceptTerms";
import { TermsGate } from "@/components/route-guards";

export const Route = createFileRoute("/accept-terms")({
  component: () => (
    <TermsGate>
      <AcceptTerms />
    </TermsGate>
  ),
});
