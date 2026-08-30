import { supabase } from "@/integrations/supabase/client";
import type { Persona } from "@/types/debate";

/**
 * A founder-authored bio for one judge. Stored per user so the same juror can
 * carry a real background (fund, track record, voice) into every debate.
 */
export interface PanelistProfile {
  persona_id: string;
  display_name: string | null;
  title: string | null;
  bio: string | null;
  background: string | null;
  signature_style: string | null;
}

export const PANELIST_FIELD_LIMITS = {
  display_name: 60,
  title: 80,
  bio: 600,
  background: 800,
  signature_style: 300,
} as const;

export type PanelistProfileMap = Record<string, PanelistProfile>;

function clean(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function fetchPanelistProfiles(userId: string): Promise<PanelistProfileMap> {
  const { data, error } = await supabase
    .from("panelist_profiles")
    .select("persona_id, display_name, title, bio, background, signature_style")
    .eq("user_id", userId);

  if (error) {
    console.warn("[panelistProfiles] load failed:", error.message);
    return {};
  }

  const map: PanelistProfileMap = {};
  for (const row of (data ?? []) as PanelistProfile[]) {
    map[row.persona_id] = row;
  }
  return map;
}

export async function savePanelistProfile(
  userId: string,
  profile: PanelistProfile
): Promise<void> {
  const payload = {
    user_id: userId,
    persona_id: profile.persona_id,
    display_name: clean(profile.display_name, PANELIST_FIELD_LIMITS.display_name),
    title: clean(profile.title, PANELIST_FIELD_LIMITS.title),
    bio: clean(profile.bio, PANELIST_FIELD_LIMITS.bio),
    background: clean(profile.background, PANELIST_FIELD_LIMITS.background),
    signature_style: clean(profile.signature_style, PANELIST_FIELD_LIMITS.signature_style),
  };

  const { error } = await supabase
    .from("panelist_profiles")
    .upsert(payload, { onConflict: "user_id,persona_id" });
  if (error) throw new Error(error.message);
}

export async function deletePanelistProfile(userId: string, personaId: string): Promise<void> {
  const { error } = await supabase
    .from("panelist_profiles")
    .delete()
    .eq("user_id", userId)
    .eq("persona_id", personaId);
  if (error) throw new Error(error.message);
}

export function isProfileFilled(profile?: PanelistProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.display_name || profile.title || profile.bio || profile.background || profile.signature_style
  );
}

/**
 * Folds a founder-authored bio into a persona: the judge keeps its scoring
 * weights but speaks from the real background provided, which is what makes
 * closing statements read like a specific person rather than a generic model.
 */
export function applyPanelistProfile(persona: Persona, profile?: PanelistProfile | null): Persona {
  if (!isProfileFilled(profile) || !profile) return persona;

  const name = profile.display_name?.trim() || persona.name;
  const title = profile.title?.trim() || persona.subtitle;

  const lines: string[] = [
    `IDENTITY OVERRIDE — you are ${name}, ${title}. Use this identity for the whole debate, including your closing statement.`,
  ];
  if (profile.bio) lines.push(`WHO YOU ARE: ${profile.bio.trim()}`);
  if (profile.background) lines.push(`TRACK RECORD AND EXPERIENCE: ${profile.background.trim()}`);
  if (profile.signature_style) lines.push(`HOW YOU TALK: ${profile.signature_style.trim()}`);
  lines.push(
    "Ground every claim in the specifics above: name the deals, companies, numbers and hard-won lessons from your own history instead of generic startup advice. Never mention being an AI, a model, or a persona."
  );

  return {
    ...persona,
    name,
    subtitle: title,
    systemPrompt: `${persona.systemPrompt}\n\n${lines.join("\n")}`,
  };
}

export function applyPanelistProfiles(
  personas: Persona[],
  profiles: PanelistProfileMap
): Persona[] {
  return personas.map((p) => applyPanelistProfile(p, profiles[p.id]));
}
