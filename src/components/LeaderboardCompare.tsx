import { X } from "lucide-react";
import { PERSONA_MAP } from "@/data/personas";
import { Button } from "@/components/ui/button";

export interface CompareEntry {
  id: string;
  label: string;
  category: string | null;
  created_at: string;
  score: number;
  judge_verdict: any;
  ratings: any[];
  selected_persona_ids: string[];
}

function personaName(id: string): string {
  return PERSONA_MAP[id]?.name ?? id;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-verdict-go";
  if (score >= 6) return "text-verdict-maybe";
  return "text-verdict-nogo";
}

/**
 * Side-by-side comparison of up to 3 public leaderboard sessions:
 * verdict, overall grade, per-judge scores and the panel that heard it.
 */
export default function LeaderboardCompare({
  entries,
  onRemove,
  onClear,
  onOpen,
}: {
  entries: CompareEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: (id: string) => void;
}) {
  if (entries.length === 0) return null;

  // Union of all judges across the compared runs, so rows line up.
  const judgeIds = Array.from(
    new Set(entries.flatMap((e) => (e.ratings ?? []).map((r: any) => r.personaId as string)))
  );

  return (
    <section
      aria-label="Session comparison"
      className="rounded-[14px] border border-primary/40 bg-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">
          Comparing {entries.length} run{entries.length > 1 ? "s" : ""}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs">
          Clear all
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr>
              <th className="w-32 text-[10px] font-mono uppercase tracking-widest text-muted-foreground pb-2">
                Metric
              </th>
              {entries.map((e) => (
                <th key={e.id} className="pb-2 align-top">
                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => onOpen(e.id)}
                      className="text-xs font-semibold text-foreground hover:text-primary text-left leading-snug"
                    >
                      {e.label}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${e.label} from comparison`}
                      onClick={() => onRemove(e.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {e.category ?? "Uncategorized"} ·{" "}
                    {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-t border-border">
              <td className="py-2 text-xs text-muted-foreground">Verdict</td>
              {entries.map((e) => (
                <td key={e.id} className="py-2 text-xs font-mono font-bold text-foreground">
                  {e.judge_verdict?.verdict ?? "—"}
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 text-xs text-muted-foreground">Overall grade</td>
              {entries.map((e) => (
                <td key={e.id} className={`py-2 text-sm font-bold ${scoreColor(e.score)}`}>
                  {e.score}
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="py-2 text-xs text-muted-foreground">Percentile</td>
              {entries.map((e) => (
                <td key={e.id} className="py-2 text-xs text-foreground">
                  {typeof e.judge_verdict?.percentile === "number" ? `${e.judge_verdict.percentile}th` : "—"}
                </td>
              ))}
            </tr>
            {judgeIds.map((pid) => (
              <tr key={pid} className="border-t border-border">
                <td className="py-2 text-xs text-muted-foreground">{personaName(pid)}</td>
                {entries.map((e) => {
                  const r = (e.ratings ?? []).find((x: any) => x.personaId === pid);
                  return (
                    <td key={e.id} className="py-2 text-xs">
                      {r ? (
                        <span className={`font-bold ${scoreColor(r.score ?? 0)}`}>{r.score}</span>
                      ) : (
                        <span className="text-muted-foreground/50">not on panel</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="py-2 text-xs text-muted-foreground">Panel size</td>
              {entries.map((e) => (
                <td key={e.id} className="py-2 text-xs text-foreground">
                  {e.selected_persona_ids?.length ?? e.ratings?.length ?? 0} judges
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
