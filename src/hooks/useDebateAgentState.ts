import { useEffect } from "react";
import { DebateState } from "@/types/debate";

/**
 * Hook that logs debate state for debugging.
 */
export function useDebateAgentState(state: DebateState) {
  useEffect(() => {
    console.log("[AG-UI Agent State]", {
      topic: state.topic,
      selectedPersonas: state.selectedPersonas.map((p) => p.subtitle),
      rounds: state.rounds.length,
      currentRound: state.currentRoundNumber,
      phase: state.phase,
      userResponse: state.userResponse ? `"${state.userResponse.slice(0, 50)}..."` : "(empty)",
      ratings: state.ratings.map((r) => ({ personaId: r.personaId, score: r.score, metrics: r.metrics })),
      judgeVerdict: state.judgeVerdict,
    });
  }, [
    state.topic,
    state.selectedPersonas,
    state.rounds,
    state.currentRoundNumber,
    state.phase,
    state.userResponse,
    state.ratings,
    state.judgeVerdict,
  ]);
}

/**
 * Emit an AG-UI style event to the console.
 */
export function emitAgUIEvent(event: {
  type: string;
  content: string;
  round: number;
}) {
  console.log("[AG-UI Event]", event);
}
