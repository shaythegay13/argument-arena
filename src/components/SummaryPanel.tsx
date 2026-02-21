interface SummaryPanelProps {
  summary: string | null;
  isGenerating: boolean;
}

export default function SummaryPanel({ summary, isGenerating }: SummaryPanelProps) {
  if (!summary && !isGenerating) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 stage-glow">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <h3 className="text-sm font-mono uppercase tracking-widest text-primary font-semibold">
          Judge's Summary
        </h3>
      </div>

      {isGenerating ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
          <div className="h-3 bg-muted rounded w-4/6" />
          <div className="h-3 bg-muted rounded w-full mt-4" />
          <div className="h-3 bg-muted rounded w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
          {summary}
        </p>
      )}
    </div>
  );
}
