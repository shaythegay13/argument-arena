import { supabase } from "@/integrations/supabase/client";
import { Persona, Round, RoundMessage, PersonaRating } from "@/types/debate";

async function callCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("debate-ai", {
    body: { systemPrompt, userPrompt },
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

function buildRound1Prompt(topic: string): string {
  return `Topic/Idea: "${topic}"

You are on a debate stage with other startup experts. This is Round 1. Give a concise 2–4 sentence reaction to this idea, in your own voice. Be specific and direct. End with 1-2 pointed questions for the founder.`;
}

function buildRoundNPrompt(
  topic: string,
  roundNumber: number,
  previousRound: Round,
  allPersonas: Persona[],
  userResponse: string
): string {
  const prevMessages = previousRound.messages
    .map((m) => {
      const p = allPersonas.find((p) => p.id === m.personaId);
      return `${p?.subtitle ?? "Expert"}: "${m.text}"`;
    })
    .join("\n\n");

  return `Topic/Idea: "${topic}"

Previous round statements:
${prevMessages}

The founder responded: "${userResponse}"

This is Round ${roundNumber}. Respond briefly (2–4 sentences) to the idea, the founder's response, and to 1–2 key points made by the others in the last round. Refer to them by role (e.g., "the angel investor", "the skeptic"). Be direct and specific. End with 1-2 new questions for the founder.`;
}

function buildFinalRatingPrompt(
  topic: string,
  allRounds: Round[],
  allPersonas: Persona[],
  userResponse: string
): string {
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

  return `Topic/Idea: "${topic}"

Full debate transcript:
${roundsText}

The founder's latest response: "${userResponse}"

This is the FINAL round. Give your final 2-3 sentence verdict on this business idea, then rate it out of 10 (where 1 = terrible idea, 10 = exceptional opportunity). You MUST end your response with exactly this format on a new line:
RATING: [number]/10 | [one sentence reason]`;
}

export async function generateRound1(
  topic: string,
  personas: Persona[],
  onPersonaComplete: (personaId: string, text: string) => void
): Promise<RoundMessage[]> {
  const userPrompt = buildRound1Prompt(topic);
  const messages: RoundMessage[] = [];

  await Promise.all(
    personas.map(async (persona) => {
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
  onPersonaComplete: (personaId: string, text: string) => void
): Promise<RoundMessage[]> {
  const messages: RoundMessage[] = [];

  await Promise.all(
    personas.map(async (persona) => {
      const system = enrichSystemPrompt(persona, topic);
      const userPrompt = buildRoundNPrompt(topic, roundNumber, previousRound, personas, userResponse);
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
  onPersonaComplete: (personaId: string, text: string) => void
): Promise<{ messages: RoundMessage[]; ratings: PersonaRating[] }> {
  const messages: RoundMessage[] = [];
  const ratings: PersonaRating[] = [];
  const finalRoundNum = allRounds.length + 1;

  await Promise.all(
    personas.map(async (persona) => {
      const system = enrichSystemPrompt(persona, topic) + "\n\nIMPORTANT: You MUST end your response with exactly: RATING: [number]/10 | [reason]";
      const userPrompt = buildFinalRatingPrompt(topic, allRounds, personas, userResponse);
      const text = await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);

      // Parse rating from response
      const ratingMatch = text.match(/RATING:\s*(\d+)\/10\s*\|\s*(.+)/i);
      if (ratingMatch) {
        ratings.push({
          personaId: persona.id,
          rating: Math.min(10, Math.max(1, parseInt(ratingMatch[1]))),
          reason: ratingMatch[2].trim(),
        });
      } else {
        ratings.push({ personaId: persona.id, rating: 5, reason: "Rating not provided" });
      }

      onPersonaComplete(persona.id, text);
    })
  );

  return { messages, ratings };
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
