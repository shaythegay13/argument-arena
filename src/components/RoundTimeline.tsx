import { Gavel, Star } from "lucide-react";
import { motion } from "framer-motion";

interface RoundTimelineProps {
  totalRounds: number;
  currentRound: number;
  maxRounds: number;
  onSelectRound: (round: number) => void;
  phase: "setup" | "debating" | "final-ratings" | "judge";
  onJudgeClick?: () => void;
  onGradesClick?: () => void;
  hasRatings?: boolean;
  hasVerdict?: boolean;
}

const ROUND_LABELS = [
  "Initial Reactions",
  "Risks & Critiques",
  "Founder Defense",
  "Final Statements",
];

export default function RoundTimeline({
  totalRounds,
  currentRound,
  maxRounds,
  onSelectRound,
  phase,
  onJudgeClick,
  onGradesClick,
  hasRatings = false,
  hasVerdict = false,
}: RoundTimelineProps) {
  if (totalRounds === 0 && phase === "setup") return null;

  const gradesActive = phase === "final-ratings";
  const gradesEnabled = (totalRounds >= maxRounds && phase === "debating") || phase === "final-ratings" || phase === "judge" || hasRatings;
  const judgeActive = phase === "judge";
  const judgeEnabled = phase === "final-ratings" || phase === "judge" || hasVerdict;

  return (
    <nav aria-label="Debate rounds and results" className="flex items-center gap-1 sm:gap-1.5 flex-wrap overflow-x-auto">
      {Array.from({ length: maxRounds }, (_, k) => k + 1).map((round) => {
        const completed = round <= totalRounds;
        const isCurrent = round === currentRound && phase === "debating";

        return (
          <motion.button
            key={round}
            whileHover={completed ? { scale: 1.05 } : {}}
            whileTap={completed ? { scale: 0.95 } : {}}
            onClick={() => completed && onSelectRound(round)}
            disabled={!completed}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Round ${round}: ${ROUND_LABELS[round - 1] ?? `Round ${round}`}${completed ? "" : " (not yet available)"}`}
            className={`
              flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-7 sm:h-8 rounded-md text-[10px] sm:text-xs font-mono font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${isCurrent
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : completed
                ? "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
              }
            `}
          >
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${completed ? "bg-current" : "border border-current"}`} />
            <span className="hidden sm:inline">{ROUND_LABELS[round - 1] ?? `Round ${round}`}</span>
            <span className="sm:hidden">R{round}</span>
          </motion.button>
        );
      })}

      {/* Separator */}
      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Grades chip */}
      <motion.button
        whileHover={gradesEnabled ? { scale: 1.05 } : {}}
        whileTap={gradesEnabled ? { scale: 0.95 } : {}}
        onClick={() => gradesEnabled && onGradesClick?.()}
        disabled={!gradesEnabled}
        aria-current={gradesActive ? "step" : undefined}
        aria-label="View panel grades"
        className={`
          flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-7 sm:h-8 rounded-md text-[10px] sm:text-xs font-mono font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${gradesActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : gradesEnabled
            ? "bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer"
            : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
          }
        `}
      >
        <Star className="w-3 h-3" aria-hidden="true" />
        Grades
      </motion.button>

      {/* Judge chip */}
      <motion.button
        whileHover={judgeEnabled ? { scale: 1.05 } : {}}
        whileTap={judgeEnabled ? { scale: 0.95 } : {}}
        onClick={() => judgeEnabled && onJudgeClick?.()}
        disabled={!judgeEnabled}
        aria-current={judgeActive ? "step" : undefined}
        aria-label="View the judge's verdict"
        className={`
          flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 h-7 sm:h-8 rounded-md text-[10px] sm:text-xs font-mono font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${judgeActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : judgeEnabled
            ? "bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer"
            : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
          }
        `}
      >
        <Gavel className="w-3 h-3" aria-hidden="true" />
        Verdict
      </motion.button>
    </nav>
  );
}
