import { supabase } from "@/integrations/supabase/client";

export interface DebateRequestBody {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  sessionId?: string;
  stream?: boolean;
  mode?: "utility";
}

/** Same-origin jury endpoint (SSR server route) — replaces the old function URL. */
export const DEBATE_ENDPOINT = "/api/debate-ai";

/**
 * POSTs to the jury endpoint with the signed-in user's bearer token.
 * Returns the raw Response so callers can either read JSON or stream SSE.
 */
export async function postDebateRequest(
  body: DebateRequestBody,
  init?: { signal?: AbortSignal },
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error("Unauthorized");

  return fetch(DEBATE_ENDPOINT, {
    method: "POST",
    signal: init?.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

/** Convenience JSON call: resolves to { content } or { error }. */
export async function callDebateJson(
  body: DebateRequestBody,
): Promise<{ content?: string; error?: string; status: number }> {
  const res = await postDebateRequest(body);
  let parsed: { content?: string; error?: string } = {};
  try {
    parsed = (await res.json()) as { content?: string; error?: string };
  } catch {
    parsed = { error: "Unexpected server response" };
  }
  return { ...parsed, status: res.status };
}
