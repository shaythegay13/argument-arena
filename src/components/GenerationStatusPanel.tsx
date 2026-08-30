import { CheckCircle2, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/types/debate";

export type GenStatus = "queued" | "generating" | "succeeded" | "refunded" | "failed";

export interface RoundGenStatus {
  roundNumber: number;
  charged: boolean;
  overall: GenStatus;
  personas: Record<string, GenStatus>;
}

const STATUS_META: Record<GenStatus, { label: string; className: string; Icon: typeof Clock }> = {
  queued: { label: "Queued", className: "text-muted-foreground border-border", Icon: Clock },
  generating: { label: "Generating", className: "text-secondary border-secondary/40", Icon: Loader2 },
  succeeded: { label: "Succeeded", className: "text-primary border-primary/40", Icon: CheckCircle2 },
  refunded: { label: "Refunded", className: "text-secondary border-secondary/40", Icon: RotateCcw },
  failed: { label: "Failed · no charge", className: "text-destructive border-destructive/40", Icon: XCircle },
};

const StatusChip = ({ status, label }: { status: GenStatus; label: string }) => {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${meta.className}`}
    >
      <meta.Icon className={`w-3 h-3 ${status === "generating" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
};

interface GenerationStatusPanelProps {
  personas: Persona[];
  rounds: RoundGenStatus[];
  maxRounds: number;
  isPro?: boolean;
  failedCount?: number;
  isRetrying?: boolean;
  onRetryFailed?: () => void;
}

const GenerationStatusPanel = ({
  personas,
  rounds,
  maxRounds,
  isPro,
  failedCount = 0,
  isRetrying = false,
  onRetryFailed,
}: GenerationStatusPanelProps) => {
  if (!personas.length) return null;

  const allRounds: RoundGenStatus[] = Array.from({ length: maxRounds }, (_, i) => {
    const n = i + 1;
    return (
      rounds.find((r) => r.roundNumber === n) ?? {
        roundNumber: n,
        charged: false,
        overall: "queued" as GenStatus,
        personas: {},
      }
    );
  });

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Generation status
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-mono text-muted-foreground">
            {isPro ? "Pro — 0 credits charged" : "1 credit charged once, on round 1"}
          </p>
          {failedCount > 0 && onRetryFailed && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] font-mono uppercase tracking-wide"
              onClick={onRetryFailed}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 mr-1.5" />
              )}
              {isRetrying ? "Retrying…" : `Retry ${failedCount} failed`}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {allRounds.map((round) => (
          <div key={round.roundNumber} className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-foreground">
                Round {round.roundNumber}
                {round.roundNumber === 1 ? " · opening statements" : ""}
              </span>
              <StatusChip status={round.overall} label={STATUS_META[round.overall].label} />
              {round.charged && round.overall !== "refunded" && (
                <span className="text-[10px] font-mono text-muted-foreground">1 credit charged</span>
              )}
              {round.overall === "refunded" && (
                <span className="text-[10px] font-mono text-muted-foreground">credit returned</span>
              )}
              {!round.charged && round.overall === "succeeded" && (
                <span className="text-[10px] font-mono text-muted-foreground">included · 0 credits</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {personas.map((p) => {
                const status = round.personas[p.id] ?? "queued";
                return <StatusChip key={p.id} status={status} label={`${p.name} · ${STATUS_META[status].label}`} />;
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-sans text-muted-foreground leading-relaxed">
        A generation counts as successful once a juror returns their response. Failed or refunded generations are
        never charged, and a started session always finishes all {maxRounds} rounds. Retrying only re-runs the
        jurors marked failed — already-succeeded responses are kept as-is.
      </p>
    </div>
  );
};

export default GenerationStatusPanel;
