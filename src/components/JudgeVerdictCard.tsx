import { Gavel, Loader2 } from "lucide-react";
import { JudgeVerdict } from "@/types/debate";

interface JudgeVerdictCardProps {
  verdict: JudgeVerdict | null;
  isGenerating: boolean;
}

const leanColors: Record<string, string> = {
  yes: "text-green-400",
  no: "text-red-400",
  "more data": "text-yellow-400",
};

export default function JudgeVerdictCard({ verdict, isGenerating }: JudgeVerdictCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Gavel className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Judge's Verdict
        </span>
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Deliberating…</span>
        </div>
      ) : verdict ? (
        <div className="p-6 space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Lean:</span>
            <span className={`text-2xl font-bold uppercase ${leanColors[verdict.lean] ?? "text-foreground"}`}>
              {verdict.lean}
            </span>
          </div>
          <div className="space-y-2">
            {verdict.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary font-mono text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm text-foreground/80 leading-relaxed">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
