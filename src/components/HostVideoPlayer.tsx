import { Loader2, Video } from "lucide-react";

interface HostVideoPlayerProps {
  clipUrl: string;
  script: string;
  isLoading: boolean;
  roundNumber: number;
}

const HostVideoPlayer = ({ clipUrl, script, isLoading, roundNumber }: HostVideoPlayerProps) => {
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Host Recap — Round {roundNumber}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Generating video recap…</span>
        </div>
      ) : (
        <div className="space-y-3">
          <video
            src={clipUrl}
            autoPlay
            controls
            playsInline
            className="w-full max-h-[320px] bg-black"
            onError={(e) => {
              // Mock URL won't load — show fallback
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div
            className="hidden items-center justify-center py-10 bg-muted/30 text-muted-foreground gap-2"
          >
            <Video className="w-6 h-6" />
            <span className="text-sm">Video host preview (mock mode)</span>
          </div>
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              "{script}"
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default HostVideoPlayer;
