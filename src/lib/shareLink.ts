import { supabase } from "@/integrations/supabase/client";

/** Canonical public host — permalinks must work for people outside the preview. */
const PUBLIC_SITE_URL = "https://www.startupjuryai.com";

function siteOrigin(): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  // Local dev keeps localhost so links are testable; everything else uses the public domain.
  if (host === "localhost" || host === "127.0.0.1") return window.location.origin;
  return PUBLIC_SITE_URL;
}

/** The stable transcript URL for a session — same string on every platform. */
export function permalinkFor(sessionId?: string | null): string {
  if (!sessionId) return siteOrigin();
  return `${siteOrigin()}/result/${sessionId}`;
}

/**
 * Flips the session to public (so the permalink opens for anyone) and returns it.
 * Safe to call repeatedly — the update is idempotent.
 */
export async function ensurePermalink(sessionId?: string | null): Promise<string> {
  const url = permalinkFor(sessionId);
  if (!sessionId) return url;
  try {
    await supabase
      .from("debate_sessions")
      .update({ is_public: true } as never)
      .eq("id", sessionId);
  } catch {
    // Visibility may already be public, or the row may belong to a view-only viewer.
  }
  return url;
}
