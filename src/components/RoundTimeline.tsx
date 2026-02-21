interface RoundTimelineProps {
  totalRounds: number;
  currentRound: number;
  onSelectRound: (round: number) => void;
}

export default function RoundTimeline({
  totalRounds,
  currentRound,
  onSelectRound,
}: RoundTimelineProps) {
  if (totalRounds === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground mr-1">
        Rounds
      </span>
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
        <button
          key={round}
          onClick={() => onSelectRound(round)}
          className={`
            w-9 h-9 rounded-md text-sm font-mono font-semibold transition-all
            ${round === currentRound
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
        >
          {round}
        </button>
      ))}
    </div>
  );
}
