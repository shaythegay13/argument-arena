import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DebateState } from "@/types/debate";
import { PERSONAS } from "@/data/personas";

/** Key holding the id of the debate currently in progress, so a refresh resumes it. */
const ACTIVE_SESSION_KEY = "sj:active-session";

/** Reads the in-progress session id (client only; safe to call during effects). */
export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function storeSessionId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_SESSION_KEY, id);
    else window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    /* storage unavailable — resume simply falls back to the URL param */
  }
}

export function useSessionPersistence(userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const iterationRef = useRef<{ parentSessionId: string; version: number } | null>(null);


  const saveSession = useCallback(
    async (state: DebateState, options?: { visibility?: string }) => {
      if (!userId) return;
      if (savingRef.current) return;
      savingRef.current = true;

      try {
        const payload: Record<string, any> = {
          user_id: userId,
          topic: state.topic,
          selected_persona_ids: state.selectedPersonas.map((p) => p.id),
          rounds: state.rounds as any,
          user_responses: [] as any,
          ratings: state.ratings as any,
          judge_verdict: state.judgeVerdict as any,
          phase: state.phase,
        };

        if (options?.visibility) {
          payload["visibility"] = options.visibility;
          payload["is_public"] = options.visibility !== "private";
        }

        // Attach iteration info on first insert
        if (!sessionIdRef.current && iterationRef.current) {
          payload["parent_session_id"] = iterationRef.current.parentSessionId;
          payload["version"] = iterationRef.current.version;
        }

        if (sessionIdRef.current) {
          await (supabase
            .from("debate_sessions")
            .update(payload as any) as any)
            .eq("id", sessionIdRef.current);
        } else {
          const { data } = await (supabase
            .from("debate_sessions")
            .insert(payload as any) as any)
            .select("id")
            .single();
          if (data) sessionIdRef.current = (data as any).id;
        }
      } finally {
        savingRef.current = false;
      }
    },
    [userId]
  );

  const loadSession = useCallback(
    async (sessionId: string): Promise<DebateState | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("debate_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        console.error("Failed to load session:", error);
        return null;
      }

      // Reconstruct the personas from the IDs
      const selectedPersonas = PERSONAS.filter((p) =>
        data.selected_persona_ids?.includes(p.id)
      );

      // Determine the current round number
      const rounds = (data.rounds || []) as any[];
      const currentRoundNumber =
        data.phase === "setup"
          ? 0
          : data.phase === "debating"
          ? rounds.length || 1
          : rounds.length;

      const state: DebateState = {
        topic: data.topic || "",
        selectedPersonas,
        rounds: rounds,
        currentRoundNumber,
        isGenerating: false,
        generatingPersonaIds: [],
        expandedPersonaId: null,
        userResponse: "",
        ratings: (data.ratings || []) as any[],
        isGeneratingRatings: false,
        phase: (data.phase as DebateState["phase"]) || "setup",
        judgeVerdict: data.judge_verdict as any,
        isGeneratingJudge: false,
      };

      // Set the session ID so future saves update this session
      sessionIdRef.current = sessionId;

      return state;
    },
    [userId]
  );

  // Ensure a session row exists BEFORE any AI generation, so billing has a stable session id.
  const ensureSession = useCallback(
    async (state: DebateState): Promise<string | null> => {
      if (!userId) return null;
      if (sessionIdRef.current) return sessionIdRef.current;

      const payload: Record<string, any> = {
        user_id: userId,
        topic: state.topic,
        selected_persona_ids: state.selectedPersonas.map((p) => p.id),
        rounds: [] as any,
        user_responses: [] as any,
        ratings: [] as any,
        phase: "debating",
      };

      if (iterationRef.current) {
        payload["parent_session_id"] = iterationRef.current.parentSessionId;
        payload["version"] = iterationRef.current.version;
      }

      // One retry: a transient insert failure shouldn't block the whole run.
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await (supabase
          .from("debate_sessions")
          .insert(payload as any) as any)
          .select("id")
          .single();

        const newId = (data as { id?: string } | null)?.id;
        if (newId) {
          sessionIdRef.current = newId;
          return newId;
        }
        console.error(`[ensureSession] insert failed (attempt ${attempt + 1}):`, error);
      }
      return null;
    },
    [userId]
  );


  const resetSessionId = useCallback(() => {
    sessionIdRef.current = null;
    iterationRef.current = null;
  }, []);

  const setIteration = useCallback((parentSessionId: string, version: number) => {
    iterationRef.current = { parentSessionId, version };
  }, []);

  return { saveSession, loadSession, resetSessionId, setIteration, ensureSession, sessionId: sessionIdRef };
}
