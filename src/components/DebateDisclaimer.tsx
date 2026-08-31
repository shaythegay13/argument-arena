import { AlertTriangle } from "lucide-react";

interface DebateDisclaimerProps {
  hasCustomPanelists?: boolean;
  className?: string;
}

/**
 * Persistent legal notice shown during a debate run: everything on screen is
 * AI-generated fiction, not statements by real investors.
 */
const DebateDisclaimer = ({ hasCustomPanelists = false, className = "" }: DebateDisclaimerProps) => (
  <div
    role="note"
    className={`flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground ${className}`}
  >
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
    <p>
      <span className="font-semibold text-foreground/80">AI-generated simulation.</span> Every statement, grade, and
      verdict below is produced by AI personas — not by real investors — and is not investment, legal, or financial
      advice.
      {hasCustomPanelists && (
        <>
          {" "}
          Panelist profiles seated on this panel are fictional or composite characters. They are not the real people they
          may resemble and imply no endorsement or participation unless you have that person's authorization.
        </>
      )}
    </p>
  </div>
);

export default DebateDisclaimer;
