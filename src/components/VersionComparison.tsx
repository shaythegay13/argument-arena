import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import type { JudgeVerdict, PersonaRating } from "@/types/debate";

interface VersionEntry {
  id: string;
  version: number;
  overallScore: number;
  verdict: string;
  created_at: string;
}

interface VersionComparisonProps {
  sessionId: string;
}

export default function VersionComparison({ sessionId }: VersionComparisonProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    async function loadVersions() {
      // First get the current session to find the root
      const { data: current } = await (supabase
        .from("debate_sessions")
        .select("id, parent_session_id, version, judge_verdict, ratings, created_at" as any)
        .eq("id", sessionId)
        .single() as any);

      if (!current) {
        setLoading(false);
        return;
      }

      const rootId = current.parent_session_id || current.id;

      // Get all versions: the root + all children
      const { data: siblings } = await (supabase
        .from("debate_sessions")
        .select("id, parent_session_id, version, judge_verdict, ratings, created_at" as any)
        .or(`id.eq.${rootId},parent_session_id.eq.${rootId}`)
        .order("version" as any, { ascending: true }) as any);

      if (!siblings || siblings.length <= 1) {
        setLoading(false);
        return;
      }

      const entries: VersionEntry[] = siblings
        .filter((s: any) => s.judge_verdict)
        .map((s: any) => {
          const verdict = s.judge_verdict as JudgeVerdict;
          const ratings = (s.ratings || []) as PersonaRating[];
          const avgScore = ratings.length > 0
            ? Math.round((ratings.reduce((sum: number, r: PersonaRating) => sum + r.score, 0) / ratings.length) * 10) / 10
            : verdict?.overallScore ?? 0;

          return {
            id: s.id,
            version: s.version || 1,
            overallScore: avgScore,
            verdict: verdict?.verdict ?? "?",
            created_at: s.created_at,
          };
        });

      setVersions(entries);
      setLoading(false);
    }

    loadVersions();
  }, [sessionId]);

  if (loading || versions.length <= 1) return null;

  const currentVersion = versions.find((v) => v.id === sessionId);
  const previousVersion = currentVersion
    ? versions.filter((v) => v.version < currentVersion.version).pop()
    : null;

  const scoreDiff = currentVersion && previousVersion
    ? Math.round((currentVersion.overallScore - previousVersion.overallScore) * 10) / 10
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="rounded-[14px] border border-primary/20 bg-primary/5 px-5 py-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-primary" />
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary font-semibold">
          Iteration History
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {versions.map((v, i) => {
          const isCurrent = v.id === sessionId;
          const prev = i > 0 ? versions[i - 1] : null;
          const diff = prev ? Math.round((v.overallScore - prev.overallScore) * 10) / 10 : null;
          const verdictColor = v.verdict === "GO" ? "text-verdict-go" : v.verdict === "MAYBE" ? "text-verdict-maybe" : "text-verdict-nogo";

          return (
            <div key={v.id} className="flex items-center gap-2">
              {i > 0 && (
                <div className="flex flex-col items-center">
                  {diff !== null && diff > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-verdict-go" />
                  ) : diff !== null && diff < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-verdict-nogo" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  {diff !== null && (
                    <span className={`text-[9px] font-mono font-bold ${diff > 0 ? "text-verdict-go" : diff < 0 ? "text-verdict-nogo" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}{diff}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`rounded-[10px] border px-3 py-2 text-center min-w-[70px] ${
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30"
                }`}
              >
                <p className="text-[9px] font-mono text-muted-foreground">v{v.version}</p>
                <p className={`text-lg font-bold ${verdictColor}`}>
                  {v.overallScore}
                </p>
                <p className={`text-[9px] font-mono font-bold ${verdictColor}`}>
                  {v.verdict}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {scoreDiff !== null && (
        <p className="text-xs text-muted-foreground mt-2">
          {scoreDiff > 0
            ? `📈 Score improved by ${scoreDiff} points from previous version`
            : scoreDiff < 0
            ? `📉 Score decreased by ${Math.abs(scoreDiff)} points from previous version`
            : "Score unchanged from previous version"}
        </p>
      )}
    </motion.div>
  );
}
