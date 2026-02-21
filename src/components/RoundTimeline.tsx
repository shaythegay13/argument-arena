import { Gavel } from "lucide-react";

interface RoundTimelineProps {
  totalRounds: number;
  currentRound: number;
  maxRounds: number;
  onSelectRound: (round: number) => void;
  phase: "setup" | "debating" | "final-ratings" | "judge";
  onJudgeClick?: () => void;
}

const ROUND_LABELS = ["Round 1", "Round 2", "Round 3", "Round 4"];

export default function RoundTimeline({
  totalRounds,
  currentRound,
  maxRounds,
  onSelectRound,
  phase,
  onJudgeClick,
}: RoundTimelineProps) {
  if (totalRounds === 0 && phase === "setup") return null;

  const judgeActive = phase === "judge";
  const judgeEnabled = phase === "final-ratings" || phase === "judge";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground mr-1">
        Rounds
      </span>

      {Array.from({ length: maxRounds }, (_, k) => k + 1).map((round, mapIdx) => {
        const completed = round <= totalRounds;
        const isCurrent = round === currentRound && phase !== "judge";

        return (
          <button
            key={round}
            onClick={() => completed && onSelectRound(round)}
            disabled={!completed}
            className={`
              flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-mono font-semibold transition-all
              ${isCurrent
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : completed
                ? "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full ${completed ? "bg-current" : "border border-current"}`} />
            {ROUND_LABELS[mapIdx]}
          </button>
        );
      })}

      {/* Judge chip */}
      <button
        onClick={() => judgeEnabled && onJudgeClick?.()}
        disabled={!judgeEnabled}
        className={`
          flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-mono font-semibold transition-all
          ${judgeActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : judgeEnabled
            ? "bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer"
            : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
          }
        `}
      >
        <Gavel className="w-3 h-3" />
        Judge
      </button>
    </div>
  );
}
