import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Trash2, Clock, CheckCircle2, Timer, TrendingUp, Share2, Crown } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { JudgeVerdict, PersonaRating } from "@/types/debate";
import UpgradeModal from "@/components/UpgradeModal";

type FilterOption = "all" | "in-progress" | "finished";

interface SessionRow {
  id: string;
  topic: string;
  phase: string;
  judge_verdict: JudgeVerdict | null;
  ratings: PersonaRating[];
  created_at: string;
  selected_persona_ids: string[];
  rounds: any[];
  is_public: boolean;
}

function verdictEmoji(verdict?: string) {
  if (verdict === "GO") return "🚀";
  if (verdict === "MAYBE") return "⚠️";
  if (verdict === "NO-GO") return "❌";
  return "";
}

function verdictColor(verdict?: string) {
  if (verdict === "GO") return "text-green-400 border-green-400/40 bg-green-400/10";
  if (verdict === "MAYBE") return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  if (verdict === "NO-GO") return "text-red-400 border-red-400/40 bg-red-400/10";
  return "text-muted-foreground border-border bg-muted/30";
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
}

function isFinished(session: SessionRow) {
  return (
    (session.phase === "judge" && !!session.judge_verdict) ||
    session.phase === "final-ratings"
  );
}

const FREE_EVALUATION_LIMIT = 2;

const Dashboard = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();

    const welcomeKey = "startup_jury_welcomed";
    if (!localStorage.getItem(welcomeKey)) {
      localStorage.setItem(welcomeKey, "true");
      toast({
        title: "Welcome to Startup Jury AI! 🎉",
        description: "You're all set. Start a new debate to pitch your idea to AI judges.",
      });
    }
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("debate_sessions")
      .select("id, topic, phase, judge_verdict, ratings, created_at, selected_persona_ids, rounds, is_public")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load sessions:", error);
    } else {
      setSessions((data as unknown as SessionRow[]) ?? []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("debate_sessions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting session", variant: "destructive" });
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const finishedCount = sessions.filter(isFinished).length;
  const isAtLimit = finishedCount >= FREE_EVALUATION_LIMIT;
  // For now, "pro" is stored in localStorage as a simple flag. Replace with real billing later.
  const isPro = localStorage.getItem("startup_jury_pro") === "true";

  const handleNewDebate = () => {
    if (isAtLimit && !isPro) {
      setShowUpgrade(true);
    } else {
      navigate("/debate");
    }
  };

  const filtered = sessions.filter((s) => {
    if (filter === "finished") return isFinished(s);
    if (filter === "in-progress") return !isFinished(s);
    return true;
  });

  // Stats
  const avgScore = (() => {
    const scored = sessions.filter((s) => s.judge_verdict?.overallScore);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, s) => sum + (s.judge_verdict?.overallScore ?? 0), 0) / scored.length;
    return Math.round(avg * 10) / 10;
  })();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30 shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight truncate">Startup Jury AI</h1>
            <span className="text-xs font-mono text-muted-foreground ml-1 hidden sm:inline">/ dashboard</span>
          </div>
          <MobileNav currentPage="dashboard" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Stats bar */}
        {!loading && sessions.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
              <span className="text-xs text-muted-foreground font-mono">Evaluations</span>
              <span className="text-sm font-bold text-foreground">{finishedCount}</span>
              {!isPro && (
                <span className="text-[10px] text-muted-foreground font-mono">/ {FREE_EVALUATION_LIMIT} free</span>
              )}
            </div>
            {avgScore !== null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">Avg Score</span>
                <span className={`text-sm font-bold ${scoreColor(avgScore)}`}>{avgScore}/10</span>
              </div>
            )}
            {isPro && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-mono font-semibold text-primary">Pro</span>
              </div>
            )}
          </div>
        )}

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Past Sessions</h2>

          <div className="flex items-center gap-2">
            {!loading && sessions.length > 0 && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border">
                {(["all", "in-progress", "finished"] as FilterOption[]).map((opt) => {
                  const labels: Record<FilterOption, string> = {
                    all: "All",
                    "in-progress": "In Progress",
                    finished: "Finished",
                  };
                  return (
                    <button
                      key={opt}
                      onClick={() => setFilter(opt)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        filter === opt
                          ? "bg-background text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {labels[opt]}
                    </button>
                  );
                })}
              </div>
            )}
            <Button
              onClick={handleNewDebate}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              New Debate
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading sessions…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center space-y-4">
            <div className="text-4xl">⚖️</div>
            <p className="text-foreground font-medium">No debates yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Submit your startup idea and watch AI judges debate it across 4 rounds.
            </p>
            <Button
              onClick={() => navigate("/debate")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Your First Jury
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No {filter === "finished" ? "finished" : "in-progress"} sessions.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((session, i) => {
              const v = session.judge_verdict;
              const done = isFinished(session);
              const avgRating = session.ratings?.length > 0
                ? Math.round((session.ratings.reduce((s, r) => s + r.score, 0) / session.ratings.length) * 10) / 10
                : null;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="rounded-lg border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group"
                  onClick={() => navigate(`/debate?session=${session.id}`)}
                >
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* Verdict icon or status */}
                    <div className="shrink-0">
                      {v ? (
                        <span className="text-2xl">{verdictEmoji(v.verdict)}</span>
                      ) : done ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Timer className="w-6 h-6 text-amber-400" />
                      )}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{session.topic}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          })}
                        </span>
                        {done ? (
                          <span className="text-[10px] font-mono text-green-400">Completed</span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-400">
                            Round {session.rounds?.length ?? 0}/4
                          </span>
                        )}
                        {session.is_public && (
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                            <Share2 className="w-2.5 h-2.5" /> Shared
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score & verdict badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {avgRating !== null && (
                        <span className={`text-lg font-bold ${scoreColor(avgRating)}`}>
                          {avgRating}
                        </span>
                      )}
                      {v && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${verdictColor(v.verdict)}`}>
                          {v.verdict}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Upgrade prompt when at limit */}
        {isAtLimit && !isPro && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center space-y-3"
          >
            <Crown className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-base font-semibold text-foreground">You've used all free evaluations</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Upgrade to Pro for unlimited debates, full judge scorecards, downloadable reports, and advanced analysis.
            </p>
            <Button
              onClick={() => setShowUpgrade(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border px-4 sm:px-6 py-6 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <button onClick={() => navigate("/app/terms")} className="hover:text-foreground underline underline-offset-2 transition-colors">
            Terms & Conditions
          </button>
          <span>·</span>
          <button onClick={() => navigate("/app/privacy")} className="hover:text-foreground underline underline-offset-2 transition-colors">
            Privacy Policy
          </button>
        </div>
      </footer>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
};

export default Dashboard;
