export interface Persona {
  id: string;
  name: string;
  subtitle: string;
  colorKey: string;
  systemPrompt: string;
}

export interface RoundMessage {
  personaId: string;
  text: string;
}

export interface Round {
  roundNumber: number;
  messages: RoundMessage[];
}

export interface PersonaRating {
  personaId: string;
  rating: number;
  reason: string;
}

export interface JudgeVerdict {
  lean: "yes" | "no" | "more data";
  reasons: [string, string];
}

export interface DebateState {
  topic: string;
  selectedPersonas: Persona[];
  rounds: Round[];
  currentRoundNumber: number;
  isGenerating: boolean;
  generatingPersonaIds: string[];
  expandedPersonaId: string | null;
  userResponse: string;
  ratings: PersonaRating[];
  isGeneratingRatings: boolean;
  phase: "setup" | "debating" | "final-ratings" | "judge";
  judgeVerdict: JudgeVerdict | null;
  isGeneratingJudge: boolean;
}
