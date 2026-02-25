import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Trash2, Clock, CheckCircle2, Timer } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { JudgeVerdict, PersonaRating } from "@/types/debate";

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
}

function verdictColor(verdict?: string) {
  if (verdict === "GO") return "text-green-400 border-green-400/40 bg-green-400/10";
  if (verdict === "MAYBE") return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  if (verdict === "NO-GO") return "text-red-400 border-red-400/40 bg-red-400/10";
  return "text-muted-foreground border-border bg-muted/30";
}

function isFinished(session: SessionRow) {
  return (
    (session.phase === "judge" && !!session.judge_verdict) ||
    session.phase === "final-ratings"
  );
}

function getInsights(session: SessionRow): { pros: string[]; cons: string[] } {
  const ratings = session.ratings ?? [];
  if (ratings.length > 0) {
    const sorted = [...ratings].sort((a, b) => b.score - a.score);
    const pros = sorted.slice(0, 4).map((r) => r.verdict).filter(Boolean);
    const cons = sorted.slice(-4).map((r) => r.verdict).filter(Boolean);
    return { pros, cons };
  }
  // Fall back to judge verdict strengths/risks
  const v = session.judge_verdict;
  if (v) {
    return { pros: [...v.strengths], cons: [...v.risks, v.why] };
  }
  return { pros: [], cons: [] };
}

function getPhaseDescription(phase: string, rounds?: any[], judgeVerdict?: any) {
  if (phase === "judge" && judgeVerdict) return "Completed · View verdict";
  if (phase === "final-ratings") return "Completed · View grades";
  if (phase === "debating" && rounds) {
    return `Round ${rounds.length}/4 complete`;
  }
  return "Not started";
}

const Dashboard = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();

    // Show welcome toast for first-time sign-in
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
      .select("id, topic, phase, judge_verdict, ratings, created_at, selected_persona_ids, rounds")
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4 relative">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30 shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight truncate">Startup Jury AI</h1>
            <span className="text-xs font-mono text-muted-foreground ml-1 hidden sm:inline">/ dashboard</span>
          </div>
          <MobileNav currentPage="dashboard" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Past Sessions</h2>

          {/* Filter toggle */}
          {!loading && sessions.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border w-fit">
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
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No debates yet.</p>
            <Button
              onClick={() => navigate("/debate")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Your First Debate
            </Button>
          </div>
        ) : (() => {
          const filtered = sessions.filter((s) => {
            if (filter === "finished") return isFinished(s);
            if (filter === "in-progress") return !isFinished(s);
            return true;
          });

          if (filtered.length === 0) {
            return (
              <p className="text-sm text-muted-foreground">
                No {filter === "finished" ? "finished" : "in-progress"} sessions.
              </p>
            );
          }

          return (
            <div className="space-y-3">
              {filtered.map((session, i) => {
                const v = session.judge_verdict;
                const done = isFinished(session);
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className={`rounded-lg border bg-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 group cursor-pointer transition-all ${
                      done
                        ? "border-border hover:border-green-500/40 hover:bg-card/80"
                        : "border-amber-500/30 hover:border-amber-500/60 hover:bg-card/80"
                    }`}
                    onClick={() => navigate(`/debate?session=${session.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{session.topic}</p>
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Finished
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 shrink-0">
                            <Timer className="w-3 h-3" />
                            In Progress
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">· {getPhaseDescription(session.phase, session.rounds, session.judge_verdict)}</span>
                      </div>

                      {/* Pros / cons for finished sessions */}
                      {done && (() => {
                        const { pros, cons } = getInsights(session);
                        if (pros.length === 0 && cons.length === 0) return null;
                        return (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <div className="space-y-1">
                              {pros.map((p, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                  <span className="text-xs text-muted-foreground leading-snug">{p}</span>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1">
                              {cons.map((c, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                  <span className="text-xs text-muted-foreground leading-snug">{c}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {v && (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${verdictColor(v.verdict)}`}>
                            {v.verdict}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{v.overallScore}/10</span>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.id);
                        }}
                        className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-auto sm:ml-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}
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
    </div>
  );
};

export default Dashboard;
