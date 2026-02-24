import { useState, useEffect, useCallback, useRef } from "react";

export interface PersonaMemory {
  text: string;
  timestamp?: string;
}

export type PersonaMemories = Record<string, PersonaMemory[]>;

const REDIS_URL = "http://localhost:8080";

const MOCK_MEMORIES: PersonaMemories = {
  angel: [{ text: "User pitched sports betting psych app last month" }],
  vc: [{ text: "User's fintech LTV:CAC was 1.8x previously" }],
  customer: [{ text: "User building React Native apps" }],
  operator: [{ text: "User worried about early hiring" }],
  skeptic: [{ text: "User's urban ag TAM seemed optimistic" }],
  quant: [{ text: "User's growth assumptions were 40% YoY" }],
  insider: [{ text: "User navigating fintech regulations" }],
  visionary: [{ text: "User's 5-year vision involves AI platforms" }],
};

const ALL_PERSONA_IDS = [
  "angel", "vc", "customer", "operator",
  "skeptic", "quant", "insider", "visionary",
];

export function useRedisMemory() {
  const sessionId = useRef(`hackathon-${crypto.randomUUID()}`);
  const [memories, setMemories] = useState<PersonaMemories>({});
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [isStoringMemory, setIsStoringMemory] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  // Fetch memories for all personas on mount
  useEffect(() => {
    async function fetchAll() {
      setIsLoadingMemories(true);
      try {
        const results: PersonaMemories = {};
        const fetches = ALL_PERSONA_IDS.map(async (persona) => {
          const res = await fetch(`${REDIS_URL}/memories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionId.current, persona }),
          });
          if (!res.ok) throw new Error("Redis unavailable");
          const data = await res.json();
          results[persona] = Array.isArray(data) ? data : [];
        });
        await Promise.all(fetches);
        setMemories(results);
        console.log("[RedisMemory] Fetched live memories", results);
      } catch {
        console.log("[RedisMemory] Redis unavailable, using mock memories");
        setMemories(MOCK_MEMORIES);
        setUsingMock(true);
      } finally {
        setIsLoadingMemories(false);
      }
    }
    fetchAll();
  }, []);

  // Store a memory for a specific persona after a round
  const storeMemory = useCallback(
    async (personaId: string, text: string) => {
      // Always update local state
      setMemories((prev) => ({
        ...prev,
        [personaId]: [...(prev[personaId] ?? []), { text, timestamp: new Date().toISOString() }],
      }));

      if (usingMock) {
        console.log(`[RedisMemory] Mock store for ${personaId}:`, text);
        return;
      }

      setIsStoringMemory(true);
      try {
        await fetch(`${REDIS_URL}/memories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionId.current,
            persona: personaId,
            text,
          }),
        });
        console.log(`[RedisMemory] Stored for ${personaId}:`, text);
      } catch {
        console.log(`[RedisMemory] Failed to store for ${personaId}, kept in local state`);
      } finally {
        setIsStoringMemory(false);
      }
    },
    [usingMock]
  );

  // Store memories for all active personas after a round
  const storeRoundMemories = useCallback(
    async (
      activePersonaIds: string[],
      topic: string,
      roundNumber: number,
      userFollowUp: string,
      personaResponses: Record<string, string>
    ) => {
      await Promise.all(
        activePersonaIds.map((pid) => {
          const myResponse = personaResponses[pid] ?? "";
          // Each entry is one round only — no topic repetition.
          // Founder response and juror take are each capped at 300 chars so
          // 3 accumulated entries stay well under the 5000-char systemPrompt limit.
          const founderSnippet = userFollowUp.slice(0, 300);
          const mySnippet = myResponse.slice(0, 300);
          const memText = `Round ${roundNumber} | Founder: "${founderSnippet}" | My take: "${mySnippet}"`;
          return storeMemory(pid, memText);
        })
      );
    },
    [storeMemory]
  );

  // Get recent memories for a persona (last 3)
  const getRecentMemories = useCallback(
    (personaId: string): string => {
      const mems = memories[personaId]?.slice(-3);
      if (!mems || mems.length === 0) return "No prior memory";
      return mems.map((m) => m.text).join("\n\n");
    },
    [memories]
  );

  return {
    memories,
    isLoadingMemories,
    isStoringMemory,
    storeMemory,
    storeRoundMemories,
    getRecentMemories,
    sessionId: sessionId.current,
    usingMock,
  };
}
