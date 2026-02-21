import { useState, useCallback } from "react";
import { Persona, DebateState, Round } from "@/types/debate";
import { generateRound1, generateNextRound, generateSummary } from "@/lib/ai";
import ControlPanel from "@/components/ControlPanel";
import PersonaStage from "@/components/PersonaStage";
import RoundTimeline from "@/components/RoundTimeline";
import SummaryPanel from "@/components/SummaryPanel";

const MAX_ROUNDS = 3;

const Index = () => {
  const [state, setState] = useState<DebateState>({
    topic: "",
    selectedPersonas: [],
    rounds: [],
    currentRoundNumber: 0,
    summary: null,
    isGenerating: false,
    generatingPersonaIds: [],
    isGeneratingSummary: false,
  });

  const hasStarted = state.rounds.length > 0;
  const currentRound = state.rounds.find(
    (r) => r.roundNumber === state.currentRoundNumber
  );

  const togglePersona = useCallback((persona: Persona) => {
    setState((prev) => {
      const exists = prev.selectedPersonas.some((p) => p.id === persona.id);
      return {
        ...prev,
        selectedPersonas: exists
          ? prev.selectedPersonas.filter((p) => p.id !== persona.id)
          : prev.selectedPersonas.length < 4
          ? [...prev.selectedPersonas, persona]
          : prev.selectedPersonas,
      };
    });
  }, []);

  const handleStartDebate = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isGenerating: true,
      generatingPersonaIds: prev.selectedPersonas.map((p) => p.id),
      rounds: [],
      currentRoundNumber: 1,
      summary: null,
    }));

    const personas = state.selectedPersonas;
    const newRound: Round = { roundNumber: 1, messages: [] };

    const messages = await generateRound1(
      state.topic,
      personas,
      (personaId, text) => {
        setState((prev) => ({
          ...prev,
          generatingPersonaIds: prev.generatingPersonaIds.filter(
            (id) => id !== personaId
          ),
          rounds: [
            {
              roundNumber: 1,
              messages: [
                ...(prev.rounds[0]?.messages ?? []),
                { personaId, text },
              ],
            },
          ],
        }));
      }
    );

    setState((prev) => ({
      ...prev,
      isGenerating: false,
      generatingPersonaIds: [],
      rounds: [{ roundNumber: 1, messages }],
    }));
  }, [state.topic, state.selectedPersonas]);

  const handleNextRound = useCallback(async () => {
    const nextRoundNum = state.rounds.length + 1;
    if (nextRoundNum > MAX_ROUNDS) return;

    const previousRound = state.rounds[state.rounds.length - 1];

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      generatingPersonaIds: prev.selectedPersonas.map((p) => p.id),
      currentRoundNumber: nextRoundNum,
    }));

    const messages = await generateNextRound(
      state.topic,
      nextRoundNum,
      state.selectedPersonas,
      previousRound,
      (personaId, text) => {
        setState((prev) => {
          const existingNewRound = prev.rounds.find(
            (r) => r.roundNumber === nextRoundNum
          );
          const updatedMessages = [
            ...(existingNewRound?.messages ?? []),
            { personaId, text },
          ];
          const updatedRounds = existingNewRound
            ? prev.rounds.map((r) =>
                r.roundNumber === nextRoundNum
                  ? { ...r, messages: updatedMessages }
                  : r
              )
            : [
                ...prev.rounds,
                { roundNumber: nextRoundNum, messages: updatedMessages },
              ];
          return {
            ...prev,
            generatingPersonaIds: prev.generatingPersonaIds.filter(
              (id) => id !== personaId
            ),
            rounds: updatedRounds,
          };
        });
      }
    );

    setState((prev) => {
      const updatedRounds = prev.rounds.some(
        (r) => r.roundNumber === nextRoundNum
      )
        ? prev.rounds.map((r) =>
            r.roundNumber === nextRoundNum ? { ...r, messages } : r
          )
        : [...prev.rounds, { roundNumber: nextRoundNum, messages }];
      return {
        ...prev,
        isGenerating: false,
        generatingPersonaIds: [],
        rounds: updatedRounds,
      };
    });
  }, [state.topic, state.selectedPersonas, state.rounds]);

  const handleJudgeSummary = useCallback(async () => {
    setState((prev) => ({ ...prev, isGeneratingSummary: true }));
    const summary = await generateSummary(
      state.topic,
      state.rounds,
      state.selectedPersonas
    );
    setState((prev) => ({ ...prev, summary, isGeneratingSummary: false }));
  }, [state.topic, state.rounds, state.selectedPersonas]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30" />
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Argument Theater
          </h1>
          <span className="text-xs font-mono text-muted-foreground ml-1">
            / debate stage
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Control Panel */}
        <section className="rounded-lg border border-border bg-card p-6">
          <ControlPanel
            topic={state.topic}
            onTopicChange={(topic) =>
              setState((prev) => ({ ...prev, topic }))
            }
            selectedPersonas={state.selectedPersonas}
            onTogglePersona={togglePersona}
            onStartDebate={handleStartDebate}
            onNextRound={handleNextRound}
            onJudgeSummary={handleJudgeSummary}
            hasStarted={hasStarted}
            currentRound={state.currentRoundNumber}
            maxRounds={MAX_ROUNDS}
            isGenerating={state.isGenerating}
            isGeneratingSummary={state.isGeneratingSummary}
          />
        </section>

        {/* Round Timeline */}
        {hasStarted && (
          <RoundTimeline
            totalRounds={state.rounds.length}
            currentRound={state.currentRoundNumber}
            onSelectRound={(round) =>
              setState((prev) => ({ ...prev, currentRoundNumber: round }))
            }
          />
        )}

        {/* Persona Stage */}
        {hasStarted && (
          <PersonaStage
            personas={state.selectedPersonas}
            currentRound={currentRound}
            generatingPersonaIds={state.generatingPersonaIds}
          />
        )}

        {/* Judge's Summary */}
        <SummaryPanel
          summary={state.summary}
          isGenerating={state.isGeneratingSummary}
        />
      </main>
    </div>
  );
};

export default Index;
