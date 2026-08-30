import { useState } from "react";
import { Persona } from "@/types/debate";
import { PERSONAS } from "@/data/personas";
import { getPersonaColors } from "@/data/personaColors";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Scale, Star } from "lucide-react";

interface ControlPanelProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  selectedPersonas: Persona[];
  onTogglePersona: (persona: Persona) => void;
  onStartDebate: () => void;
  onNextRound: () => void;
  onJudgeSummary: () => void;
  hasStarted: boolean;
  currentRound: number;
  maxRounds: number;
  isGenerating: boolean;
  isGeneratingSummary: boolean;
}

export default function ControlPanel({
  topic,
  onTopicChange,
  selectedPersonas,
  onTogglePersona,
  onStartDebate,
  onNextRound,
  onJudgeSummary,
  hasStarted,
  currentRound,
  maxRounds,
  isGenerating,
  isGeneratingSummary,
}: ControlPanelProps) {
  const isSelected = (p: Persona) => selectedPersonas.some((s) => s.id === p.id);
  const canStart = topic.trim().length > 0 && selectedPersonas.length >= 2;

  return (
    <div className="space-y-5">
      {/* Topic input */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Debate Topic / Startup Idea
        </label>
        <Textarea
          placeholder="e.g. Should I build a B2B tool for automating sales outreach with AI?"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          disabled={hasStarted}
          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Persona picker */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Select 2–4 Personas
        </label>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((persona) => {
            const selected = isSelected(persona);
            const colors = getPersonaColors(persona.colorKey);
            const disabled = !selected && selectedPersonas.length >= 4;

            return (
              <button
                key={persona.id}
                onClick={() => !hasStarted && !disabled && onTogglePersona(persona)}
                disabled={hasStarted || disabled}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium border transition-all
                  ${selected
                    ? `${colors.bg} ${colors.text} ${colors.border} border`
                    : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                  }
                  ${(hasStarted || disabled) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {persona.subtitle}
              </button>
            );
          })}
        </div>
        {selectedPersonas.length > 0 && selectedPersonas.length < 2 && (
          <p className="text-xs text-muted-foreground mt-1">Pick at least 2 personas</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {!hasStarted ? (
          <Button
            onClick={onStartDebate}
            disabled={!canStart || isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Debate
          </Button>
        ) : currentRound >= maxRounds ? (
          <>
            <Button
              onClick={onJudgeSummary}
              disabled={isGenerating || isGeneratingSummary}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Star className="w-4 h-4 mr-2" />
              Get Panel Grades
            </Button>
            <Button disabled variant="outline" className="border-border text-muted-foreground">
              <SkipForward className="w-4 h-4 mr-2" />
              Final Statements complete
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onNextRound}
              disabled={isGenerating}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Next Round ({currentRound + 1}/{maxRounds})
            </Button>
            <Button
              onClick={onJudgeSummary}
              disabled={isGenerating || isGeneratingSummary}
              variant="outline"
              className="border-muted-foreground/30 text-foreground hover:bg-muted"
            >
              <Scale className="w-4 h-4 mr-2" />
              Judge's Summary
            </Button>
          </>
        )}

      </div>
    </div>
  );
}
