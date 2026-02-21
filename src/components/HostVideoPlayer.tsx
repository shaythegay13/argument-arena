import { Loader2, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface HostVideoPlayerProps {
  clipUrl: string;
  script: string;
  isLoading: boolean;
  roundNumber: number;
}

const STEPS = [
  "Setting up conversation…",
  "Connecting to host avatar…",
  "Almost ready…",
];

const HostVideoPlayer = ({ clipUrl, script, isLoading, roundNumber }: HostVideoPlayerProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoading) { setStepIndex(0); setElapsed(0); return; }
    const interval = setInterval(() => {
      setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
    }, 4000);
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [isLoading]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const isConversationUrl = clipUrl && clipUrl.startsWith("http");

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Video className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Host Recap — Round {roundNumber}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <motion.span
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm"
          >
            {STEPS[stepIndex]}
          </motion.span>
          <span className="text-[10px] font-mono">{formatTime(elapsed)} elapsed</span>
          <div className="px-6 w-full max-w-xs">
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary/60 rounded-full"
                initial={{ width: "10%" }}
                animate={{ width: `${Math.min(10 + stepIndex * 30, 95)}%` }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      ) : isConversationUrl ? (
        <div className="space-y-3">
          <iframe
            src={clipUrl}
            allow="camera;microphone;display-capture"
            className="w-full aspect-video border-0"
            title={`Host recap for round ${roundNumber}`}
          />
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              "{script}"
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 bg-muted/30 text-muted-foreground gap-2">
          <Video className="w-6 h-6" />
          <span className="text-sm">Video host unavailable (mock mode)</span>
        </div>
      )}
    </section>
  );
};

export default HostVideoPlayer;
