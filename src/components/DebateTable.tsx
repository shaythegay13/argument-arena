import { Persona, Round, PersonaRating } from "@/types/debate";
import { MessageCircle, X, Star } from "lucide-react";
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

const seatPositions: Record<number, { top: string; left: string; bubbleDir: string }[]> = {
  2: [
    { top: "50%", left: "5%", bubbleDir: "right" },
    { top: "50%", left: "95%", bubbleDir: "left" },
  ],
  3: [
    { top: "15%", left: "50%", bubbleDir: "bottom" },
    { top: "75%", left: "10%", bubbleDir: "right" },
    { top: "75%", left: "90%", bubbleDir: "left" },
  ],
  4: [
    { top: "10%", left: "25%", bubbleDir: "bottom" },
    { top: "10%", left: "75%", bubbleDir: "bottom" },
    { top: "85%", left: "25%", bubbleDir: "top" },
    { top: "85%", left: "75%", bubbleDir: "top" },
  ],
};

const bubbleOrigin = (dir: string) => {
  switch (dir) {
    case "bottom": return { y: -12, x: 0 };
    case "top": return { y: 12, x: 0 };
    case "right": return { x: -12, y: 0 };
    case "left": return { x: 12, y: 0 };
    default: return { y: -12, x: 0 };
  }
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
  const seats = seatPositions[personas.length] || seatPositions[4];
  const allResponsesReady = currentRound && currentRound.messages.length === personas.length && generatingPersonaIds.length === 0;

  return (
    <div className="relative w-full" style={{ paddingBottom: "70%" }}>
      {/* Table surface */}
      <motion.div
        className="absolute inset-[15%] rounded-full bg-secondary/60 border-2 border-border shadow-inner"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-[17%] rounded-full bg-secondary/30 border border-border/50"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      />

      {/* Center content */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3 max-w-[200px]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Round {roundNumber}/{maxRounds}
        </div>

        <AnimatePresence mode="wait">
          {phase === "final-ratings" && ratings.length > 0 ? (
            <motion.div
              key="ratings-in"
              className="flex flex-col items-center gap-1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Star className="w-5 h-5 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Ratings In</span>
            </motion.div>
          ) : isGenerating ? (
            <motion.div
              key="thinking"
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Thinking…
            </motion.div>
          ) : allResponsesReady ? (
            <motion.div
              key="ready"
              className="flex flex-col items-center gap-1"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground">Click to read</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Persona seats */}
      {personas.map((persona, i) => {
        const seat = seats[i];
        const colors = personaColors[persona.colorKey];
        const message = currentRound?.messages.find(m => m.personaId === persona.id);
        const isThinking = generatingPersonaIds.includes(persona.id);
        const isExpanded = expandedPersonaId === persona.id;
        const hasMessage = !!message;
        const rating = ratings.find(r => r.personaId === persona.id);
        const origin = bubbleOrigin(seat.bubbleDir);

        return (
          <motion.div
            key={persona.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ top: seat.top, left: seat.left }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.15 + i * 0.1,
            }}
          >
            {/* Chat bubble */}
            <AnimatePresence>
              {isExpanded && hasMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, ...origin }}
                  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, ...origin }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`
                    absolute z-30 w-64 sm:w-72 rounded-lg border ${colors.border} bg-card p-4 shadow-xl
                    ${seat.bubbleDir === "bottom" ? "top-full mt-3 left-1/2 -translate-x-1/2" : ""}
                    ${seat.bubbleDir === "top" ? "bottom-full mb-3 left-1/2 -translate-x-1/2" : ""}
                    ${seat.bubbleDir === "right" ? "left-full ml-3 top-1/2 -translate-y-1/2" : ""}
                    ${seat.bubbleDir === "left" ? "right-full mr-3 top-1/2 -translate-y-1/2" : ""}
                  `}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onExpandPersona(null); }}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className={`text-xs font-mono uppercase tracking-wide ${colors.text} mb-2`}>
                    {persona.subtitle}
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {message!.text}
                  </p>
                  {rating && (
                    <motion.div
                      className="mt-3 pt-2 border-t border-border flex items-center gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Star className={`w-4 h-4 ${colors.text}`} />
                      <span className={`text-lg font-bold ${colors.text}`}>{rating.rating}/10</span>
                      <span className="text-xs text-muted-foreground ml-1">{rating.reason}</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar */}
            <motion.button
              onClick={() => {
                if (hasMessage) {
                  onExpandPersona(isExpanded ? null : persona.id);
                }
              }}
              disabled={!hasMessage && !isThinking}
              whileHover={hasMessage ? { scale: 1.12 } : {}}
              whileTap={hasMessage ? { scale: 0.95 } : {}}
              animate={isThinking ? { scale: [1, 1.06, 1] } : {}}
              transition={isThinking ? { duration: 1.2, repeat: Infinity } : { type: "spring", stiffness: 400, damping: 17 }}
              className={`
                relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${colors.border}
                ${colors.bg} flex flex-col items-center justify-center
                cursor-pointer
                ${hasMessage ? colors.glow : "opacity-60"}
                ${isExpanded ? `scale-110 ring-2 ring-offset-2 ring-offset-background ${colors.glow}` : ""}
              `}
              style={{ ["--tw-ring-color" as string]: `hsl(var(--persona-${persona.colorKey}))` }}
            >
              <span className={`text-lg sm:text-xl font-bold ${colors.text}`}>
                {persona.name.split(" ").map(n => n[0]).join("")}
              </span>

              {/* Message badge */}
              <AnimatePresence>
                {hasMessage && !isExpanded && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <MessageCircle className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rating badge */}
              <AnimatePresence>
                {rating && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.3 }}
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center`}
                  >
                    <span className={`text-xs font-bold ${colors.text}`}>{rating.rating}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Name label */}
            <motion.div
              className="text-center mt-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <p className={`text-xs font-semibold ${colors.text}`}>{persona.name.split(" ")[0]}</p>
              <p className="text-[10px] text-muted-foreground">{persona.subtitle}</p>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
