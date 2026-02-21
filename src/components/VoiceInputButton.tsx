import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInputButton({ onTranscript, disabled, className }: VoiceInputButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialText, setPartialText] = useState("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setPartialText(data.text);
    },
    onCommittedTranscript: (data) => {
      if (data.text.trim()) {
        onTranscript(data.text.trim());
      }
      setPartialText("");
    },
  });

  const handleToggle = useCallback(async () => {
    if (scribe.isConnected) {
      scribe.disconnect();
      setPartialText("");
      return;
    }

    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        throw new Error("Failed to get scribe token");
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      console.error("[VoiceInput] Error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [scribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, []);

  const isActive = scribe.isConnected;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant={isActive ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={disabled || isConnecting}
        className="shrink-0"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isActive ? (
          <>
            <MicOff className="w-4 h-4 mr-1.5" />
            Stop
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-1.5" />
            Voice
          </>
        )}
      </Button>

      {isActive && partialText && (
        <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
          {partialText}…
        </span>
      )}

      {isActive && !partialText && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Listening…
        </span>
      )}
    </div>
  );
}
