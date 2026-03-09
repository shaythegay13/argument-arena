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
  setCurrentSessionId,
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
import VisibilitySelector from "@/components/VisibilitySelector";
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

/** AI-powered panel selection with keyword fallback */
async function selectPanelForIdea(topic: string): Promise<Panel> {
  // Try AI selection first
  try {
    const panelDescriptions = PANELS.map(
      (p) => `${p.id}: "${p.name}" — Focus: ${p.focus}. ${p.description}`
    ).join("\n");

    const { data, error } = await supabase.functions.invoke("debate-ai", {
      body: {
        systemPrompt: `You are a panel routing assistant. Given a startup idea, pick the single best panel. Respond with ONLY the panel id (one of: ${PANELS.map((p) => p.id).join(", ")}). Nothing else.`,
        userPrompt: `Panels:\n${panelDescriptions}\n\nStartup idea: "${topic.slice(0, 500)}"\n\nWhich panel id is the best fit?`,
        model: "google/gemini-2.5-flash-lite",
      },
    });

    if (!error && data?.content) {
      const chosen = data.content.trim().toLowerCase().replace(/[^a-z]/g, "");
      const match = PANELS.find((p) => p.id === chosen);
      if (match) return match;
    }
  } catch (e) {
    console.warn("[selectPanelForIdea] AI selection failed, using keyword fallback:", e);
  }

  // Keyword fallback
  const lower = topic.toLowerCase();
  let bestPanel = PANELS[0]; // default: investor panel
  let bestScore = 0;
  for (const panel of PANELS) {
    const hints = PANEL_SELECTION_HINTS[panel.id] ?? [];
    const score = hints.filter((h) => lower.includes(h.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestPanel = panel;
    }
  }
  return bestPanel;
}

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
  const [panelMode, setPanelMode] = useState<"auto" | "panel" | "custom">("auto");
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [autoDebate, setAutoDebate] = useState(false);
  const [isAutoResponding, setIsAutoResponding] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "anonymous" | "public">("private");
  const [finishedCount, setFinishedCount] = useState(0);
  const subscription = useSubscription();
  const isPro = subscription.isPro;
  const FREE_LIMIT = 2;
  const PRO_LIMIT = 100;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Capture the session and iterate params once at mount
  const sessionParamRef = useRef(searchParams.get("session"));
  const iterateParamRef = useRef(searchParams.get("iterate"));
  const [isLoadingSession, setIsLoadingSession] = useState(!!sessionParamRef.current || !!iterateParamRef.current);
  const { saveSession, loadSession, resetSessionId, setIteration, sessionId: sessionIdRef } = useSessionPersistence(user?.id);

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
    const iterateId = iterateParamRef.current;
    
    if (!sessionId && !iterateId) return;
    if (authLoading) return;
    if (!user?.id) {
      setIsLoadingSession(false);
      setSearchParams({});
      sessionParamRef.current = null;
      iterateParamRef.current = null;
      return;
    }

    // Handle iterate: load the parent session topic but start fresh
    if (iterateId) {
      iterateParamRef.current = null;
      sessionParamRef.current = null;

      // Load parent session to get the topic and compute version
      supabase
        .from("debate_sessions")
        .select("topic, parent_session_id, version" as any)
        .eq("id", iterateId)
        .eq("user_id", user.id)
        .single()
        .then(({ data, error }: any) => {
          if (data && !error) {
            // Find the root session id (walk up if this is already an iteration)
            const rootId = data.parent_session_id || iterateId;
            const nextVersion = (data.version || 1) + 1;
            
            setIteration(rootId, nextVersion);
            setState({ ...initialState, topic: data.topic, phase: "setup" });
            toast({
              title: `🔄 Iteration v${nextVersion}`,
              description: "Refine your pitch and re-evaluate. The jury will score it fresh.",
            });
          }
          setSearchParams({});
          setIsLoadingSession(false);
        });
      return;
    }

    sessionParamRef.current = null;

    loadSession(sessionId!)
      .then((loadedState) => {
        if (loadedState) {
          setState(loadedState);
          setPanelMode("custom");
          for (const round of loadedState.rounds) {
            if (round.messages.length === loadedState.selectedPersonas.length) {
              generateClip(round.roundNumber, loadedState.selectedPersonas, round);
            }
          }
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
  }, [authLoading, user?.id, loadSession, setSearchParams, generateClip, setIteration, toast]);

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

  // When panelMode changes, sync selectedPersonas
  useEffect(() => {
    if (state.phase !== "setup") return;
    if (panelMode === "auto") {
      // Auto-selection deferred to handleStartDebate
      return;
    }
    if (panelMode === "panel" && selectedPanelId) {
      const panel = PANELS.find((p) => p.id === selectedPanelId);
      if (panel) {
        const panelPersonas = panel.personaIds.map((id) => PERSONA_MAP[id]).filter(Boolean);
        setState((prev) => ({ ...prev, selectedPersonas: panelPersonas }));
      }
    }
    // custom mode: user manually picks
  }, [panelMode, selectedPanelId, state.phase]);

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
    let personas: Persona[];
    if (panelMode === "auto") {
      const panel = await selectPanelForIdea(state.topic);
      personas = panel.personaIds.map((id) => PERSONA_MAP[id]).filter(Boolean);
      setSelectedPanelId(panel.id);
      toast({
        title: `🎯 Panel Selected: ${panel.name}`,
        description: `Focus: ${panel.focus} — ${panel.description}`,
      });
    } else if (panelMode === "panel" && selectedPanelId) {
      const panel = PANELS.find((p) => p.id === selectedPanelId);
      personas = panel ? panel.personaIds.map((id) => PERSONA_MAP[id]).filter(Boolean) : state.selectedPersonas;
    } else {
      personas = state.selectedPersonas;
    }
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
  }, [state.topic, state.selectedPersonas, panelMode, selectedPanelId, storeRoundMemories, generateClip, toast]);

  const allResponsesReady =
    currentRound &&
    currentRound.messages.length >= state.selectedPersonas.length &&
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
          topPraise: "Unable to determine.",
          skepticKillShot: "Unable to determine.",
          percentile: 50,
        },
      }));
    }
  }, [state.topic, state.rounds, state.selectedPersonas, state.ratings, generateClip]);

  // Auto-save session whenever rounds, ratings, or verdict change
  useEffect(() => {
    if (state.phase === "setup" || !state.topic) return;
    if (state.rounds.length === 0) return;
    saveSession(state, { visibility });
  }, [state.rounds, state.ratings, state.judgeVerdict, state.phase, saveSession, state.topic]);

  // Sync session ID to AI module so edge function excludes current session from limit count
  useEffect(() => {
    setCurrentSessionId(sessionIdRef.current ?? undefined);
  }, [sessionIdRef.current]);

  const handleReset = useCallback(() => {
    resetSessionId();
    setState(initialState);
    setAutoDebate(false);
    setIsAutoResponding(false);
  }, [resetSessionId]);

  const handleRefine = useCallback(() => {
    const currentId = sessionIdRef.current;
    resetSessionId();
    if (currentId) {
      // Navigate to iterate mode which loads the topic and sets up version tracking
      navigate(`/debate?iterate=${currentId}`);
      return;
    }
    setState((prev) => ({ ...initialState, topic: prev.topic, phase: "setup" }));
    setAutoDebate(false);
    setIsAutoResponding(false);
  }, [resetSessionId, navigate]);

  const isSetup = state.phase === "setup";
  const canStart = state.topic.trim().length > 0 && (panelMode !== "custom" || state.selectedPersonas.length >= 2);
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

            {/* Panel selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Jury Panel
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => { setPanelMode("auto"); setSelectedPanelId(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                    panelMode === "auto"
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Auto-Select
                </button>
                {PANELS.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => { setPanelMode("panel"); setSelectedPanelId(panel.id); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                      panelMode === "panel" && selectedPanelId === panel.id
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {panel.name}
                  </button>
                ))}
                <button
                  onClick={() => { setPanelMode("custom"); setSelectedPanelId(null); setState((prev) => ({ ...prev, selectedPersonas: [] })); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                    panelMode === "custom"
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Panel description */}
              {panelMode === "auto" && (
                <p className="text-xs text-muted-foreground mb-3">
                  The system will analyze your idea and pick the best panel of 8 judges automatically.
                </p>
              )}

              {panelMode === "panel" && selectedPanelId && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    {PANELS.find((p) => p.id === selectedPanelId)?.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(PANELS.find((p) => p.id === selectedPanelId)?.personaIds ?? []).map((pid) => {
                      const persona = PERSONA_MAP[pid];
                      if (!persona) return null;
                      const colors = getPersonaColors(persona.colorKey);
                      return (
                        <span key={pid} className={`px-2 py-1 rounded text-xs font-medium ${colors.text} bg-muted/30`}>
                          {persona.name.split(" ")[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {panelMode === "custom" && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {PERSONAS.map((persona) => {
                    const selected = state.selectedPersonas.some((p) => p.id === persona.id);
                    const colors = getPersonaColors(persona.colorKey);
                    return (
                      <button
                        key={persona.id}
                        onClick={() => togglePersona(persona)}
                        className={`
                          px-3 py-1.5 rounded-md text-sm font-medium border transition-all cursor-pointer
                          ${selected
                            ? `${colors.bg} ${colors.text} ${colors.border} border`
                            : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/40"
                          }
                        `}
                      >
                        {persona.name} — {persona.subtitle}
                      </button>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground w-full">
                    {state.selectedPersonas.length}/16 selected (min 2, max 8)
                  </p>
                </div>
              )}
            </div>

            {/* Visibility */}
            <VisibilitySelector value={visibility} onChange={setVisibility} disabled={state.isGenerating} />

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
                  ratings={state.ratings}
                  personas={state.selectedPersonas}
                  topic={state.topic}
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
