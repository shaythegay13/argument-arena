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

export interface DebateState {
  topic: string;
  selectedPersonas: Persona[];
  rounds: Round[];
  currentRoundNumber: number;
  summary: string | null;
  isGenerating: boolean;
  generatingPersonaIds: string[];
  isGeneratingSummary: boolean;
  expandedPersonaId: string | null;
  userResponse: string;
  ratings: PersonaRating[];
  isGeneratingRatings: boolean;
  phase: "setup" | "debating" | "user-respond" | "final-ratings";
}
