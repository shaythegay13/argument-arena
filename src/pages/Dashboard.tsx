import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, Loader2, Trash2, Clock, FileText, Shield, Mail, LayoutDashboard } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { JudgeVerdict } from "@/types/debate";

interface SessionRow {
  id: string;
  topic: string;
  phase: string;
  judge_verdict: JudgeVerdict | null;
  created_at: string;
  selected_persona_ids: string[];
}

function verdictColor(verdict?: string) {
  if (verdict === "GO") return "text-green-400 border-green-400/40 bg-green-400/10";
  if (verdict === "MAYBE") return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  if (verdict === "NO-GO") return "text-red-400 border-red-400/40 bg-red-400/10";
  return "text-muted-foreground border-border bg-muted/30";
}

const Dashboard = () => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("debate_sessions")
      .select("id, topic, phase, judge_verdict, created_at, selected_persona_ids")
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
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Past Sessions</h2>

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
        ) : (
          <div className="space-y-3">
            {sessions.map((session, i) => {
              const v = session.judge_verdict;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="rounded-lg border border-border bg-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{session.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">• {session.phase}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    {v && (
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${verdictColor(v.verdict)}`}>
                        {v.verdict} — {v.overallScore}/10
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(session.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-auto sm:ml-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
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
    </div>
  );
};

export default Dashboard;
