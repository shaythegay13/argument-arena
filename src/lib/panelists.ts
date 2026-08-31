import { supabase } from "@/integrations/supabase/client";
import type { Persona } from "@/types/debate";
import { PERSONA_MAP, PERSONAS } from "@/data/personas";

/**
 * A real panelist the founder maintains in their own roster: an actual person
 * with a headshot, credentials and track record. Each one is anchored to a jury
 * archetype so the scoring rubric and column colors stay consistent, while the
 * identity, voice and experience come from this record.
 */
export interface Panelist {
  id: string;
  name: string;
  title: string | null;
  firm: string | null;
  credentials: string | null;
  bio: string | null;
  background: string | null;
  signature_style: string | null;
  expertise: string[];
  photo_url: string | null;
  linkedin_url: string | null;
  base_persona_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PanelistDraft = Omit<Panelist, "id" | "created_at" | "updated_at"> & { id?: string };

export const PANELIST_LIMITS = {
  name: 80,
  title: 100,
  firm: 100,
  credentials: 300,
  bio: 700,
  background: 1000,
  signature_style: 300,
  linkedin_url: 300,
} as const;

export const PHOTO_BUCKET = "panelist-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const SELECT_COLUMNS =
  "id, name, title, firm, credentials, bio, background, signature_style, expertise, photo_url, linkedin_url, base_persona_id, is_active, created_at, updated_at";

function clip(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function emptyPanelist(): PanelistDraft {
  return {
    name: "",
    title: null,
    firm: null,
    credentials: null,
    bio: null,
    background: null,
    signature_style: null,
    expertise: [],
    photo_url: null,
    linkedin_url: null,
    base_persona_id: PERSONAS[0]?.id ?? "vc",
    is_active: true,
  };
}

export async function fetchPanelists(userId: string): Promise<Panelist[]> {
  const { data, error } = await supabase
    .from("panelists")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Panelist[]).map((row) => ({
    ...row,
    expertise: row.expertise ?? [],
  }));
}

export async function savePanelist(userId: string, draft: PanelistDraft): Promise<Panelist> {
  const name = clip(draft.name, PANELIST_LIMITS.name);
  if (!name) throw new Error("A panelist needs a name.");

  const payload = {
    user_id: userId,
    name,
    title: clip(draft.title, PANELIST_LIMITS.title),
    firm: clip(draft.firm, PANELIST_LIMITS.firm),
    credentials: clip(draft.credentials, PANELIST_LIMITS.credentials),
    bio: clip(draft.bio, PANELIST_LIMITS.bio),
    background: clip(draft.background, PANELIST_LIMITS.background),
    signature_style: clip(draft.signature_style, PANELIST_LIMITS.signature_style),
    expertise: (draft.expertise ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 12),
    photo_url: draft.photo_url ?? null,
    linkedin_url: clip(draft.linkedin_url, PANELIST_LIMITS.linkedin_url),
    base_persona_id: PERSONA_MAP[draft.base_persona_id] ? draft.base_persona_id : PERSONAS[0]!.id,
    is_active: draft.is_active ?? true,
  };

  const query = draft.id
    ? supabase.from("panelists").update(payload).eq("id", draft.id).eq("user_id", userId).select(SELECT_COLUMNS).single()
    : supabase.from("panelists").insert(payload).select(SELECT_COLUMNS).single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const row = data as unknown as Panelist;
  return { ...row, expertise: row.expertise ?? [] };
}

export async function deletePanelist(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("panelists").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Uploads a headshot into the caller's own folder and returns its storage path. */
export async function uploadPanelistPhoto(userId: string, file: File): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo must be under 5MB.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext || "jpg"}`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Photos live in a private bucket, so display URLs are signed on demand. */
export async function resolvePhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  // Bundled library headshots and any absolute URL are already displayable.
  if (path.startsWith("http") || path.startsWith("/") || path.startsWith("data:")) return path;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) {
    console.warn("[panelists] photo url failed:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function resolvePhotoUrls(paths: (string | null)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const entries = await Promise.all(
    unique.map(async (p) => [p, await resolvePhotoUrl(p)] as const)
  );
  const map: Record<string, string> = {};
  for (const [p, url] of entries) if (url) map[p] = url;
  return map;
}

export function panelistHeadline(p: Panelist): string {
  return [p.title, p.firm].filter(Boolean).join(" · ") || PERSONA_MAP[p.base_persona_id]?.subtitle || "Panelist";
}

/**
 * Turns a roster record into a debate-ready persona: the archetype supplies the
 * scoring weights and column identity, the roster record supplies the real
 * person speaking.
 */
export function panelistToPersona(panelist: Panelist, photoUrl?: string | null): Persona {
  const base = PERSONA_MAP[panelist.base_persona_id] ?? PERSONAS[0]!;
  const title = panelistHeadline(panelist);

  const lines: string[] = [
    `IDENTITY OVERRIDE — you are ${panelist.name}, ${title}. Hold this identity for the entire debate, including your closing statement.`,
  ];
  if (panelist.credentials) lines.push(`CREDENTIALS: ${panelist.credentials}`);
  if (panelist.bio) lines.push(`WHO YOU ARE: ${panelist.bio}`);
  if (panelist.background) lines.push(`TRACK RECORD AND EXPERIENCE: ${panelist.background}`);
  if (panelist.expertise.length) lines.push(`AREAS OF EXPERTISE: ${panelist.expertise.join(", ")}`);
  if (panelist.signature_style) lines.push(`HOW YOU TALK: ${panelist.signature_style}`);
  lines.push(
    "Ground every judgement in the specifics above — name the deals, companies, numbers and hard lessons from your own history rather than generic startup advice. Never mention being an AI, a model, or a persona."
  );

  return {
    ...base,
    id: `panelist:${panelist.id}`,
    name: panelist.name,
    subtitle: title,
    photoUrl: photoUrl ?? null,
    vibe: panelist.expertise.slice(0, 3).join(" · ") || base.vibe,
    systemPrompt: `${base.systemPrompt}\n\n${lines.join("\n")}`,
  };
}

/**
 * Seats a batch of curated library panelists onto the caller's roster, skipping
 * any name they already have so re-importing never creates duplicates.
 */
export async function importLibraryPanelists(
  userId: string,
  drafts: PanelistDraft[]
): Promise<Panelist[]> {
  const existing = await fetchPanelists(userId);
  const taken = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const pending = drafts.filter((d) => !taken.has((d.name ?? "").trim().toLowerCase()));
  const created: Panelist[] = [];
  for (const draft of pending) {
    const { id: _ignored, ...fresh } = draft;
    created.push(await savePanelist(userId, fresh));
  }
  return created;
}
