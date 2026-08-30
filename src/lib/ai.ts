import { supabase } from "@/integrations/supabase/client";
import { postDebateRequest } from "@/lib/debateEndpoint";
import { Persona, Round, RoundMessage, PersonaRating } from "@/types/debate";

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1500;

export const OUT_OF_CREDITS = "OUT_OF_CREDITS";
export const MISSING_SESSION = "MISSING_SESSION";
export const CANCELLED = "GENERATION_CANCELLED";

export function isCancelledError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes(CANCELLED) || (err instanceof DOMException && err.name === "AbortError");
}

// ---- Cancellation -----------------------------------------------------------
// Every in-flight streaming request registers its controller here so a round
// can be stopped without touching responses that already succeeded.
const _activeControllers = new Set<AbortController>();
let _cancelRequested = false;

/** Aborts every in-flight juror/judge generation. Already-finished responses are untouched. */
export function cancelActiveGenerations() {
  _cancelRequested = true;
  _activeControllers.forEach((c) => {
    try { c.abort(); } catch { /* ignore */ }
  });
  _activeControllers.clear();
}

/** Clears the cancel flag before starting a new round. */
export function resetCancellation() {
  _cancelRequested = false;
  _activeControllers.clear();
}

export function isCancellationRequested() {
  return _cancelRequested;
}

export const MISSING_SESSION_MESSAGE =
  "We couldn't start a jury session record, so nothing was sent to the panel (and no credit was used). Please refresh and try again.";

export function isMissingSessionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes(MISSING_SESSION);
}

export function isOutOfCreditsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes(OUT_OF_CREDITS) || msg.toLowerCase().includes("evaluation credits");
}

// Module-level session ID for current debate
let _currentSessionId: string | undefined;

export function setCurrentSessionId(id: string | undefined) {
  _currentSessionId = id;
}

export function getCurrentSessionId(): string | undefined {
  return _currentSessionId;
}


async function callCompletion(
  systemPrompt: string,
  userPrompt: string,
  model?: string
): Promise<string> {
  // Client-side guard: never call the edge function without a session id —
  // billing is keyed on it, so a missing id can only produce a 400.
  if (!_currentSessionId || !String(_currentSessionId).trim()) {
    console.error("[callCompletion] Blocked: missing sessionId");
    throw new Error(MISSING_SESSION);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await postDebateRequest({
        systemPrompt,
        userPrompt,
        ...(model && { model }),
        sessionId: _currentSessionId,
      });
      let data: { content?: string; error?: string } = {};
      let bodyTextRaw = "";
      try {
        bodyTextRaw = await res.text();
        data = bodyTextRaw ? JSON.parse(bodyTextRaw) : {};
      } catch {
        data = { error: "Unexpected server response" };
      }
      const error = res.ok ? null : { message: data.error || `AI call failed (${res.status})` };


      if (error) {
        const msg = error.message || "AI call failed";

        // The response body tells us about hard refusals (credits, session).
        const bodyText = bodyTextRaw;

        if (/MISSING_SESSION/.test(bodyText) || /MISSING_SESSION/.test(msg)) {
          console.error("[callCompletion] Server rejected request: missing sessionId", bodyText);
          throw new Error(MISSING_SESSION);
        }

        if (/evaluation credits/i.test(bodyText) || /evaluation credits/i.test(msg)) {
          throw new Error(OUT_OF_CREDITS);
        }

        // Retry on rate-limit or transient errors
        if (attempt < MAX_RETRIES && (msg.includes("429") || msg.includes("Rate limit") || msg.includes("temporarily"))) {
          console.warn(`[callCompletion] Attempt ${attempt + 1} rate-limited, retrying in ${RETRY_BASE_MS * (attempt + 1)}ms`);
          await delay(RETRY_BASE_MS * (attempt + 1));
          continue;
        }
        console.error("Edge function error:", error);
        throw new Error(msg);
      }

      if (data?.error) {
        if (/MISSING_SESSION/.test(String(data.error))) {
          throw new Error(MISSING_SESSION);
        }
        if (/evaluation credits/i.test(data.error)) {
          throw new Error(OUT_OF_CREDITS);
        }
        if (attempt < MAX_RETRIES && (data.error.includes("Rate limit") || data.error.includes("temporarily"))) {
          console.warn(`[callCompletion] Attempt ${attempt + 1} transient error, retrying...`);
          await delay(RETRY_BASE_MS * (attempt + 1));
          continue;
        }
        throw new Error(data.error);
      }

      return data?.content ?? "No response generated.";
    } catch (err) {
      if (isOutOfCreditsError(err) || isMissingSessionError(err)) throw err;
      if (attempt >= MAX_RETRIES) throw err;
      console.warn(`[callCompletion] Attempt ${attempt + 1} failed, retrying...`, err);
      await delay(RETRY_BASE_MS * (attempt + 1));
    }

  }
  throw new Error("AI call failed after retries");
}


/**
 * Streaming completion — relays the edge function's SSE stream so a juror's
 * response appears progressively. Falls back to the buffered call if streaming
 * is unavailable, so a round never fails just because SSE couldn't be used.
 */
async function callCompletionStreaming(
  systemPrompt: string,
  userPrompt: string,
  onDelta: (chunk: string, full: string) => void,
  model?: string
): Promise<string> {
  if (!_currentSessionId || !String(_currentSessionId).trim()) {
    console.error("[callCompletionStreaming] Blocked: missing sessionId");
    throw new Error(MISSING_SESSION);
  }


  const controller = new AbortController();
  _activeControllers.add(controller);
  if (_cancelRequested) {
    _activeControllers.delete(controller);
    throw new Error(CANCELLED);
  }

  let res: Response;
  try {
    res = await postDebateRequest(
      {
        systemPrompt,
        userPrompt,
        ...(model && { model }),
        sessionId: _currentSessionId,
        stream: true,
      },
      { signal: controller.signal },
    );
  } catch (networkErr) {
    _activeControllers.delete(controller);
    if (isCancelledError(networkErr) || _cancelRequested) throw new Error(CANCELLED);
    console.warn("[callCompletionStreaming] network error, falling back:", networkErr);
    return callCompletion(systemPrompt, userPrompt, model);
  }

  if (!res.ok || !res.body) {
    const bodyText = await res.text().catch(() => "");
    if (/MISSING_SESSION/.test(bodyText)) throw new Error(MISSING_SESSION);
    if (/evaluation credits/i.test(bodyText)) throw new Error(OUT_OF_CREDITS);
    console.warn("[callCompletionStreaming] stream unavailable, falling back:", res.status, bodyText.slice(0, 200));
    return callCompletion(systemPrompt, userPrompt, model);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let full = "";

  try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    let nlIndex: number;
    while ((nlIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nlIndex).trim();
      buffer = buffer.slice(nlIndex + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta: string =
          parsed.choices?.[0]?.delta?.content ??
          parsed.choices?.[0]?.message?.content ??
          "";
        if (delta) {
          full += delta;
          onDelta(delta, full);
        }
      } catch {
        /* partial JSON line — ignore */
      }
    }
  }

  } catch (streamErr) {
    if (isCancelledError(streamErr) || _cancelRequested) throw new Error(CANCELLED);
    throw streamErr;
  } finally {
    _activeControllers.delete(controller);
  }

  if (!full.trim()) {
    if (_cancelRequested) throw new Error(CANCELLED);
    // Nothing streamed back; the backend refunds, so retry through the buffered path.
    return callCompletion(systemPrompt, userPrompt, model);
  }

  return full;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function getWordLimit(_roundNumber: number): number {
  return 500;
}

function buildRound1Prompt(topic: string): string {
  return `Topic/Idea: "${topic}"

You are on a live startup jury panel with other expert judges. This is Round 1 — Initial Reactions. Give your first impression of this idea in your own voice. Be specific and direct.

IMPORTANT: End with 1-2 pointed questions for the founder.

Keep your response under 500 words.`;
}

// Max chars per previous message in system context.
// Budget: 5000 - ~500 (persona) - ~1600 (3 memory entries) - ~100 (headers) = 2800 → 2800/8 = 350. Use 280 for safety.
const MAX_CTX_CHARS = 280;

function truncateForContext(text: string): string {
  return text.length > MAX_CTX_CHARS ? text.slice(0, MAX_CTX_CHARS) + "…" : text;
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
      return `${p?.name ?? "Expert"} (${p?.subtitle ?? "Expert"}): "${truncateForContext(m.text)}"`;
    })
    .join("\n\n");

  const memoryBlock = personaMemory
    ? `\nMEMORY (your past notes):\n${personaMemory.slice(0, 1200)}\n`
    : "";

  const isFinalRound = roundNumber >= 4;

  const roundLabel = roundNumber === 2
    ? "Round 2 — Risk & Challenge Debate"
    : roundNumber === 3
    ? "Round 3 — Post-Founder Defense"
    : isFinalRound
    ? "Round 4 — Final Statements"
    : `Round ${roundNumber}`;

  const crossRefRule = `
CRITICAL DEBATE RULES:
- You MUST reference at least 1-2 other judges BY NAME (e.g. "Marcus raises a fair point about TAM, but…" or "I disagree with Victor here because…")
- Challenge weak reasoning from other judges when you see it
- If another judge convinces you, acknowledge it: "Elena changed my mind on…"
- Cite specific claims made by others, not vague references
- Disagree when your evaluation framework conflicts with another judge's conclusion`;

  const systemContext = `${memoryBlock}
Previous round statements from your fellow judges:
${prevMessages}
${crossRefRule}`;

  const founderCtx = userResponse.length > 3000 ? userResponse.slice(0, 3000) + "…" : userResponse;

  const userPrompt = `Topic/Idea: "${topic}"

The founder responded: "${founderCtx}"

This is ${roundLabel}. Respond to the idea, the founder's response, and to 1–2 key points made by the other judges in the last round. Refer to them BY NAME (e.g., "Marcus," "Priya," "Victor"). Be direct and specific. Push back on weak reasoning. End with 1-2 new questions for the founder.

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
  // Keep memory concise to stay under the 5000-char field limit
  const memoryBlock = personaMemory
    ? `\nYour past notes: ${personaMemory.slice(0, 300)}\n`
    : "";
  // Only include this persona's own statements per round (not all 8 panelists)
  // to keep userPrompt well under the 5000-char edge function limit.
  const roundsText = allRounds
    .map((round) => {
      const myMsg = round.messages.find((m) => m.personaId === persona.id);
      const snippet = myMsg ? myMsg.text.slice(0, 300) : "(no response)";
      return `Round ${round.roundNumber}: "${snippet}"`;
    })
    .join("\n");

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

The founder's latest response: "${userResponse.length > 2000 ? userResponse.slice(0, 2000) + "…" : userResponse}"

YOUR SCORING CRITERIA:
${weightsBlock}${inverseNote}

This is the FINAL round. Give your verdict on this business idea (up to 500 words) based on your criteria above, then score it.

You MUST end your response with exactly this format on a new line:
SCORE: [0-10]/10 | [one-sentence verdict]. METRICS: ${metricsFormat}

EXAMPLE: SCORE: 8/10 | Founder-market fit is strong with clear unfair advantage. METRICS: ${persona.scoringWeights.map((w) => `${w.label}=8`).join(", ")}`;
}

/** Run persona calls in staggered batches to avoid rate limiting */
async function runStaggered<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  batchSize = 4,
  delayMs = 800
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    if (_cancelRequested) break;
    const batch = items.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(fn));
    if (i + batchSize < items.length) await delay(delayMs);
  }
}

export async function generateRound1(
  topic: string,
  personas: Persona[],
  onPersonaComplete: (personaId: string, text: string) => void,
  onPersonaFailed?: (personaId: string, err: unknown) => void,
  onPersonaDelta?: (personaId: string, partial: string) => void
): Promise<RoundMessage[]> {
  const userPrompt = buildRound1Prompt(topic);
  const messages: RoundMessage[] = [];
  const shuffled = shuffleArray(personas);

  await runStaggered(shuffled, async (persona) => {
    const system = enrichSystemPrompt(persona, topic);
    try {
      const text = onPersonaDelta
        ? await callCompletionStreaming(system, userPrompt, (_chunk, full) =>
            onPersonaDelta(persona.id, full)
          )
        : await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);
      onPersonaComplete(persona.id, text);
    } catch (err) {
      if (isCancelledError(err)) {
        // Stopped by the user — leave the slot empty so it can be retried later.
        onPersonaFailed?.(persona.id, err);
        return;
      }
      console.error(`[Round 1] ${persona.id} failed:`, err);
      const fallback = "I wasn't able to weigh in this round — please continue.";
      messages.push({ personaId: persona.id, text: fallback });
      onPersonaComplete(persona.id, fallback);
      onPersonaFailed?.(persona.id, err);
    }
  });

  return messages;
}

export async function generateNextRound(
  topic: string,
  roundNumber: number,
  personas: Persona[],
  previousRound: Round,
  userResponse: string,
  onPersonaComplete: (personaId: string, text: string) => void,
  getMemory?: (personaId: string) => string,
  onPersonaFailed?: (personaId: string, err: unknown) => void,
  contextPersonas?: Persona[],
  onPersonaDelta?: (personaId: string, partial: string) => void
): Promise<RoundMessage[]> {
  const messages: RoundMessage[] = [];
  const shuffled = shuffleArray(personas);
  const panel = contextPersonas ?? personas;

  await runStaggered(shuffled, async (persona) => {
    const memory = getMemory?.(persona.id);
    const { systemContext, userPrompt } = buildRoundNPrompt(topic, roundNumber, previousRound, panel, userResponse, memory);
    const system = enrichSystemPrompt(persona, topic) + "\n\n" + systemContext;
    try {
      const text = onPersonaDelta
        ? await callCompletionStreaming(system, userPrompt, (_chunk, full) =>
            onPersonaDelta(persona.id, full)
          )
        : await callCompletion(system, userPrompt);
      const msg: RoundMessage = { personaId: persona.id, text };
      messages.push(msg);
      onPersonaComplete(persona.id, text);
    } catch (err) {
      if (isCancelledError(err)) {
        onPersonaFailed?.(persona.id, err);
        return;
      }
      console.error(`[Round ${roundNumber}] ${persona.id} failed:`, err);
      const fallback = "I wasn't able to weigh in this round — please continue.";
      messages.push({ personaId: persona.id, text: fallback });
      onPersonaComplete(persona.id, fallback);
      onPersonaFailed?.(persona.id, err);
    }
  });

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

  await Promise.allSettled(
    personas.map(async (persona) => {
      const system =
        enrichSystemPrompt(persona, topic) +
        "\n\nIMPORTANT: You MUST end your response with exactly: SCORE: [0-10]/10 | [one-sentence verdict]. METRICS: " +
        persona.scoringWeights.map((w) => `${w.label}=[0-10]`).join(", ");
      const memory = getMemory?.(persona.id);
      const userPrompt = buildFinalRatingPrompt(topic, allRounds, personas, userResponse, persona, memory);
      try {
        const text = await callCompletion(system, userPrompt);
        messages.push({ personaId: persona.id, text });
        ratings.push(parseRatingFromText(text, persona));
        onPersonaComplete(persona.id, text);
      } catch (err) {
        console.error(`[FinalRating] ${persona.id} failed:`, err);
        const fallback = "Unable to provide a final rating.";
        messages.push({ personaId: persona.id, text: fallback });
        ratings.push(parseRatingFromText(fallback, persona));
        onPersonaComplete(persona.id, fallback);
      }
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

  await Promise.allSettled(
    personas.map(async (persona) => {
      const system =
        enrichSystemPrompt(persona, topic) +
        "\n\nIMPORTANT: You MUST end your response with exactly: SCORE: [0-10]/10 | [one-sentence verdict]. METRICS: " +
        persona.scoringWeights.map((w) => `${w.label}=[0-10]`).join(", ");
      const memory = getMemory?.(persona.id);
      const userPrompt = buildFinalRatingPrompt(topic, allRounds, personas, lastUserResponse, persona, memory);
      try {
        const text = await callCompletion(system, userPrompt);
        const rating = parseRatingFromText(text, persona);
        ratings.push(rating);
        onRatingComplete(persona.id, rating);
      } catch (err) {
        console.error(`[RatingsOnly] ${persona.id} failed:`, err);
        const rating = parseRatingFromText("", persona);
        ratings.push(rating);
        onRatingComplete(persona.id, rating);
      }
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
      let rawScore = Math.min(10, Math.max(0, parseInt(match[1] ?? "")));
      if (persona.inverseScore) rawScore = 10 - rawScore;

      const verdictText = (match[2] ?? "").trim().replace(/\.\s*$/, "");
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
  let fallbackScore = anyScoreMatch ? Math.min(10, Math.max(0, parseInt(anyScoreMatch[1] ?? ""))) : 5;
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
  ratings: PersonaRating[],
  onDelta?: (partial: string) => void
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

PERCENTILE CALCULATION: Based on the overall score, estimate what percentile this startup would fall in among typical startups pitched to investors. Score 9+ → 95th+, 8-9 → 80-95, 7-8 → 60-80, 6-7 → 40-60, 5-6 → 20-40, below 5 → below 20.

You MUST respond in EXACTLY this JSON format (no markdown, no code fences):
{"verdict":"GO","overallScore":${overallScore},"why":"One crisp sentence explaining the verdict","strengths":["Pattern 1","Pattern 2","Pattern 3"],"risks":["Risk 1","Risk 2"],"nextStep":"One concrete action the founder should take now","topPraise":"The single most compelling praise from any judge","skepticKillShot":"The sharpest, most devastating one-line critique from the skeptic judge","percentile":75}

"verdict" must be exactly one of: "GO", "MAYBE", "NO-GO"
"strengths" must be an array of exactly 3 strings
"risks" must be an array of exactly 2 strings
"topPraise" must be a single compelling sentence of praise
"skepticKillShot" must be a sharp, memorable one-liner critique
"percentile" must be a number 0-99`;

  // Truncate each message to 80 chars so 4 rounds × 8 personas fits in userPrompt under 5000 chars.
  const roundsText = rounds
    .map((round) => {
      const msgs = round.messages
        .map((m) => {
          const p = personas.find((p) => p.id === m.personaId);
          const snippet = m.text.length > 80 ? m.text.slice(0, 80) + "…" : m.text;
          return `  ${p?.name ?? "Expert"} (${p?.subtitle ?? "Expert"}): "${snippet}"`;
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

  const raw = onDelta
    ? await callCompletionStreaming(systemPrompt, userPrompt, (_chunk, full) =>
        onDelta(full)
      )
    : await callCompletion(systemPrompt, userPrompt);

  // Parse JSON from response
  let parsed: {
    verdict?: string;
    overallScore?: number;
    why?: string;
    strengths?: string[];
    risks?: string[];
    nextStep?: string;
    topPraise?: string;
    skepticKillShot?: string;
    percentile?: number;
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
    topPraise: parsed.topPraise ?? strengths[0] ?? "Shows genuine market understanding.",
    skepticKillShot: parsed.skepticKillShot ?? risks[0] ?? "Execution risk remains the elephant in the room.",
    percentile: parsed.percentile ?? Math.min(99, Math.max(1, Math.round(overallScore * 10))),
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


/**
 * Best-effort reader for the judge's partially streamed JSON so the UI can show
 * the summary forming instead of raw braces.
 */
export function extractPartialJudge(partial: string): {
  verdict?: string | undefined;
  overallScore?: string | undefined;
  why?: string | undefined;
  strengths: string[];
  risks: string[];
  nextStep?: string | undefined;
} {
  const str = (key: string) => {
    const m = partial.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)`));
    return m?.[1]?.trim() || undefined;
  };
  const num = (key: string) => {
    const m = partial.match(new RegExp(`"${key}"\\s*:\\s*([0-9.]+)`));
    return m?.[1];
  };
  const arr = (key: string) => {
    const m = partial.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)`));
    if (!m) return [];
    return ((m[1] ?? "").match(/"([^"]*)"/g) ?? [])
      .map((s) => s.replace(/"/g, "").trim())
      .filter(Boolean);
  };
  return {
    verdict: str("verdict"),
    overallScore: num("overallScore"),
    why: str("why"),
    strengths: arr("strengths"),
    risks: arr("risks"),
    nextStep: str("nextStep"),
  };
}
