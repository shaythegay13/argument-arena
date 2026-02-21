import { useState, useCallback } from "react";
import { Persona, Round } from "@/types/debate";

const MOCK_VIDEO_URL = "https://example.com/host-avatar.mp4";

const TAVUS_EDGE_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tavus-clip`;

interface TavusClip {
  roundNumber: number;
  clipUrl: string;
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

export function useTavusClips() {
  const [clips, setClips] = useState<Record<number, TavusClip>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const generateClip = useCallback(
    async (
      roundNumber: number,
      personas: Persona[],
      round: Round,
      userResponse?: string
    ) => {
      const script = buildRoundScript(roundNumber, personas, round, userResponse);

      setClips((prev) => ({
        ...prev,
        [roundNumber]: { roundNumber, clipUrl: "", script, isLoading: true },
      }));
      setIsGenerating(true);

      try {
        const res = await fetch(TAVUS_EDGE_FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            script,
            voice_id: "professional-mentor",
            avatar_id: "charismatic-host",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const clipUrl = data.clip_url || data.video_url || MOCK_VIDEO_URL;
          setClips((prev) => ({
            ...prev,
            [roundNumber]: { roundNumber, clipUrl, script, isLoading: false },
          }));
          setIsGenerating(false);
          console.log(`[Tavus] Clip generated for round ${roundNumber}:`, clipUrl);
          return;
        }
        console.warn("[Tavus] API call failed, using mock video");

        // Fallback to mock
        await new Promise((r) => setTimeout(r, 1500));
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, clipUrl: MOCK_VIDEO_URL, script, isLoading: false },
        }));
        console.log(`[Tavus] Mock clip for round ${roundNumber}`);
      } catch (err) {
        console.warn("[Tavus] Error, falling back to mock:", err);
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, clipUrl: MOCK_VIDEO_URL, script, isLoading: false },
        }));
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { clips, isGenerating, generateClip };
}
