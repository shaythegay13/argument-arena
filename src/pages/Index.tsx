import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { callDebateJson } from "@/lib/debateEndpoint";
import { useSubscription } from "@/hooks/useSubscription";
import { Persona, DebateState, Round, RoundMessage } from "@/types/debate";
import {
  generateRound1,
  generateNextRound,
  generateRatingsOnly,
  generateJudgeVerdict,
  generateAutoResponse,
  setCurrentSessionId,
  isOutOfCreditsError,
  cancelActiveGenerations,
  resetCancellation,
  isCancelledError,
  extractPartialJudge,
  isMissingSessionError,
  MISSING_SESSION,
  MISSING_SESSION_MESSAGE,



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
import { Play, RotateCcw, Loader2, Zap, Users, LayoutDashboard, Mail, HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
import CreditsHelpModal from "@/components/CreditsHelpModal";
import GenerationStatusPanel, { type GenStatus, type RoundGenStatus } from "@/components/GenerationStatusPanel";
import ExportDebateButton from "@/components/ExportDebateButton";
import SocialShareButton from "@/components/SocialShareButton";
import logo from "@/assets/logo.png";

const MAX_ROUNDS = 4;

/** AI-powered panel selection with keyword fallback */
async function selectPanelForIdea(topic: string): Promise<Panel> {
  // Try AI selection first
  try {
    const panelDescriptions = PANELS.map(
      (p) => `${p.id}: "${p.name}" — Focus: ${p.focus}. ${p.description}`
    ).join("\n");

    const { content, error } = await callDebateJson({
      systemPrompt: `You are a panel routing assistant. Given a startup idea, pick the single best panel. Respond with ONLY the panel id (one of: ${PANELS.map((p) => p.id).join(", ")}). Nothing else.`,
      userPrompt: `Panels:\n${panelDescriptions}\n\nStartup idea: "${topic.slice(0, 500)}"\n\nWhich panel id is the best fit?`,
      model: "google/gemini-2.5-flash-lite",
      mode: "utility",
    });

    if (!error && content) {
      const chosen = content.trim().toLowerCase().replace(/[^a-z]/g, "");
      const match = PANELS.find((p) => p.id === chosen);
      if (match) return match;
    }
  } catch (e) {
    console.warn("[selectPanelForIdea] AI selection failed, using keyword fallback:", e);
  }

  // Keyword fallback
  const lower = topic.toLowerCase();
  let bestPanel = PANELS[0]!; // default: investor panel
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
  const [showCreditsHelp, setShowCreditsHelp] = useState(false);

  const [upgradeReason, setUpgradeReason] = useState<"default" | "out_of_credits">("default");
  // Pending work to auto-resume once credits land after the buy-credits flow
  const pendingCreditActionRef = useRef<{ kind: "start" } | { kind: "submit"; response: string } | null>(null);
  const handlersRef = useRef<{ start?: () => void; submit?: (r?: string) => void }>({});
  const [awaitingCredits, setAwaitingCredits] = useState(false);
  const [genRounds, setGenRounds] = useState<RoundGenStatus[]>([]);
  // Live partial text per juror while their response streams in
  const [streamingTexts, setStreamingTexts] = useState<Record<string, string>>({});
  // Partial judge summary while the Consensus Judge streams its verdict
  const [judgeStream, setJudgeStream] = useState("");
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  // Remembers the pitch response that drove each round, so failed jurors can be retried in context
  const roundResponsesRef = useRef<Record<number, string>>({});
  // Panel-grades flow: single-flight guard, error surface, and final-statements review gate
  const gradesInFlightRef = useRef(false);
  const [gradesError, setGradesError] = useState<string | null>(null);
  const [finalReviewAck, setFinalReviewAck] = useState(false);




  const setRoundGen = useCallback(
    (roundNumber: number, updater: (round: RoundGenStatus) => RoundGenStatus) => {
      setGenRounds((prev) => {
        const existing = prev.find((r) => r.roundNumber === roundNumber) ?? {
          roundNumber,
          charged: false,
          overall: "queued" as GenStatus,
          personas: {},
        };
        const next = updater(existing);
        return prev.some((r) => r.roundNumber === roundNumber)
          ? prev.map((r) => (r.roundNumber === roundNumber ? next : r))
          : [...prev, next];
      });
    },
    []
  );



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
  const { saveSession, loadSession, resetSessionId, setIteration, ensureSession, sessionId: sessionIdRef } = useSessionPersistence(user?.id);
  // Session-ready gate: rounds may not start until a session row exists.
  const [sessionPrep, setSessionPrep] = useState<"idle" | "creating" | "ready" | "error">("idle");

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
        const panelPersonas = panel.personaIds.map((id) => PERSONA_MAP[id]).filter((p): p is Persona => Boolean(p));
        setState((prev) => ({ ...prev, selectedPersonas: panelPersonas }));
      }
    }
    // custom mode: user manually picks
  }, [panelMode, selectedPanelId, state.phase]);

  const handleStartDebate = useCallback(async () => {
    if (finishedCount >= FREE_LIMIT && !isPro) {
      pendingCreditActionRef.current = { kind: "start" };
      setUpgradeReason("out_of_credits");
      setShowUpgrade(true);
      return;
    }
    // Hard credit gate — a full jury run costs 1 credit, never start a partial run
    if (!isPro) {
      let credits = subscription.credits;
      try {
        await subscription.checkSubscription();
      } catch { /* fall back to cached balance */ }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: creditRow } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (creditRow) credits = creditRow.credits;
      }
      if (credits <= 0) {
        pendingCreditActionRef.current = { kind: "start" };
        setUpgradeReason("out_of_credits");
        setShowUpgrade(true);
        return;
      }
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
      personas = panel.personaIds.map((id) => PERSONA_MAP[id]).filter((p): p is Persona => Boolean(p));
      setSelectedPanelId(panel.id);
      toast({
        title: `🎯 Panel Selected: ${panel.name}`,
        description: `Focus: ${panel.focus} — ${panel.description}`,
      });
    } else if (panelMode === "panel" && selectedPanelId) {
      const panel = PANELS.find((p) => p.id === selectedPanelId);
      personas = panel ? panel.personaIds.map((id) => PERSONA_MAP[id]).filter((p): p is Persona => Boolean(p)) : state.selectedPersonas;
    } else {
      personas = state.selectedPersonas;
    }
    if (!personas.length) return;

    // SESSION-READY GATE: create the session row before anything else so every
    // round request carries a session id and billing stays idempotent.
    setSessionPrep("creating");
    let newSessionId: string | null = null;
    try {
      newSessionId = await ensureSession({ ...state, selectedPersonas: personas, phase: "debating" } as typeof state);
    } catch (e) {
      console.error("[Index] ensureSession failed:", e);
    }
    if (!newSessionId) {
      setSessionPrep("error");
      setCurrentSessionId(undefined);
      toast({
        title: "Couldn't start the jury",
        description: MISSING_SESSION_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    setCurrentSessionId(newSessionId);
    setSessionPrep("ready");

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

    resetCancellation();
    setStreamingTexts({});
    setGenRounds([
      {
        roundNumber: 1,
        charged: !isPro,
        overall: "generating",
        personas: Object.fromEntries(personas.map((p) => [p.id, "generating" as GenStatus])),
      },
    ]);

    try {
    const messages = await generateRound1(
      state.topic,
      personas,
      (personaId, text) => {
        setRoundGen(1, (r) => ({ ...r, personas: { ...r.personas, [personaId]: "succeeded" } }));
        setStreamingTexts((prev) => {
          const next = { ...prev };
          delete next[personaId];
          return next;
        });
        setState((prev) => ({
          ...prev,
          generatingPersonaIds: prev.generatingPersonaIds.filter((id) => id !== personaId),
          rounds: [{ roundNumber: 1, messages: [...(prev.rounds[0]?.messages ?? []), { personaId, text }] }],
        }));
      },
      (personaId, err) => {
        const status: GenStatus = isCancelledError(err) ? "cancelled" : "failed";
        setRoundGen(1, (r) => ({ ...r, personas: { ...r.personas, [personaId]: status } }));
        setStreamingTexts((prev) => {
          const next = { ...prev };
          delete next[personaId];
          return next;
        });
      },
      (personaId, partial) => {
        setStreamingTexts((prev) => ({ ...prev, [personaId]: partial }));
      }
    );


    const responseMap: Record<string, string> = {};
    messages.forEach((m) => { responseMap[m.personaId] = m.text; });
    await storeRoundMemories(personas.map((p) => p.id), state.topic, 1, "", responseMap);

    setRoundGen(1, (r) => {
      const personaStatuses = Object.fromEntries(
        personas.map((p) => {
          const prev = r.personas[p.id];
          return [p.id, (prev === "failed" || prev === "cancelled" ? prev : "succeeded") as GenStatus];
        })
      );
      const anyFailed = Object.values(personaStatuses).some((s) => s === "failed");
      const anyCancelled = Object.values(personaStatuses).some((s) => s === "cancelled");
      return {
        ...r,
        overall: anyFailed ? "failed" : anyCancelled ? "cancelled" : "succeeded",
        personas: personaStatuses,
      };
    });


    setState((prev) => ({
      ...prev,
      isGenerating: false,
      generatingPersonaIds: [],
      rounds: [{ roundNumber: 1, messages }],
    }));

    generateClip(1, personas, { roundNumber: 1, messages });
    } catch (err) {
      console.error("[Round 1] Generation failed:", err);
      // Round 1 is the only charged round — the backend refunds it when it fails.
      setRoundGen(1, (r) => ({
        ...r,
        overall: r.charged ? "refunded" : "failed",
        personas: Object.fromEntries(
          personas.map((p) => [p.id, r.personas[p.id] === "succeeded" ? "succeeded" : ("failed" as GenStatus)])
        ),
      }));
      if (isOutOfCreditsError(err)) {
        // Reset the stage entirely — no partial jury output
        setState((prev) => ({
          ...prev,
          phase: "setup",
          isGenerating: false,
          generatingPersonaIds: [],
          rounds: [],
          currentRoundNumber: 1,
          ratings: [],
          judgeVerdict: null,
        }));
        subscription.checkSubscription();
        pendingCreditActionRef.current = { kind: "start" };
        setUpgradeReason("out_of_credits");
        setShowUpgrade(true);
        return;
      }
      if (isMissingSessionError(err)) {
        setState((prev) => ({
          ...prev,
          phase: "setup",
          isGenerating: false,
          generatingPersonaIds: [],
          rounds: [],
          currentRoundNumber: 1,
        }));
        toast({ title: "Couldn't start the jury", description: MISSING_SESSION_MESSAGE, variant: "destructive" });
        return;
      }
      setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
      toast({ title: "Generation failed", description: "Could not start the debate. Please try again. No credit was charged.", variant: "destructive" });
    }

  }, [state, panelMode, selectedPanelId, storeRoundMemories, generateClip, toast, isPro, finishedCount, subscription, setRoundGen, ensureSession]);



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
      if (!previousRound) return;
      const userResponse = overrideResponse ?? state.userResponse;
      roundResponsesRef.current[nextRoundNum] = userResponse;


      // Make sure the billing/session id is attached for follow-up rounds too.
      const sid = sessionIdRef.current ?? (await ensureSession(state));
      setCurrentSessionId(sid ?? undefined);
      if (!sid) {
        setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
        toast({ title: "Couldn't reach the jury", description: MISSING_SESSION_MESSAGE, variant: "destructive" });
        return;
      }



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

      resetCancellation();
      setStreamingTexts({});
      setRoundGen(nextRoundNum, (r) => ({
        ...r,
        charged: false,
        overall: "generating",
        personas: Object.fromEntries(
          state.selectedPersonas.map((p) => [p.id, "generating" as GenStatus])
        ),
      }));

      try {
        const messages = await generateNextRound(
          state.topic,
          nextRoundNum,
          state.selectedPersonas,
          previousRound,
          userResponse,
          (personaId, text) => {
            setRoundGen(nextRoundNum, (r) => ({
              ...r,
              personas: { ...r.personas, [personaId]: "succeeded" },
            }));
            setStreamingTexts((prev) => {
              const next = { ...prev };
              delete next[personaId];
              return next;
            });
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
          getRecentMemories,
          (personaId, err) => {
            const status: GenStatus = isCancelledError(err) ? "cancelled" : "failed";
            setRoundGen(nextRoundNum, (r) => ({
              ...r,
              personas: { ...r.personas, [personaId]: status },
            }));
            setStreamingTexts((prev) => {
              const next = { ...prev };
              delete next[personaId];
              return next;
            });
          },
          undefined,
          (personaId, partial) => {
            setStreamingTexts((prev) => ({ ...prev, [personaId]: partial }));
          }
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

        setRoundGen(nextRoundNum, (r) => {
          const personaStatuses = Object.fromEntries(
            state.selectedPersonas.map((p) => [
              p.id,
              (r.personas[p.id] === "failed" || r.personas[p.id] === "cancelled"
                ? r.personas[p.id]
                : "succeeded") as GenStatus,
            ])
          );
          const anyFailed = Object.values(personaStatuses).some((s) => s === "failed");
          const anyCancelled = Object.values(personaStatuses).some((s) => s === "cancelled");
          return {
            ...r,
            overall: anyFailed ? "failed" : anyCancelled ? "cancelled" : "succeeded",
            personas: personaStatuses,
          };
        });


        setState((prev) => {
          const updatedRounds = prev.rounds.some((r) => r.roundNumber === nextRoundNum)
            ? prev.rounds.map((r) => (r.roundNumber === nextRoundNum ? { ...r, messages } : r))
            : [...prev.rounds, { roundNumber: nextRoundNum, messages }];
          return { ...prev, isGenerating: false, generatingPersonaIds: [], rounds: updatedRounds };
        });

        generateClip(nextRoundNum, state.selectedPersonas, { roundNumber: nextRoundNum, messages }, userResponse);
      } catch (err) {
        console.error(`[Round ${nextRoundNum}] Generation failed:`, err);
        // Follow-up rounds are already covered by the session's single credit — never charged.
        setRoundGen(nextRoundNum, (r) => ({
          ...r,
          overall: "failed",
          personas: Object.fromEntries(
            state.selectedPersonas.map((p) => [
              p.id,
              r.personas[p.id] === "succeeded" ? "succeeded" : ("failed" as GenStatus),
            ])
          ),
        }));
        if (isOutOfCreditsError(err)) {
          // Roll back to the previous round so the user can resume after buying credits
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            generatingPersonaIds: [],
            currentRoundNumber: nextRoundNum - 1,
            rounds: prev.rounds.filter((r) => r.roundNumber !== nextRoundNum),
            userResponse,
          }));
          subscription.checkSubscription();
          pendingCreditActionRef.current = { kind: "submit", response: userResponse };
          setUpgradeReason("out_of_credits");
          setShowUpgrade(true);
          return;
        }
        if (isMissingSessionError(err)) {
          setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
          toast({ title: "Couldn't reach the jury", description: MISSING_SESSION_MESSAGE, variant: "destructive" });
          return;
        }
        setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
        toast({ title: "Generation failed", description: "The panel couldn't respond. Please try submitting again — no credit was charged.", variant: "destructive" });
      }


    },
    [state, getRecentMemories, storeRoundMemories, generateClip, toast, subscription, setRoundGen, ensureSession, sessionIdRef]
  );

  // Failed-no-charge generations only: re-run just those jurors in just those rounds.
  const failedTargets = genRounds
    .map((r) => ({
      roundNumber: r.roundNumber,
      personaIds: Object.entries(r.personas)
        .filter(([, s]) => s === "failed" || s === "cancelled")
        .map(([id]) => id),
    }))
    .filter((r) => r.personaIds.length > 0);
  const failedCount = failedTargets.reduce((sum, r) => sum + r.personaIds.length, 0);

  const handleRetryFailed = useCallback(async () => {
    if (!failedTargets.length || isRetryingFailed) return;
    setIsRetryingFailed(true);

    const sid = sessionIdRef.current ?? (await ensureSession(state));
    setCurrentSessionId(sid ?? undefined);
    if (!sid) {
      setIsRetryingFailed(false);
      toast({ title: "Couldn't retry", description: MISSING_SESSION_MESSAGE, variant: "destructive" });
      return;
    }


    let recovered = 0;
    try {
      for (const target of failedTargets) {
        const personas = state.selectedPersonas.filter((p) => target.personaIds.includes(p.id));
        if (!personas.length) continue;

        setRoundGen(target.roundNumber, (r) => ({
          ...r,
          overall: "generating",
          personas: {
            ...r.personas,
            ...Object.fromEntries(personas.map((p) => [p.id, "generating" as GenStatus])),
          },
        }));
        setState((prev) => ({
          ...prev,
          isGenerating: true,
          generatingPersonaIds: personas.map((p) => p.id),
        }));

        const applyMessage = (personaId: string, text: string) => {
          setState((prev) => ({
            ...prev,
            generatingPersonaIds: prev.generatingPersonaIds.filter((id) => id !== personaId),
            rounds: prev.rounds.map((r) =>
              r.roundNumber === target.roundNumber
                ? {
                    ...r,
                    messages: r.messages.some((m) => m.personaId === personaId)
                      ? r.messages.map((m) => (m.personaId === personaId ? { ...m, text } : m))
                      : [...r.messages, { personaId, text }],
                  }
                : r
            ),
          }));
        };

        const stillFailed = new Set<string>();
        const onFailed = (personaId: string) => {
          stillFailed.add(personaId);
          setRoundGen(target.roundNumber, (r) => ({
            ...r,
            personas: { ...r.personas, [personaId]: "failed" },
          }));
        };

        let messages: RoundMessage[] = [];
        if (target.roundNumber === 1) {
          messages = await generateRound1(state.topic, personas, applyMessage, onFailed);
        } else {
          const previousRound = state.rounds.find((r) => r.roundNumber === target.roundNumber - 1);
          if (!previousRound) continue;
          messages = await generateNextRound(
            state.topic,
            target.roundNumber,
            personas,
            previousRound,
            roundResponsesRef.current[target.roundNumber] ?? "",
            applyMessage,
            getRecentMemories,
            onFailed,
            state.selectedPersonas
          );
        }

        const responseMap: Record<string, string> = {};
        messages.forEach((m) => { responseMap[m.personaId] = m.text; });
        const succeededIds = personas.map((p) => p.id).filter((id) => !stillFailed.has(id));
        recovered += succeededIds.length;
        if (succeededIds.length) {
          await storeRoundMemories(
            succeededIds,
            state.topic,
            target.roundNumber,
            roundResponsesRef.current[target.roundNumber] ?? "",
            responseMap
          );
        }

        setRoundGen(target.roundNumber, (r) => {
          const personaStatuses = {
            ...r.personas,
            ...Object.fromEntries(
              personas.map((p) => [p.id, (stillFailed.has(p.id) ? "failed" : "succeeded") as GenStatus])
            ),
          };
          const anyFailed = Object.values(personaStatuses).some((s) => s === "failed");
          return { ...r, overall: anyFailed ? "failed" : "succeeded", personas: personaStatuses };
        });
      }

      setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
      toast(
        recovered > 0
          ? {
              title: "Retry complete",
              description: `${recovered} juror response${recovered === 1 ? "" : "s"} recovered. No extra credit was charged.`,
            }
          : {
              title: "Retry failed",
              description: "Those jurors still couldn't respond. No extra credit was charged.",
              variant: "destructive",
            }
      );
    } catch (err) {
      console.error("[Retry failed generations]", err);
      setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
      toast({
        title: "Retry failed",
        description: "Couldn't re-run the failed jurors. No extra credit was charged.",
        variant: "destructive",
      });
    } finally {
      setIsRetryingFailed(false);
    }
  }, [failedTargets, isRetryingFailed, state, getRecentMemories, storeRoundMemories, setRoundGen, ensureSession, sessionIdRef, toast]);



  // Keep latest handlers reachable from the credit-resume effect
  handlersRef.current.start = handleStartDebate;
  handlersRef.current.submit = handleUserSubmit;

  // After the buy-credits flow (opened in a new tab), re-check the balance on focus
  // and while polling, then auto-resume the pending round instead of a manual refresh.
  useEffect(() => {
    if (!awaitingCredits) return;
    let cancelled = false;

    const resume = () => {
      const pending = pendingCreditActionRef.current;
      pendingCreditActionRef.current = null;
      setAwaitingCredits(false);
      setShowUpgrade(false);
      setUpgradeReason("default");
      toast({ title: "Credits added", description: "Resuming your jury round now." });
      if (pending?.kind === "submit") handlersRef.current.submit?.(pending.response);
      else handlersRef.current.start?.();
    };

    const check = async () => {
      if (cancelled) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: creditRow } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", session.user.id)
          .maybeSingle();
        await subscription.checkSubscription().catch(() => {});
        if (!cancelled && ((creditRow?.credits ?? 0) > 0 || subscription.isPro)) resume();
      } catch { /* keep polling */ }
    };

    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const interval = setInterval(check, 5000);
    const timeout = setTimeout(() => { cancelled = true; setAwaitingCredits(false); }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingCredits]);


  const handleGenerateRatings = useCallback(async () => {
    if (gradesInFlightRef.current) return; // guard against double-submit
    gradesInFlightRef.current = true;
    setGradesError(null);
    setState((prev) => ({ ...prev, phase: "final-ratings", isGeneratingRatings: true, ratings: [] }));

    const lastUserResponse = state.userResponse || "";
    try {
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

      if (ratings.length === 0) throw new Error("The panel returned no grades.");
      setState((prev) => ({ ...prev, ratings, isGeneratingRatings: false }));
    } catch (err) {
      console.error("[Panel Grades] Error:", err);
      setGradesError(err instanceof Error ? err.message : "Grading failed. Please try again.");
      setState((prev) => ({ ...prev, phase: "debating", isGeneratingRatings: false, ratings: [] }));
      toast({
        title: "Couldn't get panel grades",
        description: "Nothing extra was charged. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      gradesInFlightRef.current = false;
    }
  }, [state.topic, state.selectedPersonas, state.rounds, state.userResponse, getRecentMemories, toast]);


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

  /** Stops streaming for the given round; jurors who already answered are kept. */
  const handleCancelRound = useCallback((roundNumber: number) => {
    cancelActiveGenerations();
    setStreamingTexts({});
    setRoundGen(roundNumber, (r) => ({
      ...r,
      overall: "cancelled",
      personas: Object.fromEntries(
        Object.entries(r.personas).map(([id, st]) => [
          id,
          (st === "succeeded" ? "succeeded" : "cancelled") as GenStatus,
        ])
      ),
    }));
    setState((prev) => ({ ...prev, isGenerating: false, generatingPersonaIds: [] }));
    toast({
      title: `Round ${roundNumber} stopped`,
      description: "Responses that already came in are kept. Retry the stopped jurors any time — no extra charge.",
    });
  }, [setRoundGen, toast]);

  const handleJudge = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: "judge", isGeneratingJudge: true }));
    resetCancellation();
    setJudgeStream("");

    try {
      const { judgeVerdict, script } = await generateJudgeVerdict(
        state.topic,
        state.rounds,
        state.selectedPersonas,
        state.ratings,
        (partial) => {
          const p = extractPartialJudge(partial);
          const lines: string[] = [];
          if (p.verdict) lines.push(`Verdict forming: ${p.verdict}${p.overallScore ? ` · ${p.overallScore}/10` : ""}`);
          if (p.why) lines.push(p.why);
          p.strengths.forEach((x) => lines.push(`Strength: ${x}`));
          p.risks.forEach((x) => lines.push(`Risk: ${x}`));
          if (p.nextStep) lines.push(`Next step: ${p.nextStep}`);
          setJudgeStream(lines.join("\n"));
        }
      );
      setJudgeStream("");
      setState((prev) => ({ ...prev, judgeVerdict, isGeneratingJudge: false }));
      trackEvent("debate_completed", { verdict: judgeVerdict.verdict, score: judgeVerdict.overallScore });

      generateClip(MAX_ROUNDS + 1, state.selectedPersonas, {
        roundNumber: MAX_ROUNDS + 1,
        messages: [{ personaId: "judge", text: script }],
      });
    } catch (err) {
      console.error("[Judge] Error:", err);
      setJudgeStream("");
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
    setSessionPrep("idle");
    setState(initialState);
    setAutoDebate(false);
    setIsAutoResponding(false);
  }, [resetSessionId]);

  const handleRefine = useCallback(() => {
    const currentId = sessionIdRef.current;
    resetSessionId();
    setSessionPrep("idle");
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
  const canStart =
    sessionPrep !== "creating" &&
    state.topic.trim().length > 0 &&
    (panelMode !== "custom" || state.selectedPersonas.length >= 2);
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
      <Helmet>
        <title>Start a Debate — Startup Jury AI</title>
        <meta name="description" content="Pitch your startup idea to 8 AI expert judges and get a scored GO/MAYBE/NO-GO verdict in under 5 minutes." />
        <link rel="canonical" href="https://www.startupjuryai.com/debate" />
        <meta property="og:title" content="Start a Debate — Startup Jury AI" />
        <meta property="og:description" content="Pitch your startup idea to 8 AI expert judges across 4 rounds." />
        <meta property="og:url" content="https://www.startupjuryai.com/debate" />
      </Helmet>
      <h1 className="sr-only">Startup Jury Debate Stage</h1>
      <header className="border-b border-border px-4 sm:px-6 py-4 relative">
        <div className="max-w-[1200px] mx-auto flex items-center gap-2 sm:gap-3 flex-wrap">
          <img src={logo} alt="Startup Jury AI" className="h-28 sm:h-40 md:h-48 -my-8 sm:-my-12 w-auto" width={307} height={305} decoding="async" />
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
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-primary/20 text-primary border border-primary/30 hidden sm:inline">
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
                <div className="mb-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    AI reads your idea and selects the best-fit panel of 8 judges — adapting to your industry, stage, and business model.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary/70">
                    <Zap className="w-3 h-3" />
                    <span>Panels adapt dynamically based on your pitch content</span>
                  </div>
                </div>
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
                        <span key={pid} className={`px-2 py-1 rounded-sm text-xs font-medium ${colors.text} bg-muted/30`}>
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

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-mono">
              <span className="text-muted-foreground">
                Remaining credits:{" "}
                <span className={`font-semibold ${isPro ? "text-primary" : subscription.credits > 0 ? "text-foreground" : "text-destructive"}`}>
                  {isPro ? "Unlimited (Pro)" : subscription.credits}
                </span>
              </span>
              <span className="text-muted-foreground">
                Cost: <span className="font-semibold text-foreground">{isPro ? "0" : "1"} credit</span> for the full 4-round jury (0 per round)
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowCreditsHelp(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="How credits work"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[300px] font-sans text-xs leading-relaxed">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-foreground">How credits work</p>
                    <p>One credit = one full 4-round jury evaluation. All four rounds — opening statements, your defense, and the final verdict — count as a single evaluation.</p>
                    <p>A credit is deducted only when a new jury session starts and the panel successfully responds. If generation fails (an error, AI outage, or empty response), the credit is not charged and your balance stays the same.</p>
                    <p>In-progress sessions never cut off mid-round — once a jury starts, all four rounds run regardless of your balance.</p>
                    <p className="text-muted-foreground">Click for full examples.</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              {!isPro && subscription.credits <= 0 && (
                <button
                  type="button"
                  onClick={() => { setUpgradeReason("out_of_credits"); setShowUpgrade(true); }}
                  className="text-primary underline underline-offset-2"
                >
                  Buy credits
                </button>
              )}
            </div>


            <Button
              onClick={handleStartDebate}
              disabled={!canStart || state.isGenerating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {sessionPrep === "creating" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing session…
                </>
              ) : state.isGenerating ? (
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
                  streamingTexts={streamingTexts}
                />

                <GenerationStatusPanel
                  personas={state.selectedPersonas}
                  rounds={genRounds}
                  maxRounds={MAX_ROUNDS}
                  isPro={isPro}
                  failedCount={failedCount}
                  isRetrying={isRetryingFailed}
                  onRetryFailed={handleRetryFailed}
                  onCancelRound={handleCancelRound}
                />




                {clips[state.currentRoundNumber] && (
                  <HostVideoPlayer
                    clipUrl={clips[state.currentRoundNumber]!.audioUrl}
                    script={clips[state.currentRoundNumber]!.script}
                    isLoading={clips[state.currentRoundNumber]!.isLoading}
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
                <div className="flex justify-end gap-2 flex-wrap">
                  <SocialShareButton
                    topic={state.topic}
                    verdict={state.judgeVerdict}
                    ratings={state.ratings}
                    personas={state.selectedPersonas}
                    sessionId={sessionIdRef.current ?? undefined}
                  />
                  <ExportDebateButton
                    isPro={isPro}
                    onUpgrade={() => { setUpgradeReason("default"); setShowUpgrade(true); }}
                    topic={state.topic}
                    personas={state.selectedPersonas}
                    rounds={state.rounds}
                    ratings={state.ratings}
                    judgeVerdict={state.judgeVerdict}
                    sessionId={sessionIdRef.current ?? undefined}
                  />
                </div>
                <JudgeVerdictCard
                  verdict={state.judgeVerdict}
                  isGenerating={state.isGeneratingJudge}
                  streamingText={judgeStream}
                  onReset={handleReset}
                  onRefine={handleRefine}
                  sessionId={sessionIdRef.current ?? undefined}
                  ratings={state.ratings}
                  personas={state.selectedPersonas}
                  topic={state.topic}
                />
                {clips[MAX_ROUNDS + 1] && (
                  <HostVideoPlayer
                    clipUrl={clips[MAX_ROUNDS + 1]!.audioUrl}
                    script={clips[MAX_ROUNDS + 1]!.script}
                    isLoading={clips[MAX_ROUNDS + 1]!.isLoading}
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
      <CreditsHelpModal
        open={showCreditsHelp}
        onOpenChange={setShowCreditsHelp}
        isPro={subscription.isPro}
        credits={subscription.credits}
        onBuyCredits={() => { setUpgradeReason("out_of_credits"); setShowUpgrade(true); }}
      />
      <UpgradeModal

        open={showUpgrade}
        onClose={() => { setShowUpgrade(false); setUpgradeReason("default"); }}
        isPro={subscription.isPro}
        isStudio={subscription.isStudio}
        tier={subscription.tier}
        credits={subscription.credits}
        subscriptionEnd={subscription.subscriptionEnd}
        reason={upgradeReason}
        onCheckout={async (plan?: string) => { await subscription.startCheckout(plan); setAwaitingCredits(true); }}
        onPurchaseCredits={async (pack: string) => { await subscription.purchaseCredits(pack); setAwaitingCredits(true); }}
        onManage={subscription.manageSubscription}
      />
    </div>
  );
};

export default Index;
