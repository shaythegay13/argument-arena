import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { PERSONAS } from "@/data/personas";
import { Persona, PersonaRating, JudgeVerdict, Round } from "@/types/debate";
import { Loader2, ArrowLeft, Share2, ExternalLink, Gavel, Star, Shield, AlertTriangle, Lightbulb, ArrowRight, Zap, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommunityVote from "@/components/CommunityVote";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const verdictConfig: Record<string, { emoji: string; color: string; bg: string; border: string; label: string; tagline: string }> = {
  GO: { emoji: "🚀", color: "text-verdict-go", bg: "bg-verdict-go/10", border: "border-verdict-go/30", label: "GO", tagline: "High Potential" },
  MAYBE: { emoji: "⚠️", color: "text-verdict-maybe", bg: "bg-verdict-maybe/10", border: "border-verdict-maybe/30", label: "MAYBE", tagline: "Needs Work" },
  "NO-GO": { emoji: "❌", color: "text-verdict-nogo", bg: "bg-verdict-nogo/10", border: "border-verdict-nogo/30", label: "NO-GO", tagline: "Likely to Fail" },
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-verdict-go";
  if (score >= 6) return "text-verdict-maybe";
  return "text-verdict-nogo";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-verdict-go";
  if (score >= 6) return "bg-verdict-maybe";
  return "bg-verdict-nogo";
}

const personaColors: Record<string, { text: string; bg: string; border: string }> = {
  angel: { text: "text-persona-angel", bg: "bg-persona-angel", border: "persona-glow-angel" },
  vc: { text: "text-persona-vc", bg: "bg-persona-vc", border: "persona-glow-vc" },
  customer: { text: "text-persona-customer", bg: "bg-persona-customer", border: "persona-glow-customer" },
  operator: { text: "text-persona-operator", bg: "bg-persona-operator", border: "persona-glow-operator" },
  skeptic: { text: "text-persona-skeptic", bg: "bg-persona-skeptic", border: "persona-glow-skeptic" },
  quant: { text: "text-persona-quant", bg: "bg-persona-quant", border: "persona-glow-quant" },
  insider: { text: "text-persona-insider", bg: "bg-persona-insider", border: "persona-glow-insider" },
  visionary: { text: "text-persona-visionary", bg: "bg-persona-visionary", border: "persona-glow-visionary" },
};

interface SessionData {
  topic: string;
  ratings: PersonaRating[];
  judge_verdict: JudgeVerdict | null;
  selected_persona_ids: string[];
  rounds: Round[];
  created_at: string;
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("debate_sessions")
      .select("topic, ratings, judge_verdict, selected_persona_ids, rounds, created_at")
      .eq("id", id)
      .eq("is_public", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setSession({
            topic: data.topic,
            ratings: (data.ratings as any) ?? [],
            judge_verdict: (data.judge_verdict as any) ?? null,
            selected_persona_ids: data.selected_persona_ids ?? [],
            rounds: (data.rounds as any) ?? [],
            created_at: data.created_at,
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    trackEvent("result_shared", { sessionId: id });
    toast({ title: "Link copied!", description: "Share this link with anyone." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Gavel className="w-12 h-12 text-muted-foreground/30" />
        <h1 className="text-xl font-semibold text-foreground">Result Not Found</h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          This result page doesn't exist or hasn't been shared publicly.
        </p>
        <Button variant="outline" onClick={() => navigate("/")} className="gap-2 rounded-[10px]">
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </Button>
      </div>
    );
  }

  const personas = PERSONAS.filter((p) => session.selected_persona_ids.includes(p.id));
  const verdict = session.judge_verdict;
  const vConfig = verdict ? verdictConfig[verdict.verdict] : null;
  const sortedRatings = [...session.ratings].sort((a, b) => b.score - a.score);
  const avgScore = session.ratings.length > 0
    ? Math.round((session.ratings.reduce((s, r) => s + r.score, 0) / session.ratings.length) * 10) / 10
    : null;
  const dateStr = new Date(session.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const topComments = sortedRatings.slice(0, 2).map((r) => {
    const persona = personas.find((p) => p.id === r.personaId);
    return { persona, rating: r };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={logo} alt="Startup Jury AI" className="h-40 sm:h-48 -my-12" />
          <span className="text-xs font-mono text-muted-foreground">/ result</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="gap-1.5 text-muted-foreground">
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </Button>
            <Button size="sm" onClick={() => navigate("/")} className="gap-1.5 rounded-[10px]">
              <Zap className="w-3.5 h-3.5" />
              Try It
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Idea Summary */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[14px] border border-border bg-card p-5 sm:p-6"
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Startup Idea</p>
          <p className="text-base sm:text-lg text-foreground leading-relaxed">{session.topic}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Evaluated on {dateStr} · {personas.length} judges · {session.rounds.length} rounds
          </p>
        </motion.section>

        {/* Verdict Hero */}
        {verdict && vConfig && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className={`rounded-[14px] border ${vConfig.border} ${vConfig.bg} p-6 sm:p-8`}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <span className="text-5xl">{vConfig.emoji}</span>
              <div className="text-center sm:text-left flex-1">
                <h2 className={`text-3xl sm:text-4xl font-bold ${vConfig.color}`}>{vConfig.label}</h2>
                <p className="text-sm text-muted-foreground">{vConfig.tagline}</p>
              </div>
              <div className={`px-4 py-2 rounded-[14px] border ${vConfig.border} bg-card/50`}>
                <p className="text-xs text-muted-foreground font-mono text-center">Score</p>
                <p className={`text-3xl font-bold text-center ${vConfig.color}`}>
                  {verdict.overallScore * 10}<span className="text-sm text-muted-foreground">/100</span>
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-foreground/85 leading-relaxed">{verdict.why}</p>

            {/* Strengths & Risks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="rounded-[10px] border border-verdict-go/20 bg-verdict-go/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-verdict-go" />
                  <span className="text-[10px] font-mono uppercase text-verdict-go font-semibold">Strengths</span>
                </div>
                <ul className="space-y-1">
                  {verdict.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <span className="w-1 h-1 rounded-full bg-verdict-go mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[10px] border border-verdict-nogo/20 bg-verdict-nogo/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-verdict-nogo" />
                  <span className="text-[10px] font-mono uppercase text-verdict-nogo font-semibold">Risks</span>
                </div>
                <ul className="space-y-1">
                  {verdict.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <span className="w-1 h-1 rounded-full bg-verdict-nogo mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-[10px] bg-primary/10 border border-primary/20 px-4 py-3 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-mono uppercase text-primary font-semibold mb-0.5">Next Step</p>
                <p className="text-xs font-medium text-foreground">{verdict.nextStep}</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Judge Scorecards */}
        {sortedRatings.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-[14px] border border-border bg-card overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Judge Scorecards
              </span>
              {avgScore && (
                <span className="ml-auto text-xs font-mono text-muted-foreground">
                  Avg: <span className={`font-bold ${scoreColor(avgScore)}`}>{Math.round(avgScore * 10)}/100</span>
                </span>
              )}
            </div>

            <div className="divide-y divide-border">
              {sortedRatings.map((rating, i) => {
                const persona = personas.find((p) => p.id === rating.personaId);
                if (!persona) return null;
                const colors = personaColors[persona.colorKey];

                return (
                  <motion.div
                    key={rating.personaId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.06 }}
                    className="px-4 sm:px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                        <span className={`text-[9px] font-bold ${colors.text}`}>
                          {persona.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${colors.text}`}>{persona.name}</p>
                        <p className="text-[10px] text-muted-foreground">{persona.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${scoreBg(rating.score)} rounded-full`} style={{ width: `${(rating.score / 10) * 100}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${scoreColor(rating.score)}`}>{rating.score * 10}/100</span>
                      </div>
                    </div>
                    {rating.verdict && (
                      <p className="text-xs text-muted-foreground mt-1.5 ml-11">{rating.verdict}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Top Judge Comments */}
        {topComments.length > 0 && topComments[0].persona && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-[14px] border border-border bg-card p-4 sm:p-5"
          >
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Key Insights from the Panel
            </p>
            <div className="space-y-3">
              {topComments.map(({ persona, rating }) => {
                if (!persona) return null;
                const colors = personaColors[persona.colorKey];
                return (
                  <div key={rating.personaId} className="flex gap-3 items-start">
                    <div className={`w-7 h-7 rounded-full border ${colors.border} ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`text-[8px] font-bold ${colors.text}`}>
                        {persona.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${colors.text}`}>{persona.name} — {persona.subtitle}</p>
                      <p className="text-xs text-foreground/75 mt-0.5 leading-relaxed line-clamp-3">
                        {rating.assessment || rating.verdict}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Share CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-3 py-4"
        >
          <p className="text-xs text-muted-foreground">Share this result</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 rounded-[10px]">
              <Share2 className="w-3.5 h-3.5" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { trackEvent("pdf_downloaded", { sessionId: id }); window.print(); }}
              className="gap-1.5 rounded-[10px]"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-[10px]"
              onClick={() => {
                const text = `My startup idea "${session.topic.slice(0, 60)}..." got a ${verdict?.verdict ?? "?"} verdict from Startup Jury AI! Score: ${verdict?.overallScore ?? "?"}/10`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Share on X
            </Button>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>Powered by</span>
          <button onClick={() => navigate("/")} className="text-primary hover:underline font-semibold">Startup Jury AI</button>
        </div>
      </footer>
    </div>
  );
}
