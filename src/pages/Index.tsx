import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Persona, DebateState, Round } from "@/types/debate";
import {
  generateRound1,
  generateNextRound,
  generateRatingsOnly,
  generateJudgeVerdict,
  generateAutoResponse,
} from "@/lib/ai";
import { trackEvent } from "@/lib/analytics";
import { PERSONAS, PERSONA_MAP } from "@/data/personas";
import { PANELS, Panel, PANEL_SELECTION_HINTS } from "@/data/panels";
import { getPersonaColors } from "@/data/personaColors";
import { useDebateAgentState, emitAgUIEvent } from "@/hooks/useDebateAgentState";
import { useRedisMemory } from "@/hooks/useRedisMemory";
import { useHostAudio } from "@/hooks/useHostAudio";
import { useAuth } from "@/hooks/useAuth";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Play, RotateCcw, Loader2, Zap, Users, LayoutDashboard, Mail } from "lucide-react";
import IdeaSubmissionForm from "@/components/IdeaSubmissionForm";
import MobileNav from "@/components/MobileNav";
import DebateTable from "@/components/DebateTable";
import RoundTimeline from "@/components/RoundTimeline";
import UserResponsePanel from "@/components/UserResponsePanel";
import RatingsOverview from "@/components/RatingsOverview";
import HostVideoPlayer from "@/components/HostVideoPlayer";
import JudgeVerdictCard from "@/components/JudgeVerdictCard";
import VoiceInputButton from "@/components/VoiceInputButton";
import UpgradeModal from "@/components/UpgradeModal";
import logo from "@/assets/logo.png";

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
  const [useAllPersonas, setUseAllPersonas] = useState(true);
  const [autoDebate, setAutoDebate] = useState(false);
  const [isAutoResponding, setIsAutoResponding] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);
  const subscription = useSubscription();
  const isPro = subscription.isPro;
  const FREE_LIMIT = 2;
  const PRO_LIMIT = 100;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Capture the session param once at mount so it survives URL clearing
  const sessionParamRef = useRef(searchParams.get("session"));
  const [isLoadingSession, setIsLoadingSession] = useState(!!sessionParamRef.current);
  const { saveSession, loadSession, resetSessionId, sessionId: sessionIdRef } = useSessionPersistence(user?.id);

  const { toast } = useToast();
  const { isLoadingMemories, storeRoundMemories, getRecentMemories, usingMock, sessionId } =
    useRedisMemory();
  const { clips, isGenerating: isGeneratingClip, generateClip } = useHostAudio();

  useDebateAgentState(state);
  console.log("[RedisMemory] Session:", sessionId, "| Mock:", usingMock);

  // Count finished evaluations for paywall
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("debate_sessions")
      .select("id, phase, judge_verdict", { count: "exact", head: false })
      .eq("user_id", user.id)
      .then(({ data }) => {
        const finished = (data ?? []).filter(
          (s: any) => (s.phase === "judge" && s.judge_verdict) || s.phase === "final-ratings"
        ).length;
        setFinishedCount(finished);
      });
  }, [user?.id]);

  // Load session from URL parameter — wait for auth to resolve first so userId is available
  useEffect(() => {
    const sessionId = sessionParamRef.current;
    if (!sessionId) return;       // no session param in URL
    if (authLoading) return;      // wait for auth to finish
    if (!user?.id) {              // not logged in — bail out
      setIsLoadingSession(false);
      setSearchParams({});
      sessionParamRef.current = null;
      return;
    }

    sessionParamRef.current = null; // prevent double-load

    loadSession(sessionId)
      .then((loadedState) => {
        if (loadedState) {
          setState(loadedState);
          setUseAllPersonas(loadedState.selectedPersonas.length === PERSONAS.length);
          // Don't regenerate clips for loaded sessions — they are view-only
        }
        setSearchParams({});
      })
      .catch((err) => {
        console.error("Failed to load session:", err);
        setSearchParams({});
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, [authLoading, user?.id, loadSession, setSearchParams, generateClip]);

  const currentRound = state.rounds.find((r) => r.roundNumber === state.currentRoundNumber);

  const togglePersona = useCallback((persona: Persona) => {
    setState((prev) => {
      if (prev.phase !== "setup") return prev;
      const exists = prev.selectedPersonas.some((p) => p.id === persona.id);
      return {
        ...prev,
        selectedPersonas: exists
          ? prev.selectedPersonas.filter((p) => p.id !== persona.id)
          : prev.selectedPersonas.length < 8
          ? [...prev.selectedPersonas, persona]
          : prev.selectedPersonas,
      };
    });
  }, []);

  // When useAllPersonas toggles, sync selectedPersonas
  useEffect(() => {
    if (state.phase !== "setup") return;
    setState((prev) => ({
      ...prev,
      selectedPersonas: useAllPersonas ? PERSONAS : [],
    }));
  }, [useAllPersonas, state.phase]);

  const handleStartDebate = useCallback(async () => {
    if (finishedCount >= FREE_LIMIT && !isPro) {
      setShowUpgrade(true);
      return;
    }
    if (isPro && finishedCount >= PRO_LIMIT) {
      toast({
        title: "Monthly limit reached",
        description: `You've used all ${PRO_LIMIT} evaluations this month. Contact us if you need more.`,
        variant: "destructive",
      });
      return;
    }
    const personas = useAllPersonas ? PERSONAS : state.selectedPersonas;
    if (!personas.length) return;

    setState((prev) => ({
      ...prev,
      selectedPersonas: personas,
      phase: "debating",
      isGenerating: true,
      generatingPersonaIds: personas.map((p) => p.id),
      rounds: [],
      currentRoundNumber: 1,
      ratings: [],
      judgeVerdict: null,
    }));

    trackEvent("debate_started", { personaCount: personas.length });
    try {
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
    } catch (err) {
      console.error("[Round 1] Generation failed:", err);
      setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
      toast({ title: "Generation failed", description: "Could not start the debate. Please try again.", variant: "destructive" });
    }
  }, [state.topic, state.selectedPersonas, useAllPersonas, storeRoundMemories, generateClip, toast]);

  const allResponsesReady =
    currentRound &&
    currentRound.messages.length === state.selectedPersonas.length &&
    !state.isGenerating;
  const showFollowUp =
    allResponsesReady &&
    state.currentRoundNumber < MAX_ROUNDS &&
    state.phase === "debating";

  const handleUserSubmit = useCallback(
    async (overrideResponse?: string) => {
      const nextRoundNum = state.rounds.length + 1;
      const previousRound = state.rounds[state.rounds.length - 1];
      const userResponse = overrideResponse ?? state.userResponse;

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

      try {
        const messages = await generateNextRound(
          state.topic,
          nextRoundNum,
          state.selectedPersonas,
          previousRound,
          userResponse,
          (personaId, text) => {
            setState((prev) => {
              const existingRound = prev.rounds.find((r) => r.roundNumber === nextRoundNum);
              const updatedMessages = [...(existingRound?.messages ?? []), { personaId, text }];
              const updatedRounds = existingRound
                ? prev.rounds.map((r) =>
                    r.roundNumber === nextRoundNum ? { ...r, messages: updatedMessages } : r
                  )
                : [...prev.rounds, { roundNumber: nextRoundNum, messages: updatedMessages }];
              return {
                ...prev,
                generatingPersonaIds: prev.generatingPersonaIds.filter((id) => id !== personaId),
                rounds: updatedRounds,
              };
            });
          },
          getRecentMemories
        );

        const responseMap: Record<string, string> = {};
        messages.forEach((m) => { responseMap[m.personaId] = m.text; });
        await storeRoundMemories(
          state.selectedPersonas.map((p) => p.id),
          state.topic,
          nextRoundNum,
          userResponse,
          responseMap
        );

        setState((prev) => {
          const updatedRounds = prev.rounds.some((r) => r.roundNumber === nextRoundNum)
            ? prev.rounds.map((r) => (r.roundNumber === nextRoundNum ? { ...r, messages } : r))
            : [...prev.rounds, { roundNumber: nextRoundNum, messages }];
          return { ...prev, isGenerating: false, generatingPersonaIds: [], rounds: updatedRounds };
        });

        generateClip(nextRoundNum, state.selectedPersonas, { roundNumber: nextRoundNum, messages }, userResponse);
      } catch (err) {
        console.error(`[Round ${nextRoundNum}] Generation failed:`, err);
        setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
        toast({ title: "Generation failed", description: "The panel couldn't respond. Please try submitting again.", variant: "destructive" });
      }
    },
    [state.topic, state.selectedPersonas, state.rounds, state.userResponse, getRecentMemories, storeRoundMemories, generateClip, toast]
  );

  const handleGenerateRatings = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: "final-ratings", isGeneratingRatings: true, ratings: [] }));

    const lastUserResponse = state.userResponse || "";
    const ratings = await generateRatingsOnly(
      state.topic,
      state.selectedPersonas,
      state.rounds,
      lastUserResponse,
      (_personaId, rating) => {
        setState((prev) => ({
          ...prev,
          ratings: [...prev.ratings, rating],
        }));
      },
      getRecentMemories
    );

    setState((prev) => ({ ...prev, ratings, isGeneratingRatings: false }));
  }, [state.topic, state.selectedPersonas, state.rounds, state.userResponse, getRecentMemories]);

  // Auto-debate: when responses are ready and it's not the last round, auto-generate and submit
  useEffect(() => {
    if (!autoDebate || !showFollowUp || isAutoResponding) return;

    let cancelled = false;
    setIsAutoResponding(true);

    generateAutoResponse(state.topic, currentRound!, state.selectedPersonas)
      .then((autoResponse) => {
        if (cancelled) return;
        handleUserSubmit(autoResponse);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsAutoResponding(false);
      });

    return () => { cancelled = true; };
  }, [autoDebate, showFollowUp, isAutoResponding, state.topic, currentRound, state.selectedPersonas, handleUserSubmit]);

  // Auto-debate: auto-trigger ratings after round 4
  useEffect(() => {
    if (!autoDebate) return;
    if (state.phase !== "debating") return;
    if (state.currentRoundNumber < MAX_ROUNDS) return;
    if (state.isGenerating || !allResponsesReady) return;
    if (state.ratings.length > 0) return; // Already have ratings, don't regenerate
    handleGenerateRatings();
  }, [autoDebate, state.phase, state.currentRoundNumber, state.isGenerating, allResponsesReady, state.ratings.length, handleGenerateRatings]);

  const handleJudge = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: "judge", isGeneratingJudge: true }));

    try {
      const { judgeVerdict, script } = await generateJudgeVerdict(
        state.topic,
        state.rounds,
        state.selectedPersonas,
        state.ratings
      );
      setState((prev) => ({ ...prev, judgeVerdict, isGeneratingJudge: false }));
      trackEvent("debate_completed", { verdict: judgeVerdict.verdict, score: judgeVerdict.overallScore });

      generateClip(MAX_ROUNDS + 1, state.selectedPersonas, {
        roundNumber: MAX_ROUNDS + 1,
        messages: [{ personaId: "judge", text: script }],
      });
    } catch (err) {
      console.error("[Judge] Error:", err);
      setState((prev) => ({
        ...prev,
        isGeneratingJudge: false,
        judgeVerdict: {
          verdict: "MAYBE",
          overallScore: 5,
          why: "Judge encountered an error. Please try again.",
          strengths: ["Unable to determine", "Unable to determine", "Unable to determine"],
          risks: ["Unable to determine", "Please try again"],
          nextStep: "Retry the judge verdict.",
        },
      }));
    }
  }, [state.topic, state.rounds, state.selectedPersonas, state.ratings, generateClip]);

  // Auto-save session whenever rounds, ratings, or verdict change
  useEffect(() => {
    if (state.phase === "setup" || !state.topic) return;
    if (state.rounds.length === 0) return;
    saveSession(state);
  }, [state.rounds, state.ratings, state.judgeVerdict, state.phase, saveSession, state.topic]);

  const handleReset = useCallback(() => {
    resetSessionId();
    setState(initialState);
    setAutoDebate(false);
    setIsAutoResponding(false);
  }, [resetSessionId]);

  const handleRefine = useCallback(() => {
    resetSessionId();
    setState((prev) => ({ ...initialState, topic: prev.topic, phase: "setup" }));
    setAutoDebate(false);
    setIsAutoResponding(false);
  }, [resetSessionId]);

  const isSetup = state.phase === "setup";
  const effectivePersonas = useAllPersonas ? PERSONAS : state.selectedPersonas;
  const canStart = state.topic.trim().length > 0 && effectivePersonas.length >= 2;
  const isLiveDebating = state.phase === "debating" && state.isGenerating;

  // Show loading indicator while loading session
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 sm:px-6 py-4 relative">
        <div className="max-w-[1200px] mx-auto flex items-center gap-2 sm:gap-3 flex-wrap">
          <img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12" />
          <span className="text-xs font-mono text-muted-foreground ml-1 hidden sm:inline">/ debate stage</span>

          {/* Live debate indicator */}
          {isLiveDebating && (
            <span className="flex items-center gap-1.5 ml-1 sm:ml-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-mono text-destructive uppercase tracking-widest">Live</span>
            </span>
          )}

          {/* Auto-debate badge */}
          {autoDebate && !isSetup && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 hidden sm:inline">
              Auto-Debate
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {!isSetup && (
              <Button
                onClick={handleReset}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">New Debate</span>
              </Button>
            )}
            <MobileNav currentPage="debate" isPro={isPro} onUpgradeClick={() => setShowUpgrade(true)} />
          </div>
        </div>
      </header>

      {/* Round progress bar */}
      {!isSetup && (
        <div className="w-full bg-muted h-1">
          <div
            className="bg-primary h-1 transition-all duration-700"
            style={{ width: `${(state.rounds.length / MAX_ROUNDS) * 100}%` }}
          />
        </div>
      )}

      <main className="max-w-[1200px] mx-auto px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
        {isSetup && (
          <section className="rounded-[14px] border border-border bg-card p-6 space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
                Startup Idea
              </label>
              <IdeaSubmissionForm
                onTopicChange={(topic) => setState((prev) => ({ ...prev, topic }))}
                disabled={state.isGenerating}
              />
            </div>

            {/* Panelist mode toggle */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Panelists
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setUseAllPersonas(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                    useAllPersonas
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  All 8 Panelists
                </button>
                <button
                  onClick={() => setUseAllPersonas(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                    !useAllPersonas
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                  }`}
                >
                  Custom (2–8)
                </button>
              </div>

              {!useAllPersonas && (
                <div className="flex flex-wrap gap-2">
                  {PERSONAS.map((persona) => {
                    const selected = state.selectedPersonas.some((p) => p.id === persona.id);
                    const colors = personaColorClasses[persona.colorKey];
                    return (
                      <button
                        key={persona.id}
                        onClick={() => togglePersona(persona)}
                        className={`
                          px-3 py-1.5 rounded-md text-sm font-medium border transition-all
                          ${
                            selected
                              ? `${colors.bg} ${colors.text} ${colors.border} border`
                              : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                          }
                          cursor-pointer
                        `}
                      >
                        {persona.subtitle}
                      </button>
                    );
                  })}
                </div>
              )}

              {useAllPersonas && (
                <div className="flex flex-wrap gap-1.5">
                  {PERSONAS.map((persona) => {
                    const colors = personaColorClasses[persona.colorKey];
                    return (
                      <span
                        key={persona.id}
                        className={`px-2 py-1 rounded text-xs font-medium ${colors.text} bg-muted/30`}
                      >
                        {persona.name.split(" ")[0]}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Options row */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setAutoDebate((v) => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    autoDebate ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
                      autoDebate ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono">Auto-debate mode</span>
              </label>
            </div>

            <Button
              onClick={handleStartDebate}
              disabled={!canStart || state.isGenerating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {state.isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Jury
                </>
              )}
            </Button>
          </section>
        )}

        {!isSetup && (
          <>
            <div className="text-center">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Idea</p>
              <p className="text-sm text-foreground/80 max-w-lg mx-auto">{state.topic}</p>
            </div>

            <RoundTimeline
              totalRounds={state.rounds.length}
              currentRound={state.currentRoundNumber}
              maxRounds={MAX_ROUNDS}
              onSelectRound={(round) =>
                setState((prev) => ({
                  ...prev,
                  currentRoundNumber: round,
                  expandedPersonaId: null,
                  phase: "debating",
                }))
              }
              phase={state.phase}
              onJudgeClick={() => {
                if (state.judgeVerdict) {
                  setState((prev) => ({ ...prev, phase: "judge" }));
                } else {
                  handleJudge();
                }
              }}
              onGradesClick={() => {
                if (state.ratings.length > 0) {
                  setState((prev) => ({ ...prev, phase: "final-ratings" }));
                } else {
                  handleGenerateRatings();
                }
              }}
              hasRatings={state.ratings.length > 0}
              hasVerdict={!!state.judgeVerdict}
            />

            {state.phase !== "judge" && state.phase !== "final-ratings" && (
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
                    clipUrl={clips[state.currentRoundNumber].audioUrl}
                    script={clips[state.currentRoundNumber].script}
                    isLoading={clips[state.currentRoundNumber].isLoading}
                    roundNumber={state.currentRoundNumber}
                  />
                )}

                {showFollowUp && !autoDebate && (
                  <UserResponsePanel
                    userResponse={state.userResponse}
                    onUserResponseChange={(val) => setState((prev) => ({ ...prev, userResponse: val }))}
                    onSubmit={() => handleUserSubmit()}
                    isGenerating={state.isGenerating}
                    roundNumber={state.currentRoundNumber}
                    maxRounds={MAX_ROUNDS}
                    autoDebate={autoDebate}
                    onAutoDebateToggle={() => setAutoDebate((v) => !v)}
                  />
                )}

                {showFollowUp && autoDebate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono px-4 py-3 rounded-lg border border-border bg-muted/20">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auto-generating founder response…
                  </div>
                )}

                {/* Show "Get Grades" button after round 4 completes */}
                {allResponsesReady && state.currentRoundNumber >= MAX_ROUNDS && state.phase === "debating" && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => {
                        if (state.ratings.length > 0) {
                          setState((prev) => ({ ...prev, phase: "final-ratings" }));
                        } else {
                          handleGenerateRatings();
                        }
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {state.ratings.length > 0 ? "View Panel Grades" : "Get Panel Grades"}
                    </Button>
                  </div>
                )}
              </>
            )}

            {state.phase === "final-ratings" && (
              <RatingsOverview
                personas={state.selectedPersonas}
                ratings={state.ratings}
                isGenerating={state.isGeneratingRatings}
              />
            )}

            {state.phase === "judge" && (
              <>
                <JudgeVerdictCard
                  verdict={state.judgeVerdict}
                  isGenerating={state.isGeneratingJudge}
                  onReset={handleReset}
                  onRefine={handleRefine}
                  sessionId={sessionIdRef.current ?? undefined}
                />
                {clips[MAX_ROUNDS + 1] && (
                  <HostVideoPlayer
                    clipUrl={clips[MAX_ROUNDS + 1].audioUrl}
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

      <footer className="border-t border-border px-6 py-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <button onClick={() => navigate("/app/terms")} className="hover:text-foreground underline underline-offset-2 transition-colors">
            Terms & Conditions
          </button>
          <span>·</span>
          <button onClick={() => navigate("/app/privacy")} className="hover:text-foreground underline underline-offset-2 transition-colors">
            Privacy Policy
          </button>
        </div>
      </footer>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} isPro={subscription.isPro} subscriptionEnd={subscription.subscriptionEnd} onCheckout={subscription.startCheckout} onManage={subscription.manageSubscription} />
    </div>
  );
};

export default Index;
