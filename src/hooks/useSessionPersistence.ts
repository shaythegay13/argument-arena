import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DebateState } from "@/types/debate";

export function useSessionPersistence(userId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);

  const saveSession = useCallback(
    async (state: DebateState) => {
      if (!userId) return;

      const payload = {
        user_id: userId,
        topic: state.topic,
        selected_persona_ids: state.selectedPersonas.map((p) => p.id),
        rounds: state.rounds as any,
        user_responses: [] as any, // stored inline in rounds
        ratings: state.ratings as any,
        judge_verdict: state.judgeVerdict as any,
        phase: state.phase,
      };

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
    },
    [userId]
  );

  const resetSessionId = useCallback(() => {
    sessionIdRef.current = null;
  }, []);

  return { saveSession, resetSessionId, sessionId: sessionIdRef };
}
