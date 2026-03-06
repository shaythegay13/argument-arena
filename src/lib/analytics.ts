import { supabase } from "@/integrations/supabase/client";

type EventName =
  | "debate_started"
  | "debate_completed"
  | "verdict_viewed"
  | "result_shared"
  | "pdf_downloaded"
  | "idea_validated";

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
      metadata,
    } as any);
  } catch (err) {
    // Analytics should never block the UI
    console.warn("[analytics]", err);
  }
}
