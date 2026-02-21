import { Gavel, Loader2, RotateCcw, RefreshCw, Download } from "lucide-react";
import { JudgeVerdict } from "@/types/debate";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface JudgeVerdictCardProps {
  verdict: JudgeVerdict | null;
  isGenerating: boolean;
  onReset: () => void;
  onRefine: () => void;
}

const verdictConfig: Record<
  "GO" | "MAYBE" | "NO-GO",
  { emoji: string; color: string; bg: string; border: string; label: string }
> = {
  GO: {
    emoji: "🟢",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    label: "GO — Build this now",
  },
  MAYBE: {
    emoji: "🟡",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    label: "MAYBE — Polish first",
  },
  "NO-GO": {
    emoji: "🔴",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    label: "NO-GO — Pivot or kill",
  },
};

export default function JudgeVerdictCard({
  verdict,
  isGenerating,
  onReset,
  onRefine,
}: JudgeVerdictCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Gavel className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Jury Verdict
        </span>
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Jury deliberating…</span>
        </div>
      ) : verdict ? (
        <div className="p-6 space-y-5">
          {/* Verdict badge + score */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: [1, 1.04, 1], opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`inline-flex items-center gap-3 px-5 py-3 rounded-lg border ${verdictConfig[verdict.verdict].bg} ${verdictConfig[verdict.verdict].border}`}
          >
            <span className="text-3xl">{verdictConfig[verdict.verdict].emoji}</span>
            <div>
              <p className={`text-xl font-bold ${verdictConfig[verdict.verdict].color}`}>
                {verdictConfig[verdict.verdict].label}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                Overall Score: <span className={`font-bold ${verdictConfig[verdict.verdict].color}`}>{verdict.overallScore}/10</span>
              </p>
            </div>
          </motion.div>

          {/* Why */}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Why</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{verdict.why}</p>
          </div>

          {/* Strengths */}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Strengths</p>
            <ul className="space-y-1.5">
              {verdict.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Risks</p>
            <ul className="space-y-1.5">
              {verdict.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Step */}
          <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3">
            <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Next Step</p>
            <p className="text-sm font-medium text-foreground">{verdict.nextStep}</p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Idea
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefine}
              className="gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refine This
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 text-muted-foreground"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
