export interface ScoringWeight {
  label: string;
  weight: number; // percentage as decimal e.g. 0.4
}

export interface Persona {
  id: string;
  name: string;
  subtitle: string;
  colorKey: string;
  emoji: string;        // visual icon for quick scanning
  vibe: string;         // short personality tagline
  systemPrompt: string;
  scoringWeights: ScoringWeight[];
  inverseScore?: boolean; // true for Riley (skeptic) — high risk score = low idea score
}

export interface RoundMessage {
  personaId: string;
  text: string;
}

export interface Round {
  roundNumber: number;
  messages: RoundMessage[];
  wordLimit?: number; // 100 / 75 / 50 / undefined (scoring round)
}

export interface PersonaRating {
  personaId: string;
  score: number;       // 0-10 (already inverted for skeptic)
  verdict: string;     // one-sentence verdict
  assessment: string;  // full multi-sentence assessment text
  metrics: Record<string, number>; // e.g. { Grit: 8, Timing: 7, Upside: 9 }
}

export interface JudgeVerdict {
  verdict: "GO" | "MAYBE" | "NO-GO";
  overallScore: number;           // average of all scores, 1 decimal
  why: string;                    // 1 crisp sentence
  strengths: [string, string, string]; // exactly 3
  risks: [string, string];        // exactly 2
  nextStep: string;               // 1 concrete action
  topPraise: string;              // single best praise from the panel
  skepticKillShot: string;        // sharpest critique from skeptic
  percentile: number;             // 0-99, compared to other startups evaluated
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
