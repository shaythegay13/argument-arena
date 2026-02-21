import { useState, useCallback, useRef } from "react";
import { Persona, Round } from "@/types/debate";

const MOCK_VIDEO_URL = "https://example.com/host-avatar.mp4";
const TAVUS_EDGE_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tavus-clip`;
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60; // 5 min max

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

async function pollForVideo(
  videoId: string,
  onReady: (url: string) => void,
  onFail: () => void,
  signal?: AbortSignal
) {
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (signal?.aborted) return;

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    if (signal?.aborted) return;

    try {
      const res = await fetch(`${TAVUS_EDGE_FN_URL}?video_id=${videoId}`, {
        method: "GET",
        headers: { apikey },
      });
      if (!res.ok) continue;

      const data = await res.json();
      console.log(`[Tavus] Poll ${i + 1}: status=${data.status}`);

      if (data.status === "ready") {
        const url = data.hosted_url || data.stream_url || data.download_url;
        if (url) { onReady(url); return; }
      }
      if (data.status === "error" || data.status === "deleted") {
        console.warn("[Tavus] Video generation failed:", data.status);
        onFail();
        return;
      }
      // still queued/generating → continue polling
    } catch {
      // network blip, keep trying
    }
  }
  console.warn("[Tavus] Polling timed out");
  onFail();
}

export function useTavusClips() {
  const [clips, setClips] = useState<Record<number, TavusClip>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllers = useRef<Record<number, AbortController>>({});

  const generateClip = useCallback(
    async (
      roundNumber: number,
      personas: Persona[],
      round: Round,
      userResponse?: string,
      replicaId?: string
    ) => {
      const script = buildRoundScript(roundNumber, personas, round, userResponse);

      // Cancel any existing poll for this round
      abortControllers.current[roundNumber]?.abort();
      const controller = new AbortController();
      abortControllers.current[roundNumber] = controller;

      setClips((prev) => ({
        ...prev,
        [roundNumber]: { roundNumber, clipUrl: "", script, isLoading: true },
      }));
      setIsGenerating(true);

      const setReady = (url: string) => {
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, clipUrl: url, script, isLoading: false },
        }));
        setIsGenerating(false);
        console.log(`[Tavus] Clip ready for round ${roundNumber}:`, url);
      };

      const setMock = () => {
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, clipUrl: MOCK_VIDEO_URL, script, isLoading: false },
        }));
        setIsGenerating(false);
        console.log(`[Tavus] Fallback to mock for round ${roundNumber}`);
      };

      try {
        const res = await fetch(TAVUS_EDGE_FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ script, replica_id: replicaId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.video_id) {
            console.log(`[Tavus] Video queued: ${data.video_id}, polling…`);
            // Don't await — poll in background
            pollForVideo(data.video_id, setReady, setMock, controller.signal);
            return;
          }
        }
        console.warn("[Tavus] Create failed, using mock");
        setMock();
      } catch (err) {
        console.warn("[Tavus] Error, falling back to mock:", err);
        setMock();
      }
    },
    []
  );

  return { clips, isGenerating, generateClip };
}
