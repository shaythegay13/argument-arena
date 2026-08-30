import { useState, useCallback, useRef } from "react";
import { Persona, Round } from "@/types/debate";

const MOCK_CONVERSATION_URL = "";
const TAVUS_EDGE_FN_URL = `https://${import.meta.env['VITE_SUPABASE_PROJECT_ID']}.supabase.co/functions/v1/tavus-clip`;

interface TavusClip {
  roundNumber: number;
  conversationUrl: string;
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
  const abortControllers = useRef<Record<number, AbortController>>({});

  const generateClip = useCallback(
    async (
      roundNumber: number,
      personas: Persona[],
      round: Round,
      userResponse?: string
    ) => {
      const script = buildRoundScript(roundNumber, personas, round, userResponse);

      // Cancel any existing request for this round
      abortControllers.current[roundNumber]?.abort();
      const controller = new AbortController();
      abortControllers.current[roundNumber] = controller;

      setClips((prev) => ({
        ...prev,
        [roundNumber]: { roundNumber, conversationUrl: "", script, isLoading: true },
      }));
      setIsGenerating(true);

      const setReady = (url: string) => {
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, conversationUrl: url, script, isLoading: false },
        }));
        setIsGenerating(false);
        console.log(`[Tavus] Conversation ready for round ${roundNumber}:`, url);
      };

      const setMock = () => {
        setClips((prev) => ({
          ...prev,
          [roundNumber]: { roundNumber, conversationUrl: MOCK_CONVERSATION_URL, script, isLoading: false },
        }));
        setIsGenerating(false);
        console.log(`[Tavus] Fallback to mock for round ${roundNumber}`);
      };

      try {
        const apikey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

        // Create conversation directly
        const res = await fetch(TAVUS_EDGE_FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey,
          },
          body: JSON.stringify({ script }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.conversation_url) {
            console.log(`[Tavus] Conversation created: ${data.conversation_id}`);
            setReady(data.conversation_url);
            return;
          }
        }
        const errData = await res.json().catch(() => ({}));
        console.warn("[Tavus] Create conversation failed:", res.status, errData);
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
