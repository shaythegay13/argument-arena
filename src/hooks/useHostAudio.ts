import { useState, useCallback, useRef } from "react";
import { Persona, Round } from "@/types/debate";
import { supabase } from "@/integrations/supabase/client";

interface HostClip {
  roundNumber: number;
  audioUrl: string;
  script: string;
  isLoading: boolean;
}

async function buildRoundScript(
  roundNumber: number,
  personas: Persona[],
  round: Round,
  userResponse?: string
): Promise<string> {
  // Build full context for AI summarization
  const panelResponses = round.messages.map((m) => {
    const p = personas.find((p) => p.id === m.personaId);
    const name = p?.name ?? "Panelist";
    const role = p?.subtitle ?? "Expert";
    return `${name} (${role}):\n${m.text}`;
  }).join("\n\n---\n\n");

  const userPart = userResponse
    ? `\n\nThe founder responded:\n"${userResponse}"`
    : "";

  const systemPrompt = `You are the host of "Startup Jury AI", a fast-paced startup debate panel. Your job is to deliver a spoken recap of round ${roundNumber}.

Rules:
- ALWAYS refer to each panelist BY NAME when summarizing their position (e.g. "Riley warns that…", "Jordan is bullish because…", "Morgan points out…")
- Lead with the most interesting clash or surprise from the round — name both sides
- Summarize each panelist's core take in one punchy sentence, attributed by name
- Then highlight where they agreed and where they sharply disagreed — always naming names
- Mention any concrete scores or ratings panelists gave
- Close by listing specific questions the panelists raised for the founder, attributed by name
- Keep it under 200 words — this will be read aloud
- Be energetic, professional, and direct
- Speak in second person to the founder ("Your idea…", "The panel thinks…")
- Do NOT use markdown, bullet points, or special formatting — write it as natural speech

Panelist responses from Round ${roundNumber}:
${panelResponses}${userPart}`;

  const userPrompt = `Deliver your spoken host recap summary for Round ${roundNumber} now.`;

  try {
    const { data, error } = await supabase.functions.invoke("debate-ai", {
      body: { systemPrompt, userPrompt },
    });
    if (error || data?.error) throw new Error(error?.message || data?.error);
    return data?.content ?? fallbackScript(roundNumber, personas, round, userResponse);
  } catch (err) {
    console.warn("[HostAudio] AI summary failed, using fallback:", err);
    return fallbackScript(roundNumber, personas, round, userResponse);
  }
}

function fallbackScript(
  roundNumber: number,
  personas: Persona[],
  round: Round,
  userResponse?: string
): string {
  const count = round.messages.length;
  const userPart = userResponse ? ` The founder responded with their perspective.` : "";
  return `Round ${roundNumber} recap: The panel of ${count} experts has weighed in on this startup idea.${userPart} Let's see what happens next.`;
}

export function useHostAudio() {
  const [clips, setClips] = useState<Record<number, HostClip>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllers = useRef<Record<number, AbortController>>({});

  const generateClip = useCallback(
    async (
      roundNumber: number,
      personas: Persona[],
      round: Round,
      userResponse?: string
    ) => {
      abortControllers.current[roundNumber]?.abort();
      const controller = new AbortController();
      abortControllers.current[roundNumber] = controller;

      setClips((prev) => ({
        ...prev,
        [roundNumber]: { roundNumber, audioUrl: "", script: "Generating summary…", isLoading: true },
      }));
      setIsGenerating(true);

      const script = await buildRoundScript(roundNumber, personas, round, userResponse);

      // Update script text now that we have it
      setClips((prev) => ({
        ...prev,
        [roundNumber]: { ...prev[roundNumber], script },
      }));

      try {
        // Get the user's session token for authenticated requests
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ text: script }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`TTS failed: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, audioUrl, script, isLoading: false },
        }));
        setIsGenerating(false);
        console.log(`[HostAudio] Audio ready for round ${roundNumber}`);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.warn("[HostAudio] Error generating audio:", err);
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, audioUrl: "", script, isLoading: false },
        }));
        setIsGenerating(false);
      }
    },
    []
  );

  return { clips, isGenerating, generateClip };
}
