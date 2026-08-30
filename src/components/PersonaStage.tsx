import { Persona, Round } from "@/types/debate";
import { getPersonaColors } from "@/data/personaColors";

interface PersonaStageProps {
  personas: Persona[];
  currentRound: Round | undefined;
  generatingPersonaIds: string[];
}

export default function PersonaStage({
  personas,
  currentRound,
  generatingPersonaIds,
}: PersonaStageProps) {
  if (personas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm font-mono">
        Select personas and start the debate to see the stage
      </div>
    );
  }

  const gridCols =
    personas.length === 2
      ? "sm:grid-cols-2"
      : personas.length === 3
      ? "sm:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    // Mobile: horizontal snap-scrolling columns so each persona stays readable.
    // sm and up: a normal responsive grid.
    <div
      className={`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:gap-4 ${gridCols} [&>*]:min-w-[78%] [&>*]:snap-start sm:[&>*]:min-w-0`}
    >
      {personas.map((persona) => {
        const colors = getPersonaColors(persona.colorKey);
        const message = currentRound?.messages.find(
          (m) => m.personaId === persona.id
        );
        const isThinking = generatingPersonaIds.includes(persona.id);

        return (
          <div
            key={persona.id}
            className={`
              rounded-lg border-2 ${colors.border} bg-card p-4 sm:p-5 flex flex-col gap-3
              transition-all duration-300
              ${isThinking ? "animate-pulse" : ""}
            `}
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{persona.emoji}</span>
              <div>
                <h3 className={`font-semibold text-base ${colors.text}`}>
                  {persona.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                  {persona.subtitle}
                </p>
              </div>
            </div>
            <p className="text-[10px] italic text-muted-foreground/60 -mt-1">{persona.vibe}</p>

            {/* Divider */}
            <div className={`h-px w-full opacity-30`} style={{ background: `currentColor` }} />

            {/* Content */}
            <div className="flex-1 min-h-[80px]">
              {isThinking ? (
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded-sm w-full" />
                  <div className="h-3 bg-muted rounded-sm w-4/5" />
                  <div className="h-3 bg-muted rounded-sm w-3/5" />
                </div>
              ) : message ? (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {message.text}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  Awaiting round start…
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
