import { useState, useCallback } from "react";
import { Persona, DebateState, Round } from "@/types/debate";
import { generateRound1, generateNextRound, generateFinalRatings, generateJudgeVerdict } from "@/lib/ai";
import { PERSONAS } from "@/data/personas";
import { useDebateAgentState, emitAgUIEvent } from "@/hooks/useDebateAgentState";
import { useRedisMemory } from "@/hooks/useRedisMemory";
import { useTavusClips } from "@/hooks/useTavusClips";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import DebateTable from "@/components/DebateTable";
import RoundTimeline from "@/components/RoundTimeline";
import UserResponsePanel from "@/components/UserResponsePanel";
import RatingsOverview from "@/components/RatingsOverview";
import HostVideoPlayer from "@/components/HostVideoPlayer";
import JudgeVerdictCard from "@/components/JudgeVerdictCard";

const MAX_ROUNDS = 4;

const personaColorClasses: Record<string, { bg: string; text: string; border: string }> = {
  angel: { bg: "bg-persona-angel", text: "text-persona-angel", border: "persona-glow-angel" },
  vc: { bg: "bg-persona-vc", text: "text-persona-vc", border: "persona-glow-vc" },
  customer: { bg: "bg-persona-customer", text: "text-persona-customer", border: "persona-glow-customer" },
  operator: { bg: "bg-persona-operator", text: "text-persona-operator", border: "persona-glow-operator" },
  skeptic: { bg: "bg-persona-skeptic", text: "text-persona-skeptic", border: "persona-glow-skeptic" },
  quant: { bg: "bg-persona-quant", text: "text-persona-quant", border: "persona-glow-quant" },
  insider: { bg: "bg-persona-insider", text: "text-persona-insider", border: "persona-glow-insider" },
  visionary: { bg: "bg-persona-visionary", text: "text-persona-visionary", border: "persona-glow-visionary" },
};

const initialState: DebateState = {
  topic: "",
  selectedPersonas: [],
  rounds: [],
  currentRoundNumber: 0,
  isGenerating: false,
  generatingPersonaIds: [],
  expandedPersonaId: null,
  userResponse: "",
  ratings: [],
  isGeneratingRatings: false,
  phase: "setup",
  judgeVerdict: null,
  isGeneratingJudge: false,
};

const Index = () => {
  const [state, setState] = useState<DebateState>(initialState);
  const { isLoadingMemories, storeRoundMemories, getRecentMemories, usingMock, sessionId } = useRedisMemory();
  const { clips, isGenerating: isGeneratingClip, generateClip } = useTavusClips();

  useDebateAgentState(state);
  console.log("[RedisMemory] Session:", sessionId, "| Mock:", usingMock);

  const currentRound = state.rounds.find((r) => r.roundNumber === state.currentRoundNumber);

  const togglePersona = useCallback((persona: Persona) => {
    setState((prev) => {
      if (prev.phase !== "setup") return prev;
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
      phase: "debating",
      isGenerating: true,
      generatingPersonaIds: prev.selectedPersonas.map((p) => p.id),
      rounds: [],
      currentRoundNumber: 1,
      ratings: [],
      judgeVerdict: null,
    }));

    const personas = state.selectedPersonas;
    const messages = await generateRound1(
      state.topic,
      personas,
      (personaId, text) => {
        setState((prev) => ({
          ...prev,
          generatingPersonaIds: prev.generatingPersonaIds.filter((id) => id !== personaId),
          rounds: [{ roundNumber: 1, messages: [...(prev.rounds[0]?.messages ?? []), { personaId, text }] }],
        }));
      }
    );

    const responseMap: Record<string, string> = {};
    messages.forEach((m) => { responseMap[m.personaId] = m.text; });
    await storeRoundMemories(personas.map((p) => p.id), state.topic, 1, "", responseMap);

    setState((prev) => ({
      ...prev,
      isGenerating: false,
      generatingPersonaIds: [],
      rounds: [{ roundNumber: 1, messages }],
    }));

    generateClip(1, personas, { roundNumber: 1, messages });
  }, [state.topic, state.selectedPersonas, storeRoundMemories, generateClip]);

  const allResponsesReady = currentRound && currentRound.messages.length === state.selectedPersonas.length && !state.isGenerating;
  const showFollowUp = allResponsesReady && state.currentRoundNumber < MAX_ROUNDS && state.phase === "debating";

  const handleUserSubmit = useCallback(async () => {
    const nextRoundNum = state.rounds.length + 1;
    const isFinalRound = nextRoundNum >= MAX_ROUNDS;
    const previousRound = state.rounds[state.rounds.length - 1];
    const userResponse = state.userResponse;

    emitAgUIEvent({ type: "user_response", content: userResponse, round: state.currentRoundNumber });

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      generatingPersonaIds: prev.selectedPersonas.map((p) => p.id),
      currentRoundNumber: nextRoundNum,
      expandedPersonaId: null,
      phase: "debating",
      userResponse: "",
    }));

    if (isFinalRound) {
      const { messages, ratings } = await generateFinalRatings(
        state.topic, state.selectedPersonas, state.rounds, userResponse,
        (personaId, text) => {
          setState((prev) => {
            const existingRound = prev.rounds.find((r) => r.roundNumber === nextRoundNum);
            const updatedMessages = [...(existingRound?.messages ?? []), { personaId, text }];
            const updatedRounds = existingRound
              ? prev.rounds.map((r) => r.roundNumber === nextRoundNum ? { ...r, messages: updatedMessages } : r)
              : [...prev.rounds, { roundNumber: nextRoundNum, messages: updatedMessages }];
            return { ...prev, generatingPersonaIds: prev.generatingPersonaIds.filter((id) => id !== personaId), rounds: updatedRounds };
          });
        },
        getRecentMemories
      );

      const responseMap: Record<string, string> = {};
      messages.forEach((m) => { responseMap[m.personaId] = m.text; });
      await storeRoundMemories(state.selectedPersonas.map((p) => p.id), state.topic, nextRoundNum, userResponse, responseMap);

      setState((prev) => {
        const updatedRounds = prev.rounds.some((r) => r.roundNumber === nextRoundNum)
          ? prev.rounds.map((r) => r.roundNumber === nextRoundNum ? { ...r, messages } : r)
          : [...prev.rounds, { roundNumber: nextRoundNum, messages }];
        return { ...prev, isGenerating: false, generatingPersonaIds: [], rounds: updatedRounds, ratings, phase: "final-ratings" };
      });

      generateClip(nextRoundNum, state.selectedPersonas, { roundNumber: nextRoundNum, messages }, userResponse);
    } else {
      const messages = await generateNextRound(
        state.topic, nextRoundNum, state.selectedPersonas, previousRound, userResponse,
        (personaId, text) => {
          setState((prev) => {
            const existingRound = prev.rounds.find((r) => r.roundNumber === nextRoundNum);
            const updatedMessages = [...(existingRound?.messages ?? []), { personaId, text }];
            const updatedRounds = existingRound
              ? prev.rounds.map((r) => r.roundNumber === nextRoundNum ? { ...r, messages: updatedMessages } : r)
              : [...prev.rounds, { roundNumber: nextRoundNum, messages: updatedMessages }];
            return { ...prev, generatingPersonaIds: prev.generatingPersonaIds.filter((id) => id !== personaId), rounds: updatedRounds };
          });
        },
        getRecentMemories
      );

      const responseMap: Record<string, string> = {};
      messages.forEach((m) => { responseMap[m.personaId] = m.text; });
      await storeRoundMemories(state.selectedPersonas.map((p) => p.id), state.topic, nextRoundNum, userResponse, responseMap);

      setState((prev) => {
        const updatedRounds = prev.rounds.some((r) => r.roundNumber === nextRoundNum)
          ? prev.rounds.map((r) => r.roundNumber === nextRoundNum ? { ...r, messages } : r)
          : [...prev.rounds, { roundNumber: nextRoundNum, messages }];
        return { ...prev, isGenerating: false, generatingPersonaIds: [], rounds: updatedRounds };
      });

      generateClip(nextRoundNum, state.selectedPersonas, { roundNumber: nextRoundNum, messages }, userResponse);
    }
  }, [state.topic, state.selectedPersonas, state.rounds, state.userResponse, getRecentMemories, storeRoundMemories, generateClip]);

  const handleJudge = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: "judge", isGeneratingJudge: true }));

    try {
      const { lean, reasons, script } = await generateJudgeVerdict(
        state.topic, state.rounds, state.selectedPersonas, state.ratings
      );
      setState((prev) => ({ ...prev, judgeVerdict: { lean, reasons }, isGeneratingJudge: false }));

      // Generate Tavus recap for judge verdict
      generateClip(MAX_ROUNDS + 1, state.selectedPersonas, {
        roundNumber: MAX_ROUNDS + 1,
        messages: [{ personaId: "judge", text: script }],
      });
    } catch (err) {
      console.error("[Judge] Error:", err);
      setState((prev) => ({
        ...prev,
        isGeneratingJudge: false,
        judgeVerdict: { lean: "more data", reasons: ["Judge encountered an error.", "Please try again."] },
      }));
    }
  }, [state.topic, state.rounds, state.selectedPersonas, state.ratings, generateClip]);

  const handleReset = useCallback(() => setState(initialState), []);

  const isSetup = state.phase === "setup";
  const canStart = state.topic.trim().length > 0 && state.selectedPersonas.length >= 2;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary shadow-md shadow-primary/30" />
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Argument Theater</h1>
          <span className="text-xs font-mono text-muted-foreground ml-1">/ debate stage</span>
          {!isSetup && (
            <Button onClick={handleReset} variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-4 h-4 mr-1.5" />
              New Debate
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {isSetup && (
          <section className="rounded-lg border border-border bg-card p-6 space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Debate Topic / Startup Idea
              </label>
              <Textarea
                placeholder="e.g. Should I build a B2B tool for automating sales outreach with AI?"
                value={state.topic}
                onChange={(e) => setState((prev) => ({ ...prev, topic: e.target.value }))}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Select 2–4 Panelists
              </label>
              <div className="flex flex-wrap gap-2">
                {PERSONAS.map((persona) => {
                  const selected = state.selectedPersonas.some((p) => p.id === persona.id);
                  const colors = personaColorClasses[persona.colorKey];
                  const disabled = !selected && state.selectedPersonas.length >= 4;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => togglePersona(persona)}
                      disabled={disabled}
                      className={`
                        px-3 py-1.5 rounded-md text-sm font-medium border transition-all
                        ${selected
                          ? `${colors.bg} ${colors.text} ${colors.border} border`
                          : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      {persona.subtitle}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={handleStartDebate} disabled={!canStart} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              <Play className="w-4 h-4 mr-2" />
              Start Debate
            </Button>
          </section>
        )}

        {!isSetup && (
          <>
            <div className="text-center">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Topic</p>
              <p className="text-sm text-foreground/80 max-w-lg mx-auto">{state.topic}</p>
            </div>

            <RoundTimeline
              totalRounds={state.rounds.length}
              currentRound={state.currentRoundNumber}
              maxRounds={MAX_ROUNDS}
              onSelectRound={(round) => setState((prev) => ({ ...prev, currentRoundNumber: round, expandedPersonaId: null, ...(prev.phase === "judge" ? {} : {}) }))}
              phase={state.phase}
              onJudgeClick={handleJudge}
            />

            {state.phase !== "judge" && (
              <>
                <DebateTable
                  personas={state.selectedPersonas}
                  currentRound={currentRound}
                  generatingPersonaIds={state.generatingPersonaIds}
                  expandedPersonaId={state.expandedPersonaId}
                  onExpandPersona={(id) => setState((prev) => ({ ...prev, expandedPersonaId: id }))}
                  roundNumber={state.currentRoundNumber}
                  maxRounds={MAX_ROUNDS}
                  isGenerating={state.isGenerating}
                  ratings={state.ratings}
                  phase={state.phase}
                />

                {clips[state.currentRoundNumber] && (
                  <HostVideoPlayer
                    clipUrl={clips[state.currentRoundNumber].clipUrl}
                    script={clips[state.currentRoundNumber].script}
                    isLoading={clips[state.currentRoundNumber].isLoading}
                    roundNumber={state.currentRoundNumber}
                  />
                )}

                {showFollowUp && (
                  <UserResponsePanel
                    userResponse={state.userResponse}
                    onUserResponseChange={(val) => setState((prev) => ({ ...prev, userResponse: val }))}
                    onSubmit={handleUserSubmit}
                    isGenerating={state.isGenerating}
                    roundNumber={state.currentRoundNumber}
                    maxRounds={MAX_ROUNDS}
                  />
                )}

                {state.phase === "final-ratings" && (
                  <RatingsOverview
                    personas={state.selectedPersonas}
                    ratings={state.ratings}
                    isGenerating={state.isGeneratingRatings}
                  />
                )}
              </>
            )}

            {state.phase === "judge" && (
              <>
                <JudgeVerdictCard verdict={state.judgeVerdict} isGenerating={state.isGeneratingJudge} />
                {clips[MAX_ROUNDS + 1] && (
                  <HostVideoPlayer
                    clipUrl={clips[MAX_ROUNDS + 1].clipUrl}
                    script={clips[MAX_ROUNDS + 1].script}
                    isLoading={clips[MAX_ROUNDS + 1].isLoading}
                    roundNumber={MAX_ROUNDS + 1}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
