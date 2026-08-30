import { useState, useCallback, useRef } from "react";
import { Persona, Round } from "@/types/debate";
import { createTavusConversation } from "@/lib/media.functions";

const MOCK_CONVERSATION_URL = "";

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
        // Create conversation directly
        const data = await createTavusConversation({ data: { script } });
        if (data.conversation_url) {
          console.log(`[Tavus] Conversation created: ${data.conversation_id}`);
          setReady(data.conversation_url);
          return;
        }
        console.warn("[Tavus] Create conversation failed: no conversation_url");
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
