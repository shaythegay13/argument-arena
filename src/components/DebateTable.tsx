import { Persona, Round, PersonaRating } from "@/types/debate";
import { MessageCircle, Star, Loader2 } from "lucide-react";
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

const ROUND_THEMES: Record<number, { label: string; description: string }> = {
  1: { label: "Initial Reactions", description: "First impressions from the panel" },
  2: { label: "Risks & Critiques", description: "Digging into challenges and red flags" },
  3: { label: "Founder Defense", description: "Responding to critiques and pivoting" },
  4: { label: "Final Evaluations", description: "Closing arguments before scoring" },
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
  const theme = ROUND_THEMES[roundNumber] || { label: `Round ${roundNumber}`, description: "" };
  const messagesInOrder = currentRound?.messages ?? [];
  const thinkingPersonas = personas.filter((p) => generatingPersonaIds.includes(p.id));
  const respondedPersonas = personas.filter((p) =>
    messagesInOrder.some((m) => m.personaId === p.id)
  );

  return (
    <div className="space-y-4">
      {/* Round header */}
      <motion.div
        key={roundNumber}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary/15 px-2.5 py-1 rounded-md border border-primary/25">
            Round {roundNumber}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{theme.label}</h3>
            <p className="text-[11px] text-muted-foreground">{theme.description}</p>
          </div>
        </div>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-mono text-muted-foreground">
          {messagesInOrder.length}/{personas.length} responses
        </span>
      </motion.div>

      {/* Conversation stream */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {messagesInOrder.map((message, i) => {
            const persona = personas.find((p) => p.id === message.personaId);
            if (!persona) return null;
            const colors = personaColors[persona.colorKey];
            const rating = ratings.find((r) => r.personaId === persona.id);
            const isExpanded = expandedPersonaId === persona.id;

            return (
              <motion.div
                key={`${roundNumber}-${message.personaId}`}
                initial={{ opacity: 0, x: -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.4, ease: "easeOut" }}
                layout
                className="flex gap-3 items-start"
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0 ${colors.glow}`}
                >
                  <span className={`text-xs font-bold ${colors.text}`}>
                    {persona.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={`flex-1 min-w-0 rounded-lg border transition-all cursor-pointer ${
                    isExpanded
                      ? `${colors.border} ${colors.glow} bg-card`
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                  onClick={() => onExpandPersona(isExpanded ? null : persona.id)}
                >
                  {/* Bubble header */}
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <span className={`text-sm font-semibold ${colors.text}`}>{persona.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {persona.subtitle}
                    </span>
                    {rating && (
                      <div className={`flex items-center gap-1 ml-auto ${colors.text}`}>
                        <Star className="w-3 h-3" />
                        <span className="text-xs font-bold">{rating.score}/10</span>
                      </div>
                    )}
                  </div>

                  {/* Message preview or full text */}
                  <div className="px-4 pb-3">
                    <p className={`text-sm text-foreground/85 leading-relaxed ${
                      !isExpanded ? "line-clamp-3" : ""
                    }`}>
                      {message.text}
                    </p>
                    {!isExpanded && message.text.length > 200 && (
                      <button className="text-xs text-primary mt-1 hover:underline font-medium">
                        Read full response →
                      </button>
                    )}
                  </div>

                  {/* Expanded rating details */}
                  <AnimatePresence>
                    {isExpanded && rating && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-2 border-t border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className={`w-4 h-4 ${colors.text}`} />
                            <span className={`text-base font-bold ${colors.text}`}>{rating.score}/10</span>
                            <span className="text-xs text-muted-foreground">{rating.verdict}</span>
                          </div>
                          {Object.entries(rating.metrics).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(rating.metrics).map(([label, val]) => (
                                <span
                                  key={label}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                >
                                  {label}: {val}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Thinking indicators */}
        <AnimatePresence>
          {thinkingPersonas.map((persona, i) => {
            const colors = personaColors[persona.colorKey];
            return (
              <motion.div
                key={`thinking-${persona.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 items-start"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-10 h-10 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center shrink-0 opacity-70`}
                >
                  <span className={`text-xs font-bold ${colors.text}`}>
                    {persona.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </motion.div>
                <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${colors.text}`}>{persona.name.split(" ")[0]}</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-[11px] font-mono italic">thinking…</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2.5 bg-muted rounded w-full animate-pulse" />
                    <div className="h-2.5 bg-muted rounded w-4/5 animate-pulse" />
                    <div className="h-2.5 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {messagesInOrder.length === 0 && thinkingPersonas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-mono">Waiting for round to begin…</p>
          </div>
        )}
      </div>
    </div>
  );
}
