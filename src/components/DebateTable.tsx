import { Persona, Round, PersonaRating } from "@/types/debate";
import { MessageCircle, X, Star, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const personaColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  angel: { bg: "bg-persona-angel", text: "text-persona-angel", border: "persona-glow-angel", glow: "shadow-[0_0_20px_hsl(38_90%_55%/0.3)]" },
  vc: { bg: "bg-persona-vc", text: "text-persona-vc", border: "persona-glow-vc", glow: "shadow-[0_0_20px_hsl(210_70%_55%/0.3)]" },
  customer: { bg: "bg-persona-customer", text: "text-persona-customer", border: "persona-glow-customer", glow: "shadow-[0_0_20px_hsl(150_60%_45%/0.3)]" },
  operator: { bg: "bg-persona-operator", text: "text-persona-operator", border: "persona-glow-operator", glow: "shadow-[0_0_20px_hsl(280_55%_55%/0.3)]" },
  skeptic: { bg: "bg-persona-skeptic", text: "text-persona-skeptic", border: "persona-glow-skeptic", glow: "shadow-[0_0_20px_hsl(0_65%_55%/0.3)]" },
  quant: { bg: "bg-persona-quant", text: "text-persona-quant", border: "persona-glow-quant", glow: "shadow-[0_0_20px_hsl(190_70%_50%/0.3)]" },
  insider: { bg: "bg-persona-insider", text: "text-persona-insider", border: "persona-glow-insider", glow: "shadow-[0_0_20px_hsl(25_75%_50%/0.3)]" },
  visionary: { bg: "bg-persona-visionary", text: "text-persona-visionary", border: "persona-glow-visionary", glow: "shadow-[0_0_20px_hsl(320_60%_55%/0.3)]" },
};

interface DebateTableProps {
  personas: Persona[];
  currentRound: Round | undefined;
  generatingPersonaIds: string[];
  expandedPersonaId: string | null;
  onExpandPersona: (id: string | null) => void;
  roundNumber: number;
  maxRounds: number;
  isGenerating: boolean;
  ratings: PersonaRating[];
  phase: string;
}

export default function DebateTable({
  personas,
  currentRound,
  generatingPersonaIds,
  expandedPersonaId,
  onExpandPersona,
  roundNumber,
  maxRounds,
  isGenerating,
  ratings,
  phase,
}: DebateTableProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {personas.map((persona, i) => {
        const colors = personaColors[persona.colorKey];
        const message = currentRound?.messages.find((m) => m.personaId === persona.id);
        const isThinking = generatingPersonaIds.includes(persona.id);
        const isExpanded = expandedPersonaId === persona.id;
        const hasMessage = !!message;
        const rating = ratings.find((r) => r.personaId === persona.id);

        return (
          <motion.div
            key={persona.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.35 }}
            className={`
              relative rounded-lg border bg-card overflow-hidden transition-shadow
              ${isExpanded ? `${colors.border} ${colors.glow}` : "border-border"}
            `}
          >
            {/* Header */}
            <button
              onClick={() => hasMessage && onExpandPersona(isExpanded ? null : persona.id)}
              disabled={!hasMessage && !isThinking}
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
            >
              {/* Avatar circle */}
              <motion.div
                animate={isThinking ? { scale: [1, 1.08, 1] } : {}}
                transition={isThinking ? { duration: 1.2, repeat: Infinity } : {}}
                className={`
                  w-10 h-10 rounded-full border-2 ${colors.border} ${colors.bg}
                  flex items-center justify-center shrink-0
                  ${hasMessage ? colors.glow : "opacity-60"}
                `}
              >
                <span className={`text-sm font-bold ${colors.text}`}>
                  {persona.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${colors.text} truncate`}>{persona.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{persona.subtitle}</p>
              </div>

              {/* Status indicators */}
              {isThinking && (
                <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px] font-mono">thinking…</span>
                </div>
              )}
              {hasMessage && !isThinking && !isExpanded && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <MessageCircle className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}
              {rating && (
                <div className={`flex items-center gap-1 shrink-0 ${colors.text}`}>
                  <Star className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">{rating.score}</span>
                </div>
              )}
            </button>

            {/* Per-persona thinking label */}
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-3 overflow-hidden"
                >
                  <p className="text-xs text-muted-foreground italic">
                    {persona.name.split(" ")[0]} is thinking…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded message body */}
            <AnimatePresence>
              {isExpanded && hasMessage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-border pt-3 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); onExpandPersona(null); }}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-sm text-foreground/90 leading-relaxed pr-6">
                      {message!.text}
                    </p>
                    {rating && (
                      <motion.div
                        className="mt-3 pt-2 border-t border-border flex items-center gap-2"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <Star className={`w-4 h-4 ${colors.text}`} />
                        <span className={`text-lg font-bold ${colors.text}`}>{rating.score}/10</span>
                        <span className="text-xs text-muted-foreground ml-1">{rating.verdict}</span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Center info row */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-center">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Round {roundNumber}/{maxRounds}
          {phase === "final-ratings" && ratings.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Star className="w-3 h-3 text-primary" /> Ratings In
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
