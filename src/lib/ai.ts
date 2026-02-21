import { Persona, Round, RoundMessage } from "@/types/debate";

/**
 * Stub AI call — replace the body of this function with a real API call
 * (e.g., OpenAI, Anthropic, Lovable AI) when ready.
 */
async function callCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // Simulate network delay + varied response length
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1800));

  // Return a placeholder that echoes enough context to feel real during dev
  return `[AI response placeholder] — This persona would respond to the topic based on their unique perspective. In production, this will be replaced with a real AI completion. The system prompt guides the tone and the user prompt provides the debate context.`;
}

function inferIndustry(topic: string): string {
  const keywords: Record<string, string> = {
    fintech: "fintech",
    finance: "finance",
    health: "healthcare",
    medical: "healthcare",
    education: "edtech",
    food: "food & beverage",
    retail: "retail",
    ecommerce: "e-commerce",
    "e-commerce": "e-commerce",
    saas: "SaaS",
    ai: "artificial intelligence",
    crypto: "crypto/web3",
    gaming: "gaming",
    sports: "sports",
    "real estate": "real estate",
    logistics: "logistics",
    travel: "travel",
  };
  const lower = topic.toLowerCase();
  for (const [key, industry] of Object.entries(keywords)) {
    if (lower.includes(key)) return industry;
  }
  return "technology";
}

function buildRound1Prompt(topic: string): string {
  return `Topic/Idea: "${topic}"

You are on a debate stage with other startup experts. This is Round 1. Give a concise 2–4 sentence reaction to this idea, in your own voice. Be specific and direct.`;
}

function buildRoundNPrompt(
  topic: string,
  roundNumber: number,
  previousRound: Round,
  allPersonas: Persona[]
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

This is Round ${roundNumber}. Respond briefly (2–4 sentences) to the idea and to 1–2 key points made by the others in the last round. Refer to them by role (e.g., "the angel investor", "the skeptic"). Be direct and specific.`;
}

function enrichSystemPrompt(persona: Persona, topic: string): string {
  const industry = inferIndustry(topic);
  return persona.systemPrompt.replace(
    /\[(?:auto-detect industry from idea|insert industry from idea)\]/gi,
    industry
  );
}

export async function generateRound1(
  topic: string,
  personas: Persona[],
  onPersonaComplete: (personaId: string, text: string) => void
): Promise<RoundMessage[]> {
  const userPrompt = buildRound1Prompt(topic);
  const messages: RoundMessage[] = [];

  // Generate in parallel
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
  onPersonaComplete: (personaId: string, text: string) => void
): Promise<RoundMessage[]> {
  const messages: RoundMessage[] = [];

  await Promise.all(
    personas.map(async (persona) => {
      const system = enrichSystemPrompt(persona, topic);
      const userPrompt = buildRoundNPrompt(
        topic,
        roundNumber,
        previousRound,
        personas
      );
      const text = await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);
      onPersonaComplete(persona.id, text);
    })
  );

  return messages;
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

Summarize the main arguments in 2 short paragraphs, then give a final lean: "lean yes", "lean no", or "need more data", with 1–2 reasons. Be concise and actionable.`;

  return callCompletion(systemPrompt, userPrompt);
}
