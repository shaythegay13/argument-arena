import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DebateState } from "@/types/debate";
import { PERSONAS } from "@/data/personas";

export function useSessionPersistence(userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const iterationRef = useRef<{ parentSessionId: string; version: number } | null>(null);

  const saveSession = useCallback(
    async (state: DebateState) => {
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

        // Attach iteration info on first insert
        if (!sessionIdRef.current && iterationRef.current) {
          payload.parent_session_id = iterationRef.current.parentSessionId;
          payload.version = iterationRef.current.version;
        }

        if (sessionIdRef.current) {
          await supabase
            .from("debate_sessions")
            .update(payload)
            .eq("id", sessionIdRef.current);
        } else {
          const { data } = await supabase
            .from("debate_sessions")
            .insert(payload)
            .select("id")
            .single();
          if (data) sessionIdRef.current = data.id;
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

  const resetSessionId = useCallback(() => {
    sessionIdRef.current = null;
  }, []);

  return { saveSession, loadSession, resetSessionId, sessionId: sessionIdRef };
}
