import { useEffect } from "react";
import { useCopilotReadable } from "@copilotkit/react-core";
import { DebateState } from "@/types/debate";

/**
 * Hook that exposes debate state to CopilotKit agent state
 * and emits AG-UI events on user actions.
 */
export function useDebateAgentState(state: DebateState) {
  // Expose core state as readable context for the agent
  useCopilotReadable({
    description: "The current debate topic / startup idea",
    value: state.topic,
  });

  useCopilotReadable({
    description: "Selected debate personas/panelists with their scoring weights",
    value: state.selectedPersonas.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      scoringWeights: p.scoringWeights,
      inverseScore: p.inverseScore ?? false,
    })),
  });

  useCopilotReadable({
    description: "All debate rounds with persona messages",
    value: state.rounds,
  });

  useCopilotReadable({
    description: "Current round number",
    value: state.currentRoundNumber,
  });

  useCopilotReadable({
    description: "Current debate phase: setup | debating | final-ratings | judge",
    value: state.phase,
  });

  useCopilotReadable({
    description: "User follow-up responses submitted each round",
    value: state.userResponse,
  });

  useCopilotReadable({
    description: "Final persona scores (0-10), verdict, and metrics from each panelist",
    value: state.ratings.map((r) => ({
      personaId: r.personaId,
      score: r.score,
      verdict: r.verdict,
      metrics: r.metrics,
    })),
  });

  useCopilotReadable({
    description: "Final judge verdict: GO/MAYBE/NO-GO with overall score, strengths, risks, and next step",
    value: state.judgeVerdict,
  });

  // Debug: log agent state to dev console on every change
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
 * Emit an AG-UI style event to the console (and CopilotKit action system).
 */
export function emitAgUIEvent(event: {
  type: string;
  content: string;
  round: number;
}) {
  console.log("[AG-UI Event]", event);
}
