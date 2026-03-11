import { supabase } from "@/integrations/supabase/client";

type EventName =
  | "debate_started"
  | "debate_completed"
  | "verdict_viewed"
  | "result_shared"
  | "pdf_downloaded"
  | "idea_validated"
  | "verdict_card_downloaded"
  | "verdict_card_shared";

/** Allowed metadata keys – only non-sensitive, application-level data. */
const ALLOWED_METADATA_KEYS = new Set([
  "personaCount",
  "verdict",
  "score",
  "sessionId",
  "roundCount",
]);

/**
 * Strips any keys not on the allowlist and rejects non-primitive values
 * to prevent accidental storage of sensitive data (IPs, tokens, PII).
 */
function sanitizeMetadata(
  raw: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      clean[key] = value as string | number | boolean | null;
    }
  }
  return clean;
}

export async function trackEvent(
  eventName: EventName,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: eventName,
      metadata: sanitizeMetadata(metadata),
    } as any);
  } catch (err) {
    // Analytics should never block the UI
    console.warn("[analytics]", err);
  }
}
