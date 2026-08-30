import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, RotateCcw, ShieldCheck, X } from "lucide-react";

interface CreditsHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyCredits?: () => void;
  isPro?: boolean;
  credits?: number;
}

const CreditsHelpModal = ({ open, onOpenChange, onBuyCredits, isPro, credits }: CreditsHelpModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wide">How credits work</DialogTitle>
          <DialogDescription className="font-sans">
            One credit = one full 4-round jury evaluation. You are charged once per session, never per round.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm font-sans">
          <section className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Your balance
            </h3>
            <p className="text-foreground">
              {isPro
                ? "Pro subscription — unlimited evaluations, 0 credits charged."
                : `${credits ?? 0} credit${(credits ?? 0) === 1 ? "" : "s"} remaining · 1 credit per full evaluation.`}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-primary" /> Counts as a successful generation
            </h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-5">
              <li>
                <span className="text-foreground">Example:</span> you click Start Jury, the panel delivers
                opening statements — 1 credit is charged, and rounds 2, 3 and the verdict are already paid for.
              </li>
              <li>
                <span className="text-foreground">Example:</span> you abandon the session after round 2. The
                evaluation was delivered, so the credit stays used.
              </li>
              <li>
                <span className="text-foreground">Example:</span> you re-pitch a revised idea. That is a new
                session, so it costs a new credit.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              <X className="w-3.5 h-3.5 text-destructive" /> No charge / automatic refund
            </h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-5">
              <li>
                <span className="text-foreground">Example:</span> the AI panel errors out or times out on the
                opening round — the credit is refunded to your balance automatically.
              </li>
              <li>
                <span className="text-foreground">Example:</span> the panel returns an empty response — no
                charge, just press Start Jury again.
              </li>
              <li>
                <span className="text-foreground">Example:</span> the request is rate-limited or the service is
                briefly unavailable — no charge.
              </li>
              <li>
                <span className="text-foreground">Example:</span> a request is retried (double-click, network
                retry, page refresh mid-start) — each session is billed at most once, so retries never
                double-charge you.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5 text-secondary" /> In-progress sessions
            </h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-5">
              <li>Once a jury has started, all four rounds run to completion — even if your balance hits 0.</li>
              <li>
                Rounds 2 through 4 and the final verdict cost nothing extra; the session is already paid for.
              </li>
              <li>
                If you run out of credits, you are told before a new jury starts — the panel never runs
                partially.
              </li>
            </ul>
          </section>

          <section className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Charges are recorded per session in your account ledger, so a failed or retried generation can
              never take the same credit twice.
            </p>
          </section>

          {!isPro && onBuyCredits && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onBuyCredits();
              }}
              className="w-full rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Buy credits
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditsHelpModal;
