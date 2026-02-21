import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";

interface UserResponsePanelProps {
  userResponse: string;
  onUserResponseChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  roundNumber: number;
  maxRounds: number;
}

export default function UserResponsePanel({
  userResponse,
  onUserResponseChange,
  onSubmit,
  isGenerating,
  roundNumber,
  maxRounds,
}: UserResponsePanelProps) {
  const isFinal = roundNumber + 1 >= maxRounds;
  const label = isFinal
    ? `Send & Get Final Round (${roundNumber + 1}/${maxRounds})`
    : `Send & Start Round ${roundNumber + 1}`;

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 stage-glow space-y-4">
      <div className="space-y-3">
        <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Your Follow-Up
        </label>
        <Textarea
          placeholder="Address the panel's questions, provide more details about your idea, or challenge their assumptions…"
          value={userResponse}
          onChange={(e) => onUserResponseChange(e.target.value)}
          disabled={isGenerating}
          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none focus:ring-1 focus:ring-primary"
        />
        <VoiceInputButton
          onTranscript={(text) => onUserResponseChange(userResponse + (userResponse ? " " : "") + text)}
          disabled={isGenerating}
        />
        <Button
          onClick={onSubmit}
          disabled={!userResponse.trim() || isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
