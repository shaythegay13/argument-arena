import { Gavel, RotateCcw, RefreshCw, Download, Shield, AlertTriangle, Lightbulb, ArrowRight, Share2, Check, Skull, Trophy, TrendingUp } from "lucide-react";
import VersionComparison from "@/components/VersionComparison";
import CommunityVote from "@/components/CommunityVote";
import ShareableVerdictCard from "@/components/ShareableVerdictCard";
import { JudgeVerdict, PersonaRating, Persona } from "@/types/debate";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPersonaColors } from "@/data/personaColors";
import html2canvas from "html2canvas";

interface JudgeVerdictCardProps {
  verdict: JudgeVerdict | null;
  isGenerating: boolean;
  onReset: () => void;
  onRefine: () => void;
  sessionId?: string;
  ratings?: PersonaRating[];
  personas?: Persona[];
  topic?: string;
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

function IndividualScores({ ratings, personas }: { ratings: PersonaRating[]; personas: Persona[] }) {
  const sorted = [...ratings].sort((a, b) => b.score - a.score);

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
        Individual Judge Scores
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {sorted.map((r, i) => {
          const persona = personas.find((p) => p.id === r.personaId);
          const colors = persona ? getPersonaColors(persona.colorKey) : null;
          const scoreColor = r.score >= 8 ? "text-verdict-go" : r.score >= 6 ? "text-verdict-maybe" : "text-verdict-nogo";

          return (
            <motion.div
              key={r.personaId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-[10px] border border-border bg-muted/30 px-3 py-2 text-center"
            >
              <p className="text-[10px] font-mono text-muted-foreground truncate" title={persona?.name}>
                {persona?.name?.split(" ")[0] ?? "Judge"}
              </p>
              <p className={`text-lg font-bold ${scoreColor}`}>
                {r.score}<span className="text-xs text-muted-foreground">/10</span>
              </p>
              <p className="text-[9px] text-muted-foreground truncate" title={persona?.subtitle}>
                {persona?.subtitle?.split("—")[0]?.trim() ?? ""}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PercentileBadge({ percentile }: { percentile: number }) {
  const color = percentile >= 80 ? "text-verdict-go" : percentile >= 50 ? "text-verdict-maybe" : "text-verdict-nogo";
  const bgColor = percentile >= 80 ? "bg-verdict-go/10 border-verdict-go/30" : percentile >= 50 ? "bg-verdict-maybe/10 border-verdict-maybe/30" : "bg-verdict-nogo/10 border-verdict-nogo/30";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 }}
      className={`rounded-[10px] border px-3 py-2 text-center ${bgColor}`}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <TrendingUp className={`w-3 h-3 ${color}`} />
        <p className="text-[10px] font-mono text-muted-foreground">Percentile</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {percentile}<span className="text-xs text-muted-foreground">th</span>
      </p>
    </motion.div>
  );
}

export default function JudgeVerdictCard({
  verdict,
  isGenerating,
  onReset,
  onRefine,
  sessionId,
  ratings = [],
  personas = [],
  topic = "",
}: JudgeVerdictCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shared, setShared] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (verdict && !isGenerating) {
      const timer = setTimeout(() => setRevealed(true), 300);
      return () => clearTimeout(timer);
    }
    setRevealed(false);
  }, [verdict, isGenerating]);

  const shareUrl = sessionId ? `${window.location.origin}/result/${sessionId}` : window.location.href;
  const shareText = verdict
    ? `My startup idea just got a ${verdict.verdict} verdict (${verdict.overallScore * 10}/100) from Startup Jury AI! 🎯 Top ${verdict.percentile}th percentile.`
    : "";

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloadingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0f",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `startup-jury-verdict-${verdict?.verdict?.toLowerCase() ?? "result"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Image downloaded!" });
    } catch {
      toast({ title: "Failed to download image", variant: "destructive" });
    }
    setDownloadingImage(false);
  };

  return (
    <section className="rounded-[14px] border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center gap-2">
        <Gavel className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Startup Verdict Card
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-mono ml-1">
          — Final Verdict
        </span>
      </div>

      {isGenerating ? (
        <DeliberatingAnimation />
      ) : verdict ? (
        <div className="space-y-0" ref={cardRef}>
          {/* Verdict hero */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`relative px-6 sm:px-8 py-8 sm:py-10 bg-gradient-to-br ${verdictConfig[verdict.verdict].gradientFrom} ${verdictConfig[verdict.verdict].gradientTo}`}
          >
            {topic && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xs font-mono text-muted-foreground/70 mb-4 truncate"
              >
                ⚡ {topic}
              </motion.p>
            )}
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
              <div className="sm:ml-auto flex items-center gap-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className={`px-4 py-2 rounded-[14px] border ${verdictConfig[verdict.verdict].border} ${verdictConfig[verdict.verdict].bg}`}>
                    <p className="text-xs text-muted-foreground font-mono text-center">Overall Score</p>
                    <p className={`text-3xl font-bold text-center ${verdictConfig[verdict.verdict].color}`}>
                      {verdict.overallScore * 10}<span className="text-base text-muted-foreground">/100</span>
                    </p>
                  </div>
                </motion.div>
                <PercentileBadge percentile={verdict.percentile} />
              </div>
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
                {/* Foreperson Summary */}
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                    Foreperson's Summary
                  </p>
                  <p className="text-base text-foreground leading-relaxed">{verdict.why}</p>
                </div>

                {/* Scoring methodology note */}
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-[10px] bg-muted/30 border border-border">
                  <Lightbulb className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground/70">What's being scored:</span> Each judge evaluates <span className="text-foreground/70 font-medium">business viability</span> — market potential, execution feasibility, competitive positioning, and founder readiness. This is not a pitch-quality grade; it's an assessment of whether the idea can succeed as a business.
                  </p>
                </div>

                {/* Individual Judge Scores */}
                {ratings.length > 0 && personas.length > 0 && (
                  <IndividualScores ratings={ratings} personas={personas} />
                )}

                {/* Top Praise */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-[14px] border border-verdict-go/20 bg-verdict-go/5 px-5 py-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-verdict-go" />
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-verdict-go font-semibold">
                      Top Praise from the Panel
                    </p>
                  </div>
                  <p className="text-sm text-foreground/90 italic">"{verdict.topPraise}"</p>
                </motion.div>

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

                {/* Skeptic Kill Shot */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-[14px] border border-verdict-nogo/30 bg-verdict-nogo/5 px-5 py-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Skull className="w-4 h-4 text-verdict-nogo" />
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-verdict-nogo font-semibold">
                      Skeptic Kill Shot
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground/90 italic">
                    "{verdict.skepticKillShot}"
                  </p>
                </motion.div>

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
                {/* Version Comparison */}
                {sessionId && (
                  <VersionComparison sessionId={sessionId} />
                )}

                {/* Community Vote */}
                {sessionId && (
                  <div className="pt-3 border-t border-border">
                    <CommunityVote sessionId={sessionId} />
                  </div>
                )}

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
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowShareCard(true)}
                    className="gap-2 rounded-[10px]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Verdict Card
                  </Button>
                </div>

                {/* Shareable Verdict Card Modal */}
                <AnimatePresence>
                  {showShareCard && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="pt-4 border-t border-border"
                    >
                      <ShareableVerdictCard
                        verdict={verdict}
                        ratings={ratings}
                        personas={personas}
                        topic={topic}
                        sessionId={sessionId}
                        onClose={() => setShowShareCard(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : null}
    </section>
  );
}
