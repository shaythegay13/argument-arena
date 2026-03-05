import { Gavel, Loader2, RotateCcw, RefreshCw, Download, Shield, AlertTriangle, Lightbulb, ArrowRight, Share2, Check } from "lucide-react";
import { JudgeVerdict } from "@/types/debate";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JudgeVerdictCardProps {
  verdict: JudgeVerdict | null;
  isGenerating: boolean;
  onReset: () => void;
  onRefine: () => void;
  sessionId?: string;
}

const verdictConfig: Record<
  "GO" | "MAYBE" | "NO-GO",
  { emoji: string; color: string; bg: string; border: string; label: string; tagline: string; gradientFrom: string; gradientTo: string }
> = {
  GO: {
    emoji: "🚀",
    color: "text-verdict-go",
    bg: "bg-verdict-go/10",
    border: "border-verdict-go/30",
    label: "GO",
    tagline: "High Potential — Build this now",
    gradientFrom: "from-verdict-go/20",
    gradientTo: "to-verdict-go/5",
  },
  MAYBE: {
    emoji: "⚠️",
    color: "text-verdict-maybe",
    bg: "bg-verdict-maybe/10",
    border: "border-verdict-maybe/30",
    label: "MAYBE",
    tagline: "Needs Work — Refine before committing",
    gradientFrom: "from-verdict-maybe/20",
    gradientTo: "to-verdict-maybe/5",
  },
  "NO-GO": {
    emoji: "❌",
    color: "text-verdict-nogo",
    bg: "bg-verdict-nogo/10",
    border: "border-verdict-nogo/30",
    label: "NO-GO",
    tagline: "Likely to Fail — Pivot or kill",
    gradientFrom: "from-verdict-nogo/20",
    gradientTo: "to-verdict-nogo/5",
  },
};

function DeliberatingAnimation() {
  const [step, setStep] = useState(0);
  const steps = [
    "The Jury Foreperson is reviewing all testimony…",
    "Weighing panel scores and arguments…",
    "Preparing the final verdict…",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Gavel className="w-10 h-10 text-primary" />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-sm text-muted-foreground text-center max-w-xs"
        >
          {steps[step]}
        </motion.p>
      </AnimatePresence>
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            animate={i === step ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}

export default function JudgeVerdictCard({
  verdict,
  isGenerating,
  onReset,
  onRefine,
  sessionId,
}: JudgeVerdictCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shared, setShared] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (verdict && !isGenerating) {
      const timer = setTimeout(() => setRevealed(true), 300);
      return () => clearTimeout(timer);
    }
    setRevealed(false);
  }, [verdict, isGenerating]);

  return (
    <section className="rounded-[14px] border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center gap-2">
        <Gavel className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          The Jury Foreperson
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-mono ml-1">
          — Final Verdict
        </span>
      </div>

      {isGenerating ? (
        <DeliberatingAnimation />
      ) : verdict ? (
        <div className="space-y-0">
          {/* Verdict hero */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`relative px-6 sm:px-8 py-8 sm:py-10 bg-gradient-to-br ${verdictConfig[verdict.verdict].gradientFrom} ${verdictConfig[verdict.verdict].gradientTo}`}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="text-5xl sm:text-6xl"
              >
                {verdictConfig[verdict.verdict].emoji}
              </motion.div>
              <div className="text-center sm:text-left">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`text-3xl sm:text-4xl font-bold tracking-tight ${verdictConfig[verdict.verdict].color}`}
                >
                  {verdictConfig[verdict.verdict].label}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm text-muted-foreground mt-1"
                >
                  {verdictConfig[verdict.verdict].tagline}
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="sm:ml-auto"
              >
                <div className={`px-4 py-2 rounded-[14px] border ${verdictConfig[verdict.verdict].border} ${verdictConfig[verdict.verdict].bg}`}>
                  <p className="text-xs text-muted-foreground font-mono text-center">Overall Score</p>
                  <p className={`text-3xl font-bold text-center ${verdictConfig[verdict.verdict].color}`}>
                    {verdict.overallScore}<span className="text-base text-muted-foreground">/10</span>
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content sections */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="px-4 sm:px-6 py-5 sm:py-6 space-y-5"
              >
                {/* Why */}
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                    Foreperson's Summary
                  </p>
                  <p className="text-base text-foreground leading-relaxed">{verdict.why}</p>
                </div>

                {/* Strengths & Risks side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-[14px] border border-verdict-go/20 bg-verdict-go/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-verdict-go" />
                      <p className="text-xs font-mono uppercase tracking-[0.2em] text-verdict-go font-semibold">
                        Strengths
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {verdict.strengths.map((s, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-start gap-2 text-sm text-foreground/85"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-verdict-go mt-2 shrink-0" />
                          {s}
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[14px] border border-verdict-nogo/20 bg-verdict-nogo/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-verdict-nogo" />
                      <p className="text-xs font-mono uppercase tracking-[0.2em] text-verdict-nogo font-semibold">
                        Major Risks
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {verdict.risks.map((r, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-start gap-2 text-sm text-foreground/85"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-verdict-nogo mt-2 shrink-0" />
                          {r}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Step */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="rounded-[14px] bg-primary/10 border border-primary/20 px-5 py-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary font-semibold">
                      Recommended Next Step
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {verdict.nextStep}
                  </p>
                </motion.div>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={onReset} className="gap-2 rounded-[10px]">
                    <RotateCcw className="w-3.5 h-3.5" />
                    New Idea
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRefine} className="gap-2 rounded-[10px]">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refine & Re-pitch
                  </Button>
                  {sessionId && (
                    <Button
                      variant={shared ? "default" : "outline"}
                      size="sm"
                      className="gap-2 rounded-[10px]"
                      disabled={shareLoading}
                      onClick={async () => {
                        setShareLoading(true);
                        try {
                          await supabase
                            .from("debate_sessions")
                            .update({ is_public: true } as any)
                            .eq("id", sessionId);
                          const url = `${window.location.origin}/result/${sessionId}`;
                          await navigator.clipboard.writeText(url);
                          setShared(true);
                          toast({ title: "Share link copied!", description: "Anyone with the link can view this result." });
                          setTimeout(() => setShared(false), 3000);
                        } catch {
                          toast({ title: "Failed to share", variant: "destructive" });
                        }
                        setShareLoading(false);
                      }}
                    >
                      {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      {shared ? "Link Copied!" : "Share Result"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-2 text-muted-foreground ml-auto rounded-[10px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </section>
  );
}
