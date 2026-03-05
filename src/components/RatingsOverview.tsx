import { Persona, PersonaRating } from "@/types/debate";
import { Star, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const personaColors: Record<string, { text: string; bg: string; border: string; barBg: string }> = {
  angel: { text: "text-persona-angel", bg: "bg-persona-angel", border: "persona-glow-angel", barBg: "hsl(25, 95%, 53%)" },
  vc: { text: "text-persona-vc", bg: "bg-persona-vc", border: "persona-glow-vc", barBg: "hsl(199, 89%, 60%)" },
  customer: { text: "text-persona-customer", bg: "bg-persona-customer", border: "persona-glow-customer", barBg: "hsl(142, 71%, 45%)" },
  operator: { text: "text-persona-operator", bg: "bg-persona-operator", border: "persona-glow-operator", barBg: "hsl(142, 60%, 50%)" },
  skeptic: { text: "text-persona-skeptic", bg: "bg-persona-skeptic", border: "persona-glow-skeptic", barBg: "hsl(0, 84%, 60%)" },
  quant: { text: "text-persona-quant", bg: "bg-persona-quant", border: "persona-glow-quant", barBg: "hsl(215, 16%, 65%)" },
  insider: { text: "text-persona-insider", bg: "bg-persona-insider", border: "persona-glow-insider", barBg: "hsl(25, 75%, 50%)" },
  visionary: { text: "text-persona-visionary", bg: "bg-persona-visionary", border: "persona-glow-visionary", barBg: "hsl(280, 55%, 55%)" },
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

function verdictBadge(avg: number): { label: string; color: string; emoji: string } {
  if (avg >= 8) return { label: "GO", color: "text-verdict-go border-verdict-go/40 bg-verdict-go/10", emoji: "🟢" };
  if (avg >= 6) return { label: "MAYBE", color: "text-verdict-maybe border-verdict-maybe/40 bg-verdict-maybe/10", emoji: "🟡" };
  return { label: "NO-GO", color: "text-verdict-nogo border-verdict-nogo/40 bg-verdict-nogo/10", emoji: "🔴" };
}

function MetricBar({ label, value, maxValue = 10, color, delay }: { label: string; value: number; maxValue?: number; color: string; delay: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground w-20 text-right truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / maxValue) * 100}%` }}
          transition={{ delay, duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold text-foreground/70 w-5 text-right">{value}</span>
    </div>
  );
}

interface RatingsOverviewProps {
  personas: Persona[];
  ratings: PersonaRating[];
  isGenerating: boolean;
}

export default function RatingsOverview({ personas, ratings, isGenerating }: RatingsOverviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (ratings.length === 0 && !isGenerating) return null;

  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : null;

  const badge = avgRating !== null ? verdictBadge(avgRating) : null;
  const sortedRatings = [...ratings].sort((a, b) => b.score - a.score);

  return (
    <div className="rounded-[14px] border border-primary/20 bg-card overflow-hidden stage-glow">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-primary font-semibold">
              Panel Scorecards
            </h3>
          </div>
          {avgRating !== null && badge && (
            <div className="sm:ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">Avg:</span>
                <span className={`text-2xl font-bold ${scoreColor(avgRating)}`}>{avgRating}</span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-[10px] border ${badge.color}`}>
                {badge.emoji} {badge.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {isGenerating ? (
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: personas.length }).map((_, i) => (
              <div key={i} className="rounded-[14px] bg-muted/30 p-4 space-y-2 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-24" />
                    <div className="h-2 bg-muted rounded w-16" />
                  </div>
                  <div className="h-6 w-8 bg-muted rounded" />
                </div>
                <div className="space-y-1.5 mt-2">
                  <div className="h-2 bg-muted rounded w-full" />
                  <div className="h-2 bg-muted rounded w-4/5" />
                  <div className="h-2 bg-muted rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          {/* Score overview strip */}
          <div className="flex flex-wrap gap-2 mb-5">
            {sortedRatings.map((r, i) => {
              const persona = personas.find((p) => p.id === r.personaId);
              if (!persona) return null;
              const colors = personaColors[persona.colorKey];
              return (
                <motion.button
                  key={r.personaId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setExpandedId(expandedId === r.personaId ? null : r.personaId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] border transition-all ${
                    expandedId === r.personaId
                      ? `${colors.border} ${colors.bg}`
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                    <span className={`text-[9px] font-bold ${colors.text}`}>
                      {persona.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{persona.name.split(" ")[0]}</span>
                  <span className={`text-sm font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Detailed scorecard grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedRatings.map((rating, i) => {
              const persona = personas.find((p) => p.id === rating.personaId);
              if (!persona) return null;
              const colors = personaColors[persona.colorKey];
              const metricEntries = Object.entries(rating.metrics);
              const isExpanded = expandedId === rating.personaId;

              return (
                <motion.div
                  key={rating.personaId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className={`rounded-[14px] border overflow-hidden transition-all ${
                    isExpanded ? `${colors.border} shadow-lg` : "border-border"
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rating.personaId)}
                    className="w-full px-4 py-3 flex items-center gap-3 bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0`}>
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {persona.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-semibold ${colors.text}`}>{persona.name}</p>
                      <p className="text-[10px] text-muted-foreground">{persona.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className={`text-xl font-bold ${scoreColor(rating.score)}`}>{rating.score}</span>
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  <div className="h-1 w-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(rating.score / 10) * 100}%` }}
                      transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                      className={`h-full ${scoreBg(rating.score)}`}
                    />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-muted/10 space-y-3">
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Verdict</p>
                            <p className="text-sm text-foreground/90 font-medium">{rating.verdict}</p>
                          </div>
                          {metricEntries.length > 0 && (
                            <div>
                              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">Scoring Breakdown</p>
                              <div className="space-y-1.5">
                                {metricEntries.map(([label, val], mi) => (
                                  <MetricBar
                                    key={label}
                                    label={label}
                                    value={val}
                                    color={colors.barBg}
                                    delay={mi * 0.08}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {rating.assessment && (
                            <div>
                              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Full Assessment</p>
                              <p className="text-xs text-foreground/75 leading-relaxed">{rating.assessment}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
