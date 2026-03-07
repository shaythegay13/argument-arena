import { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Zap, MessageSquare } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import { motion } from "framer-motion";

const ROUND_PROMPTS: Record<number, { title: string; hint: string }> = {
  1: {
    title: "Defend Your Idea",
    hint: "Address the panel's initial reactions. Clarify assumptions, highlight your unique advantage, or challenge their skepticism.",
  },
  2: {
    title: "Counter the Critiques",
    hint: "Respond to the risks and concerns raised. Provide evidence, pivot your positioning, or acknowledge valid points.",
  },
  3: {
    title: "Make Your Final Case",
    hint: "This is your last chance to persuade the jury. Summarize your strongest arguments and address remaining doubts.",
  },
};

interface UserResponsePanelProps {
  userResponse: string;
  onUserResponseChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  roundNumber: number;
  maxRounds: number;
  autoDebate?: boolean;
  onAutoDebateToggle?: () => void;
}

export default function UserResponsePanel({
  userResponse,
  onUserResponseChange,
  onSubmit,
  isGenerating,
  roundNumber,
  maxRounds,
  autoDebate,
  onAutoDebateToggle,
}: UserResponsePanelProps) {
  const userResponseRef = useRef(userResponse);
  useEffect(() => { userResponseRef.current = userResponse; }, [userResponse]);

  const MAX_WORDS = 1000;
  const wordCount = userResponse.trim() ? userResponse.trim().split(/\s+/).length : 0;
  const overLimit = wordCount > MAX_WORDS;

  const isFinal = roundNumber + 1 >= maxRounds;
  const prompt = ROUND_PROMPTS[roundNumber] || {
    title: "Respond to the Panel",
    hint: "Clarify assumptions, defend your idea, or pivot your positioning.",
  };

  const buttonLabel = isFinal
    ? `Send Final (${roundNumber + 1}/${maxRounds})`
    : `Send → Round ${roundNumber + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-primary/20 bg-card p-4 sm:p-6 stage-glow space-y-4"
    >
      {/* Prompt header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{prompt.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{prompt.hint}</p>
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Your Response
          </label>
          <span className={`text-xs font-mono ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
            {wordCount} / {MAX_WORDS} words
          </span>
        </div>
        <Textarea
          placeholder="Type your response to the panel…"
          value={userResponse}
          onChange={(e) => onUserResponseChange(e.target.value)}
          disabled={isGenerating}
          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <VoiceInputButton
              onTranscript={(text) => {
                const current = userResponseRef.current;
                onUserResponseChange(current + (current ? " " : "") + text);
              }}
              disabled={isGenerating}
            />
            {onAutoDebateToggle && (
              <button
                onClick={onAutoDebateToggle}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  autoDebate
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                }`}
              >
                <Zap className="w-3 h-3" />
                Auto-Respond
              </button>
            )}
          </div>

          <Button
            onClick={onSubmit}
            disabled={!userResponse.trim() || isGenerating || overLimit}
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
                {buttonLabel}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
