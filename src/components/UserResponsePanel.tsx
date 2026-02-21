import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface UserResponsePanelProps {
  summary: string;
  userResponse: string;
  onUserResponseChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  roundNumber: number;
  maxRounds: number;
}

export default function UserResponsePanel({
  summary,
  userResponse,
  onUserResponseChange,
  onSubmit,
  isGenerating,
  roundNumber,
  maxRounds,
}: UserResponsePanelProps) {
  const isFinalRound = roundNumber >= maxRounds;

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6 stage-glow space-y-4">
      {/* Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="text-sm font-mono uppercase tracking-widest text-primary font-semibold">
            Round {roundNumber} Summary
          </h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
          {summary}
        </p>
      </div>

      {/* User response */}
      {!isFinalRound && (
        <div className="space-y-3 pt-2 border-t border-border">
          <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Your Response / Answer Their Questions
          </label>
          <Textarea
            placeholder="Address the panel's questions, provide more details about your idea, or challenge their assumptions…"
            value={userResponse}
            onChange={(e) => onUserResponseChange(e.target.value)}
            disabled={isGenerating}
            className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none focus:ring-1 focus:ring-primary"
          />
          <Button
            onClick={onSubmit}
            disabled={!userResponse.trim() || isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Send className="w-4 h-4 mr-2" />
            {roundNumber + 1 >= maxRounds
              ? `Send & Get Final Round (${roundNumber + 1}/${maxRounds})`
              : `Send & Start Round ${roundNumber + 1}`}
          </Button>
        </div>
      )}

      {isFinalRound && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-mono text-muted-foreground">
            Final round complete. Click each panelist to see their rating.
          </p>
        </div>
      )}
    </div>
  );
}