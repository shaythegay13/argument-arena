import { supabase } from "@/integrations/supabase/client";
import { Persona, Round, RoundMessage, PersonaRating } from "@/types/debate";

async function callCompletion(
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("debate-ai", {
    body: { systemPrompt, userPrompt, ...(model && { model }) },
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(error.message || "AI call failed");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.content ?? "No response generated.";
}

function inferIndustry(topic: string): string {
  const keywords: Record<string, string> = {
    fintech: "fintech", finance: "finance", health: "healthcare",
    medical: "healthcare", education: "edtech", food: "food & beverage",
    retail: "retail", ecommerce: "e-commerce", "e-commerce": "e-commerce",
    saas: "SaaS", ai: "artificial intelligence", crypto: "crypto/web3",
    gaming: "gaming", sports: "sports", "real estate": "real estate",
    logistics: "logistics", travel: "travel",
  };
  const lower = topic.toLowerCase();
  for (const [key, industry] of Object.entries(keywords)) {
    if (lower.includes(key)) return industry;
  }
  return "technology";
}

function enrichSystemPrompt(persona: Persona, topic: string): string {
  const industry = inferIndustry(topic);
  return persona.systemPrompt.replace(
    /\[(?:auto-detect industry from idea|insert industry from idea)\]/gi,
    industry
  );
}

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getWordLimit(roundNumber: number): number {
  if (roundNumber === 1) return 100;
  if (roundNumber === 2) return 75;
  if (roundNumber === 3) return 50;
  return 0;
}

function buildRound1Prompt(topic: string): string {
  return `Topic/Idea: "${topic}"

You are on a debate stage with other startup experts. This is Round 1. Give a concise reaction to this idea, in your own voice. Be specific and direct. End with 1-2 pointed questions for the founder.

Keep your response under 100 words.`;
}

function buildRoundNPrompt(
  topic: string,
  roundNumber: number,
  previousRound: Round,
  allPersonas: Persona[],
  userResponse: string,
  personaMemory?: string
): { systemContext: string; userPrompt: string } {
  const wordLimit = getWordLimit(roundNumber);
  const prevMessages = previousRound.messages
    .map((m) => {
      const p = allPersonas.find((p) => p.id === m.personaId);
      return `${p?.subtitle ?? "Expert"}: "${m.text}"`;
    })
    .join("\n\n");

  const memoryBlock = personaMemory
    ? `\nMEMORY (your past notes on this founder):\n${personaMemory}\n`
    : "";

  // Previous round context goes into systemPrompt (appended to persona character) to avoid
  // the 5000-char userPrompt limit on the edge function. Total info is identical.
  const systemContext = `${memoryBlock}
Previous round statements from your fellow panelists:
${prevMessages}`;

  const userPrompt = `Topic/Idea: "${topic}"

The founder responded: "${userResponse}"

This is Round ${roundNumber}. Respond briefly to the idea, the founder's response, and to 1–2 key points made by the others in the last round. Refer to them by role (e.g., "the angel investor", "the skeptic"). Be direct and specific. End with 1-2 new questions for the founder.

Keep your response under ${wordLimit} words.`;

  return { systemContext, userPrompt };
}

function buildFinalRatingPrompt(
  topic: string,
  allRounds: Round[],
  allPersonas: Persona[],
  userResponse: string,
  persona: Persona,
  personaMemory?: string
): string {
  const memoryBlock = personaMemory
    ? `\nMEMORY (your past notes on this founder):\n${personaMemory}\n`
    : "";
  const roundsText = allRounds
    .map((round) => {
      const msgs = round.messages
        .map((m) => {
          const p = allPersonas.find((p) => p.id === m.personaId);
          return `  ${p?.subtitle ?? "Expert"}: "${m.text}"`;
        })
        .join("\n");
      return `Round ${round.roundNumber}:\n${msgs}`;
    })
    .join("\n\n");

  const weightsBlock = persona.scoringWeights
    .map((w) => `- ${w.label}: ${Math.round(w.weight * 100)}% weight`)
    .join("\n");

  const metricsFormat = persona.scoringWeights
    .map((w) => `${w.label}=[0-10]`)
    .join(", ");

  const inverseNote = persona.inverseScore
    ? "\n⚠️ INVERSE SCORING: You score the RISK level (10 = extremely risky idea). Your raw score gets inverted by the system (10 - score) for the final idea rating. Score high if this idea is highly risky."
    : "";

  return `Topic/Idea: "${topic}"
${memoryBlock}

Full debate transcript:
${roundsText}

The founder's latest response: "${userResponse}"

YOUR SCORING CRITERIA:
${weightsBlock}${inverseNote}

This is the FINAL round. Give your final 2-3 sentence verdict on this business idea based on your criteria above, then score it.

You MUST end your response with exactly this format on a new line:
SCORE: [0-10]/10 | [one-sentence verdict]. METRICS: ${metricsFormat}

EXAMPLE: SCORE: 8/10 | Founder-market fit is strong with clear unfair advantage. METRICS: ${persona.scoringWeights.map((w) => `${w.label}=8`).join(", ")}`;
}

export async function generateRound1(
  topic: string,
  personas: Persona[],
  onPersonaComplete: (personaId: string, text: string) => void
): Promise<RoundMessage[]> {
  const userPrompt = buildRound1Prompt(topic);
  const messages: RoundMessage[] = [];
  const shuffled = shuffleArray(personas);

  await Promise.all(
    shuffled.map(async (persona) => {
      const system = enrichSystemPrompt(persona, topic);
      const text = await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);
      onPersonaComplete(persona.id, text);
    })
  );

  return messages;
}

export async function generateNextRound(
  topic: string,
  roundNumber: number,
  personas: Persona[],
  previousRound: Round,
  userResponse: string,
  onPersonaComplete: (personaId: string, text: string) => void,
  getMemory?: (personaId: string) => string
): Promise<RoundMessage[]> {
  const messages: RoundMessage[] = [];
  const shuffled = shuffleArray(personas);

  await Promise.all(
    shuffled.map(async (persona) => {
      const memory = getMemory?.(persona.id);
      const { systemContext, userPrompt } = buildRoundNPrompt(topic, roundNumber, previousRound, personas, userResponse, memory);
      const system = enrichSystemPrompt(persona, topic) + "\n\n" + systemContext;
      const text = await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);
      onPersonaComplete(persona.id, text);
    })
  );

  return messages;
}

export async function generateFinalRatings(
  topic: string,
  personas: Persona[],
  allRounds: Round[],
  userResponse: string,
  onPersonaComplete: (personaId: string, text: string) => void,
  getMemory?: (personaId: string) => string
): Promise<{ messages: RoundMessage[]; ratings: PersonaRating[] }> {
  const messages: RoundMessage[] = [];
  const ratings: PersonaRating[] = [];

  await Promise.all(
    personas.map(async (persona) => {
      const system =
        enrichSystemPrompt(persona, topic) +
        "\n\nIMPORTANT: You MUST end your response with exactly: SCORE: [0-10]/10 | [one-sentence verdict]. METRICS: " +
        persona.scoringWeights.map((w) => `${w.label}=[0-10]`).join(", ");
      const memory = getMemory?.(persona.id);
      const userPrompt = buildFinalRatingPrompt(topic, allRounds, personas, userResponse, persona, memory);
      const text = await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);

      const parsed = parseRatingFromText(text, persona);
      ratings.push(parsed);

      onPersonaComplete(persona.id, text);
    })
  );

  return { messages, ratings };
}

export async function generateRatingsOnly(
  topic: string,
  personas: Persona[],
  allRounds: Round[],
  lastUserResponse: string,
  onRatingComplete: (personaId: string, rating: PersonaRating) => void,
  getMemory?: (personaId: string) => string
): Promise<PersonaRating[]> {
  const ratings: PersonaRating[] = [];

  await Promise.all(
    personas.map(async (persona) => {
      const system =
        enrichSystemPrompt(persona, topic) +
        "\n\nIMPORTANT: You MUST end your response with exactly: SCORE: [0-10]/10 | [one-sentence verdict]. METRICS: " +
        persona.scoringWeights.map((w) => `${w.label}=[0-10]`).join(", ");
      const memory = getMemory?.(persona.id);
      const userPrompt = buildFinalRatingPrompt(topic, allRounds, personas, lastUserResponse, persona, memory);
      const text = await callCompletion(system, userPrompt);

      const rating = parseRatingFromText(text, persona);
      ratings.push(rating);
      onRatingComplete(persona.id, rating);
    })
  );

  return ratings;
}

function parseRatingFromText(text: string, persona: Persona): PersonaRating {
  // Extract the assessment (everything before the SCORE/RATING line)
  const assessmentText = text.replace(/SCORE:.*$/is, "").replace(/RATING:.*$/is, "").trim();

  // Try multiple regex patterns for robustness
  const patterns = [
    /SCORE:\s*(\d+)\s*\/\s*10\s*\|\s*(.+?)\.\s*METRICS:\s*(.+)/i,
    /SCORE:\s*(\d+)\s*\/\s*10\s*\|\s*(.+?)\s*METRICS:\s*(.+)/i,
    /SCORE:\s*(\d+)\s*\/\s*10\s*\|\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let rawScore = Math.min(10, Math.max(0, parseInt(match[1])));
      if (persona.inverseScore) rawScore = 10 - rawScore;

      const verdictText = match[2].trim().replace(/\.\s*$/, "");
      const metrics: Record<string, number> = {};
      const metricsStr = match[3];
      if (metricsStr) {
        metricsStr.split(",").forEach((m) => {
          const parts = m.split("=").map((s) => s.trim());
          if (parts[0] && parts[1]) metrics[parts[0]] = parseInt(parts[1]) || 0;
        });
      }

      return { personaId: persona.id, score: rawScore, verdict: verdictText, assessment: assessmentText, metrics };
    }
  }

  // Fallback: try to find any X/10 pattern
  const anyScoreMatch = text.match(/(\d+)\s*\/\s*10/);
  let fallbackScore = anyScoreMatch ? Math.min(10, Math.max(0, parseInt(anyScoreMatch[1]))) : 5;
  if (persona.inverseScore) fallbackScore = 10 - fallbackScore;

  console.warn("[parseRating] Could not parse structured score from:", text.slice(-200));

  return {
    personaId: persona.id,
    score: fallbackScore,
    verdict: assessmentText.split(".").slice(-2).join(".").trim() || "Rating not provided",
    assessment: assessmentText,
    metrics: {},
  };
}

export async function generateJudgeVerdict(
  topic: string,
  rounds: Round[],
  personas: Persona[],
  ratings: PersonaRating[]
): Promise<{ script: string; judgeVerdict: import("@/types/debate").JudgeVerdict }> {
  const overallScore =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : 5;

  const systemPrompt = `You are the Consensus Judge for a Startup Jury panel. You have reviewed scores from ${ratings.length} expert personas.

The pre-calculated overall average score is ${overallScore}/10.

VERDICT THRESHOLDS:
- 8.0 or above → "GO"
- 6.0 to 7.9 → "MAYBE"
- Below 6.0 → "NO-GO"

You MUST respond in EXACTLY this JSON format (no markdown, no code fences):
{"verdict":"GO","overallScore":${overallScore},"why":"One crisp sentence explaining the verdict","strengths":["Pattern 1","Pattern 2","Pattern 3"],"risks":["Risk 1","Risk 2"],"nextStep":"One concrete action the founder should take now"}

"verdict" must be exactly one of: "GO", "MAYBE", "NO-GO"
"strengths" must be an array of exactly 3 strings
"risks" must be an array of exactly 2 strings`;

  const roundsText = rounds
    .map((round) => {
      const msgs = round.messages
        .map((m) => {
          const p = personas.find((p) => p.id === m.personaId);
          return `  ${p?.subtitle ?? "Expert"}: "${m.text}"`;
        })
        .join("\n");
      return `Round ${round.roundNumber}:\n${msgs}`;
    })
    .join("\n\n");

  const ratingsText = ratings
    .map((r) => {
      const p = personas.find((p) => p.id === r.personaId);
      const metricsStr = Object.entries(r.metrics)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      return `${p?.name ?? "Expert"} (${p?.subtitle}): ${r.score}/10 — ${r.verdict}${metricsStr ? ` | ${metricsStr}` : ""}`;
    })
    .join("\n");

  const userPrompt = `Topic/Idea: "${topic}"

Full debate transcript:
${roundsText}

Final persona scores:
${ratingsText}

Overall average: ${overallScore}/10

Deliver your verdict as JSON.`;

  const raw = await callCompletion(systemPrompt, userPrompt);

  // Parse JSON from response
  let parsed: {
    verdict?: string;
    overallScore?: number;
    why?: string;
    strengths?: string[];
    risks?: string[];
    nextStep?: string;
  };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? raw);
  } catch {
    parsed = {};
  }

  const verdictValue = (["GO", "MAYBE", "NO-GO"].includes(parsed.verdict ?? "")
    ? parsed.verdict
    : overallScore >= 8 ? "GO" : overallScore >= 6 ? "MAYBE" : "NO-GO") as "GO" | "MAYBE" | "NO-GO";

  const strengths = parsed.strengths ?? [];
  const risks = parsed.risks ?? [];

  const judgeVerdict: import("@/types/debate").JudgeVerdict = {
    verdict: verdictValue,
    overallScore: parsed.overallScore ?? overallScore,
    why: parsed.why ?? "Verdict based on panel consensus.",
    strengths: [strengths[0] ?? "Strong concept", strengths[1] ?? "Clear market need", strengths[2] ?? "Motivated founder"],
    risks: [risks[0] ?? "Execution risk", risks[1] ?? "Market timing uncertainty"],
    nextStep: parsed.nextStep ?? "Validate with 10 paying customers before building further.",
  };

  const script = `The Startup Jury has deliberated. Overall score: ${judgeVerdict.overallScore}/10. Verdict: ${judgeVerdict.verdict}. ${judgeVerdict.why} Key strength: ${judgeVerdict.strengths[0]}. Key risk: ${judgeVerdict.risks[0]}. Next step: ${judgeVerdict.nextStep}`;

  return { script, judgeVerdict };
}

export async function generateAutoResponse(
  topic: string,
  currentRound: Round,
  personas: Persona[]
): Promise<string> {
  const expertsBlock = currentRound.messages
    .map((m) => {
      const p = personas.find((p) => p.id === m.personaId);
      return `${p?.subtitle ?? "Expert"}: "${m.text}"`;
    })
    .join("\n");

  return callCompletion(
    "You are a startup founder defending your idea. Be concise and direct. Address the sharpest criticisms raised. Speak in first person.",
    `Topic: "${topic}"

Experts just said:
${expertsBlock}

Respond as the founder in 2-3 sentences, addressing the most critical challenges raised.`,
    "google/gemini-2.5-flash-lite"
  );
}

export async function generateSummary(
  topic: string,
  rounds: Round[],
  personas: Persona[]
): Promise<string> {
  const systemPrompt =
    "You are a neutral startup evaluator summarizing a panel debate between multiple experts. Be fair, concise, and practical.";

  const roundsText = rounds
    .map((round) => {
      const msgs = round.messages
        .map((m) => {
          const p = personas.find((p) => p.id === m.personaId);
          return `  ${p?.subtitle ?? "Expert"}: "${m.text}"`;
        })
        .join("\n");
      return `Round ${round.roundNumber}:\n${msgs}`;
    })
    .join("\n\n");

  const userPrompt = `Topic/Idea: "${topic}"

Full debate transcript:
${roundsText}

Summarize the key points and questions from this round in 2-3 short paragraphs. Highlight the most important questions the panelists are asking the founder. Be concise and actionable.`;

  return callCompletion(systemPrompt, userPrompt);
}
