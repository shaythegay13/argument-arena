import { Persona, PersonaRating } from "@/types/debate";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const personaTextColors: Record<string, string> = {
  angel: "text-persona-angel",
  vc: "text-persona-vc",
  customer: "text-persona-customer",
  operator: "text-persona-operator",
  skeptic: "text-persona-skeptic",
  quant: "text-persona-quant",
  insider: "text-persona-insider",
  visionary: "text-persona-visionary",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
}

function verdictBadge(avg: number): { label: string; color: string; emoji: string } {
  if (avg >= 8) return { label: "GO", color: "text-green-400 border-green-400/40 bg-green-400/10", emoji: "🟢" };
  if (avg >= 6) return { label: "MAYBE", color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10", emoji: "🟡" };
  return { label: "NO-GO", color: "text-red-400 border-red-400/40 bg-red-400/10", emoji: "🔴" };
}

interface ScoreBarProps {
  personas: Persona[];
  ratings: PersonaRating[];
}

function ScoreBar({ personas, ratings }: ScoreBarProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm border border-border rounded-md px-4 py-2.5 bg-muted/30">
      {ratings.map((r, i) => {
        const persona = personas.find((p) => p.id === r.personaId);
        const color = scoreColor(r.score);
        return (
          <span key={r.personaId} className="flex items-center gap-0.5">
            {i > 0 && <span className="text-muted-foreground/40 mr-2">|</span>}
            <span className="text-muted-foreground text-xs">{persona?.name.split(" ")[0]}:</span>
            <span className={`font-bold ml-1 ${color}`}>{r.score}</span>
          </span>
        );
      })}
    </div>
  );
}

interface RatingsOverviewProps {
  personas: Persona[];
  ratings: PersonaRating[];
  isGenerating: boolean;
}

export default function RatingsOverview({ personas, ratings, isGenerating }: RatingsOverviewProps) {
  if (ratings.length === 0 && !isGenerating) return null;

  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : null;

  const badge = avgRating !== null ? verdictBadge(avgRating) : null;

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 stage-glow space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-mono uppercase tracking-widest text-primary font-semibold">
          Final Scores
        </h3>
        {avgRating !== null && badge && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{avgRating}/10</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${badge.color}`}>
              {badge.emoji} {badge.label}
            </span>
          </div>
        )}
      </div>

      {isGenerating ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-4/5" />
          <div className="h-3 bg-muted rounded w-3/5" />
        </div>
      ) : (
        <>
          {/* Horizontal score bar */}
          {ratings.length > 0 && <ScoreBar personas={personas} ratings={ratings} />}

          {/* Per-persona score cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ratings.map((rating, i) => {
              const persona = personas.find((p) => p.id === rating.personaId);
              if (!persona) return null;
              const textColor = personaTextColors[persona.colorKey];
              const color = scoreColor(rating.score);
              const metricEntries = Object.entries(rating.metrics);
              return (
                <motion.div
                  key={rating.personaId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/30"
                >
                  <span className={`text-2xl font-bold ${color} min-w-[2rem] text-center`}>
                    {rating.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${textColor}`}>{persona.name}</p>
                    <p className="text-xs text-muted-foreground mb-1.5">{rating.verdict}</p>
                    {metricEntries.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {metricEntries.map(([label, val]) => (
                          <span
                            key={label}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {label}:{val}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
