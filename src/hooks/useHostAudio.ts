import { useState, useCallback, useRef } from "react";
import { Persona, Round } from "@/types/debate";

interface HostClip {
  roundNumber: number;
  audioUrl: string;
  script: string;
  isLoading: boolean;
}

function buildRoundScript(
  roundNumber: number,
  personas: Persona[],
  round: Round,
  userResponse?: string
): string {
  const summaries = round.messages.map((m) => {
    const p = personas.find((p) => p.id === m.personaId);
    const role = p?.subtitle ?? "Expert";
    const snippet = m.text.slice(0, 80).replace(/\n/g, " ");
    return `${role} says: "${snippet}..."`;
  });

  const userPart = userResponse
    ? ` The founder responded: "${userResponse.slice(0, 60)}...".`
    : "";

  return `Round ${roundNumber} recap: ${summaries.join(". ")}.${userPart} What's your take?`;
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
      const script = buildRoundScript(roundNumber, personas, round, userResponse);

      abortControllers.current[roundNumber]?.abort();
      const controller = new AbortController();
      abortControllers.current[roundNumber] = controller;

      setClips((prev) => ({
        ...prev,
        [roundNumber]: { roundNumber, audioUrl: "", script, isLoading: true },
      }));
      setIsGenerating(true);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
