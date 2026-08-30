import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TAVUS_BASE = "https://tavusapi.com/v2";
const MAX_SCRIPT_LENGTH = 3000;

/**
 * Requests a single-use realtime token for ElevenLabs Scribe (speech-to-text).
 */
export const getElevenLabsScribeToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const ELEVENLABS_API_KEY = process.env["ELEVENLABS_API_KEY"];
    if (!ELEVENLABS_API_KEY) {
      throw new Error("Server configuration error");
    }

    const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Scribe] Token error [${response.status}]:`, err);
      throw new Error("Failed to get scribe token");
    }

    const { token: scribeToken } = await response.json();
    return { token: scribeToken as string };
  });

interface TavusPollResult {
  conversation_id: string;
  status: string;
  conversation_url: string | null;
}

/**
 * Polls a Tavus conversation's status by id.
 */
export const getTavusConversationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => ({
    conversationId: String(input?.conversationId ?? ""),
  }))
  .handler(async ({ data }): Promise<TavusPollResult> => {
    const TAVUS_API_KEY = process.env["TAVUS_API_KEY"];
    if (!TAVUS_API_KEY) {
      throw new Error("Server configuration error");
    }

    const { conversationId } = data;
    if (!/^[a-zA-Z0-9_-]+$/.test(conversationId)) {
      throw new Error("Invalid conversation_id");
    }

    const res = await fetch(`${TAVUS_BASE}/conversations/${conversationId}`, {
      headers: { "x-api-key": TAVUS_API_KEY },
    });
    const result = await res.json();
    if (!res.ok) {
      console.error(`[Tavus] Poll error [${res.status}]:`, JSON.stringify(result));
      throw new Error("Failed to check conversation status");
    }

    return {
      conversation_id: result.conversation_id,
      status: result.status,
      conversation_url: result.conversation_url || null,
    };
  });

interface TavusPersonaResult {
  persona_id: string;
}

/**
 * Creates a Tavus persona configured to deliver the given debate recap script.
 */
export const createTavusPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { script?: string }) => ({
    script: input?.script,
  }))
  .handler(async ({ data }): Promise<TavusPersonaResult> => {
    const TAVUS_API_KEY = process.env["TAVUS_API_KEY"];
    if (!TAVUS_API_KEY) {
      throw new Error("Server configuration error");
    }

    const { script } = data;
    if (script !== undefined && (typeof script !== "string" || script.length > MAX_SCRIPT_LENGTH)) {
      throw new Error(`Invalid or too long script (max ${MAX_SCRIPT_LENGTH} chars)`);
    }

    const res = await fetch(`${TAVUS_BASE}/personas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TAVUS_API_KEY,
      },
      body: JSON.stringify({
        persona_name: `debate-host-${Date.now()}`,
        system_prompt: `You are the host of a startup debate panel called "Startup Jury". You deliver concise round recaps summarizing what the expert panelists said. Be energetic, professional, and brief. Speak directly to the founder/viewer. Here is the recap you should deliver:\n\n${script}`,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error(`[Tavus] Create persona error [${res.status}]:`, JSON.stringify(result));
      throw new Error("Failed to create persona");
    }

    console.log(`[Tavus] Persona created: ${result.persona_id}`);
    return { persona_id: result.persona_id };
  });

interface TavusConversationResult {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

/**
 * Creates a Tavus conversation (video clip) for a debate round recap script.
 */
export const createTavusConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { script?: string; persona_id?: string }) => ({
    script: input?.script,
    persona_id: input?.persona_id,
  }))
  .handler(async ({ data }): Promise<TavusConversationResult> => {
    const TAVUS_API_KEY = process.env["TAVUS_API_KEY"];
    if (!TAVUS_API_KEY) {
      throw new Error("Server configuration error");
    }

    const { script, persona_id } = data;
    if (script !== undefined && (typeof script !== "string" || script.length > MAX_SCRIPT_LENGTH)) {
      throw new Error(`Invalid or too long script (max ${MAX_SCRIPT_LENGTH} chars)`);
    }

    const replica_id = process.env["TAVUS_REPLICA_ID"];
    if (!replica_id) {
      throw new Error("Server configuration error");
    }

    const conversationBody: Record<string, unknown> = {
      replica_id,
      conversation_name: `debate-recap-${Date.now()}`,
      conversational_context: script,
      properties: {
        max_call_duration: 120,
      },
    };

    if (persona_id) {
      conversationBody.persona_id = persona_id;
    }

    console.log(`[Tavus] Creating conversation with replica_id=${replica_id}`);

    const res = await fetch(`${TAVUS_BASE}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TAVUS_API_KEY,
      },
      body: JSON.stringify(conversationBody),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error(`[Tavus] Create conversation error [${res.status}]:`, JSON.stringify(result));
      throw new Error("Failed to create conversation");
    }

    console.log(`[Tavus] Conversation created: ${result.conversation_id}`);

    return {
      conversation_id: result.conversation_id,
      conversation_url: result.conversation_url,
      status: result.status,
    };
  });
