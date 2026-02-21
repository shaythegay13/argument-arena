import { useEffect } from "react";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { DebateState } from "@/types/debate";

/**
 * Hook that exposes debate state to CopilotKit agent state
 * and emits AG-UI events on user actions.
 */
export function useDebateAgentState(state: DebateState) {
  // Expose core state as readable context for the agent
  useCopilotReadable({
    description: "The current debate topic",
    value: state.topic,
  });

  useCopilotReadable({
    description: "Selected debate personas/panelists",
    value: state.selectedPersonas.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
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
    description: "Current debate phase",
    value: state.phase,
  });

  useCopilotReadable({
    description: "User follow-up responses submitted each round",
    value: state.userResponse,
  });

  useCopilotReadable({
    description: "Final persona ratings (available after last round)",
    value: state.ratings,
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
      ratings: state.ratings,
    });
  }, [
    state.topic,
    state.selectedPersonas,
    state.rounds,
    state.currentRoundNumber,
    state.phase,
    state.userResponse,
    state.ratings,
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
