import { Persona, Round } from "@/types/debate";
import { getPersonaColors } from "@/data/personaColors";
import { Button } from "@/components/ui/button";
import { Check, ClipboardList } from "lucide-react";

interface FinalStatementsReviewProps {
  personas: Persona[];
  round: Round | undefined;
  acknowledged: boolean;
  onAcknowledge: () => void;
}

/** Trims a juror's final statement to a short, readable summary line. */
export function summarizeStatement(text: string, maxChars = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const cut = slice.lastIndexOf(". ");
  return (cut > 80 ? slice.slice(0, cut + 1) : slice.trimEnd() + "…");
}

export default function FinalStatementsReview({
  personas,
  round,
  acknowledged,
  onAcknowledge,
}: FinalStatementsReviewProps) {
  const messages = round?.messages ?? [];

  return (
    <section
      aria-labelledby="final-statements-review-heading"
      className="rounded-xl border border-border bg-card/60 p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-primary" />
        <h2
          id="final-statements-review-heading"
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
        >
          Review Final Statements
        </h2>
      </div>

      <ul className="space-y-3">
        {personas.map((persona) => {
          const msg = messages.find((m) => m.personaId === persona.id);
          const colors = getPersonaColors(persona.colorKey);
          return (
            <li key={persona.id} className="flex gap-3">
              <span
                className={`shrink-0 h-7 w-7 rounded-md grid place-items-center text-sm ${colors.bg} ${colors.text}`}
                aria-hidden="true"
              >
                {persona.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {persona.name} <span className="text-muted-foreground font-normal">· {persona.subtitle}</span>
                </p>
                <p className="text-sm text-foreground/75 leading-relaxed">
                  {msg ? summarizeStatement(msg.text) : "No final statement recorded for this juror."}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {acknowledged ? (
        <p className="flex items-center gap-2 text-xs font-mono text-primary">
          <Check className="w-3.5 h-3.5" />
          Reviewed — grading unlocked
        </p>
      ) : (
        <Button variant="outline" onClick={onAcknowledge} className="border-primary/40 text-primary hover:bg-primary/10">
          I&apos;ve reviewed the final statements
        </Button>
      )}
    </section>
  );
}
