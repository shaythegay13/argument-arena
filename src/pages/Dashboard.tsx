import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, Trash2, CheckCircle2, Timer, Share2, Crown, Settings, RotateCcw } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { JudgeVerdict, PersonaRating } from "@/types/debate";
import UpgradeModal from "@/components/UpgradeModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import logo from "@/assets/logo.png";

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
  parent_session_id: string | null;
  version: number;
}

function verdictEmoji(verdict?: string) {
  if (verdict === "GO") return "🚀";
  if (verdict === "MAYBE") return "⚠️";
  if (verdict === "NO-GO") return "❌";
  return "";
}

function verdictColor(verdict?: string) {
  if (verdict === "GO") return "text-verdict-go border-verdict-go/40 bg-verdict-go/10";
  if (verdict === "MAYBE") return "text-verdict-maybe border-verdict-maybe/40 bg-verdict-maybe/10";
  if (verdict === "NO-GO") return "text-verdict-nogo border-verdict-nogo/40 bg-verdict-nogo/10";
  return "text-muted-foreground border-border bg-muted/30";
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-verdict-go";
  if (score >= 6) return "text-verdict-maybe";
  return "text-verdict-nogo";
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
      .select("id, topic, phase, judge_verdict, ratings, created_at, selected_persona_ids, rounds, is_public, parent_session_id, version" as any)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load sessions:", error);
    } else {
      setSessions((data as unknown as SessionRow[]) ?? []);
    }
    setLoading(false);
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("debate_sessions").delete().eq("id", deleteTarget);
    if (error) {
      toast({ title: "Error deleting session", variant: "destructive" });
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }, [deleteTarget, toast]);

  const credits = subscription.credits;
  const hasCredits = isPro || credits > 0;

  const handleNewDebate = () => {
    if (!hasCredits) {
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


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4 relative">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12" />
            <span className="text-xs font-mono text-muted-foreground ml-1 hidden sm:inline">/ dashboard</span>
          </div>
          <MobileNav currentPage="dashboard" isPro={isPro} onUpgradeClick={() => setShowUpgrade(true)} onNewDebate={handleNewDebate} />
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6 sm:py-8 space-y-5">
        {/* Pro manage button */}
        {!loading && isPro && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => subscription.manageSubscription()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono font-semibold text-primary">Pro</span>
              <Settings className="w-3 h-3 text-primary/60 ml-1" />
            </button>
          </div>
        )}

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">Past Sessions</h2>

          <div className="flex items-center gap-2">
            {!loading && sessions.length > 0 && (
              <div className="flex items-center gap-1 p-1 rounded-[14px] bg-muted/40 border border-border">
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
                      className={`px-3 py-1 rounded-[10px] text-xs font-medium transition-all ${
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
              className="font-semibold rounded-[10px]"
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
          <div className="rounded-[14px] border border-border bg-card p-10 text-center space-y-4">
            <div className="text-4xl">⚖️</div>
            <p className="text-foreground font-medium">No debates yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Submit your startup idea and watch AI judges debate it across 4 rounds.
            </p>
            <Button
              onClick={() => navigate("/debate")}
              className="rounded-[10px]"
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

              // Find other versions of this idea
              const rootId = (session as any).parent_session_id || session.id;
              const versionSiblings = sessions.filter((s) => {
                const sRoot = (s as any).parent_session_id || s.id;
                return sRoot === rootId && s.id !== session.id;
              });
              const hasVersions = versionSiblings.length > 0;
              const sessionVersion = (session as any).version || 1;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="rounded-[14px] border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group"
                  onClick={() => navigate(`/debate?session=${session.id}`)}
                >
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="shrink-0">
                      {v ? (
                        <span className="text-2xl">{verdictEmoji(v.verdict)}</span>
                      ) : done ? (
                        <CheckCircle2 className="w-6 h-6 text-verdict-go" />
                      ) : (
                        <Timer className="w-6 h-6 text-verdict-maybe" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{session.topic}</p>
                        {(hasVersions || sessionVersion > 1) && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                            v{sessionVersion}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          })}
                        </span>
                        {done ? (
                          <span className="text-[10px] font-mono text-verdict-go">Completed</span>
                        ) : (
                          <span className="text-[10px] font-mono text-verdict-maybe">
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

                    <div className="flex items-center gap-2 shrink-0">
                      {avgRating !== null && (
                        <span className={`text-lg font-bold ${scoreColor(avgRating)}`}>
                          {avgRating}
                        </span>
                      )}
                      {v && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[10px] border ${verdictColor(v.verdict)}`}>
                          {v.verdict}
                        </span>
                      )}
                      {done && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/debate?iterate=${session.id}`);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-primary hover:text-primary hover:bg-primary/10 transition-opacity h-8 w-8 p-0"
                          title="Re-evaluate with improvements"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(session.id);
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity h-8 w-8 p-0"
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

        {/* Upgrade prompt */}
        {isAtLimit && !isPro && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[14px] border border-primary/30 bg-primary/5 p-5 text-center space-y-3"
          >
            <Crown className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-base font-semibold text-foreground">You've used all free evaluations</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Upgrade to Pro for unlimited debates, full judge scorecards, downloadable reports, and advanced analysis.
            </p>
            <Button
              onClick={() => setShowUpgrade(true)}
              className="rounded-[10px]"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <button onClick={() => navigate("/app/terms")} className="hover:text-foreground underline underline-offset-2 transition-colors">
            Terms & Conditions
          </button>
          <span>·</span>
          <button onClick={() => navigate("/app/privacy")} className="hover:text-foreground underline underline-offset-2 transition-colors">
            Privacy Policy
          </button>
        </div>
      </footer>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} isPro={subscription.isPro} credits={subscription.credits} subscriptionEnd={subscription.subscriptionEnd} onCheckout={subscription.startCheckout} onPurchaseCredits={subscription.purchaseCredits} onManage={subscription.manageSubscription} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this debate session and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
