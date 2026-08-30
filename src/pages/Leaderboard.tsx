import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Flame, TrendingUp, Eye, Swords, Zap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import CommunityVote from "@/components/CommunityVote";
import logo from "@/assets/logo.png";

type Tab = "week" | "month" | "all" | "controversial" | "viewed";

interface LeaderboardEntry {
  id: string;
  topic: string;
  startup_name: string | null;
  category: string | null;
  judge_verdict: any;
  ratings: any[];
  created_at: string;
  visibility: string;
  view_count: number;
  is_public: boolean;
  selected_persona_ids: string[];
}

function avgScore(ratings: any[]): number {
  if (!ratings?.length) return 0;
  return Math.round((ratings.reduce((s: number, r: any) => s + (r.score || 0), 0) / ratings.length) * 10) / 10;
}

function controversy(ratings: any[]): number {
  if (!ratings?.length || ratings.length < 2) return 0;
  const scores = ratings.map((r: any) => r.score || 0);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return max - min;
}

function verdictBadge(verdict?: string) {
  if (!verdict) return null;
  const config: Record<string, { emoji: string; cls: string }> = {
    GO: { emoji: "🚀", cls: "text-verdict-go border-verdict-go/40 bg-verdict-go/10" },
    MAYBE: { emoji: "⚠️", cls: "text-verdict-maybe border-verdict-maybe/40 bg-verdict-maybe/10" },
    "NO-GO": { emoji: "❌", cls: "text-verdict-nogo border-verdict-nogo/40 bg-verdict-nogo/10" },
  };
  const c = config[verdict];
  if (!c) return null;
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[10px] border ${c.cls}`}>
      {c.emoji} {verdict}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-verdict-go";
  if (score >= 6) return "text-verdict-maybe";
  return "text-verdict-nogo";
}

const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "week", label: "This Week", icon: Flame },
  { id: "month", label: "This Month", icon: TrendingUp },
  { id: "all", label: "All Time", icon: Trophy },
  { id: "controversial", label: "Most Debated", icon: Swords },
  { id: "viewed", label: "Most Viewed", icon: Eye },
];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("week");
  const navigate = useNavigate();

  useEffect(() => {
    loadEntries();
  }, [tab]);

  const loadEntries = async () => {
    setLoading(true);

    let query = supabase
      .from("debate_sessions")
      .select("id, topic, startup_name, category, judge_verdict, ratings, created_at, visibility, view_count, is_public, selected_persona_ids" as any)
      .eq("is_public", true)
      .in("visibility", ["anonymous", "public"])
      .not("judge_verdict", "is", null);

    // Time filters
    const now = new Date();
    if (tab === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", weekAgo);
    } else if (tab === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", monthAgo);
    }

    if (tab === "viewed") {
      query = query.order("view_count" as any, { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(50);

    const { data, error } = await query;
    if (error) {
      console.error("Leaderboard load error:", error);
      setEntries([]);
    } else {
      let items = (data as unknown as LeaderboardEntry[]) ?? [];

      // Sort by score for week/month/all, by controversy for controversial
      if (tab === "controversial") {
        items.sort((a, b) => controversy(b.ratings) - controversy(a.ratings));
      } else if (tab !== "viewed") {
        items.sort((a, b) => avgScore(b.ratings) - avgScore(a.ratings));
      }

      setEntries(items);
    }
    setLoading(false);
  };

  // Increment view count when clicking an entry
  const handleEntryClick = async (entry: LeaderboardEntry) => {
    // Fire and forget view count increment via secure RPC
    (supabase as any)
      .rpc("increment_view_count", { p_id: entry.id })
      .then(() => {});
    navigate(`/result/${entry.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Leaderboard — Top Community-Voted Startup Ideas | Startup Jury AI</title>
        <meta name="description" content="See which startup ideas the community ranks highest. Browse top-voted verdicts from the Startup Jury AI leaderboard." />
        <link rel="canonical" href="https://www.startupjuryai.com/leaderboard" />
        <meta property="og:title" content="Leaderboard — Startup Jury AI" />
        <meta property="og:description" content="Top community-voted startup verdicts and pitches." />
        <meta property="og:url" content="https://www.startupjuryai.com/leaderboard" />
      </Helmet>
      <header className="border-b border-border px-4 sm:px-4 sm:px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="Startup Jury AI"
              className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12 cursor-pointer w-auto"
              width={307}
              height={305}
              decoding="async"
              onClick={() => navigate("/")}
            />
            <span className="text-xs font-mono text-muted-foreground ml-1 hidden sm:inline">/ leaderboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="rounded-[10px]">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Try It Free
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <Trophy className="w-7 h-7 text-primary" />
            Startup Jury Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            The highest-scoring startup ideas evaluated by our AI jury panel.
            See how your idea stacks up.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-[14px] bg-muted/40 border border-border w-fit mx-auto flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading leaderboard…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-card p-10 text-center space-y-3">
            <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-foreground font-medium">No public ideas yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Be the first to share your startup evaluation on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const score = avgScore(entry.ratings);
              const v = entry.judge_verdict;
              const controv = controversy(entry.ratings);
              const displayName = entry.visibility === "anonymous"
                ? (entry.startup_name || "Anonymous Idea")
                : (entry.startup_name || entry.topic.slice(0, 80));

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => handleEntryClick(entry)}
                  className="rounded-[14px] border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group"
                >
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* Rank */}
                    <div className="shrink-0 w-8 text-center">
                      {i < 3 ? (
                        <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span>
                      ) : (
                        <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {entry.category && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20">
                            {entry.category}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        {tab === "controversial" && (
                          <span className="text-[10px] font-mono text-verdict-maybe">
                            Δ{controv.toFixed(1)} spread
                          </span>
                        )}
                        {tab === "viewed" && (
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                            <Eye className="w-2.5 h-2.5" /> {entry.view_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score + Verdict + Votes */}
                    <div className="flex items-center gap-2 shrink-0">
                      <CommunityVote sessionId={entry.id} compact />
                      <span className={`text-lg font-bold ${scoreColor(score)}`}>
                        {score}
                      </span>
                      {v && verdictBadge(v.verdict)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-4 sm:px-6 py-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>Powered by</span>
          <button onClick={() => navigate("/")} className="text-primary hover:underline font-semibold">
            Startup Jury AI
          </button>
        </div>
      </footer>
    </div>
  );
}
