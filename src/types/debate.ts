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

export interface DebateState {
  topic: string;
  selectedPersonas: Persona[];
  rounds: Round[];
  currentRoundNumber: number;
  summary: string | null;
  isGenerating: boolean;
  generatingPersonaIds: string[];
  isGeneratingSummary: boolean;
}
