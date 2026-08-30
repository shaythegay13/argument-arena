import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface PublicSessionMeta {
  found: boolean;
  startupName: string;
  topic: string;
  verdict: string;
  score: number | null;
  ratingsCount: number;
  createdAt: string | null;
}

/**
 * Public, read-only session metadata used to server-render the /result/<id>
 * head. Link-preview crawlers (LinkedIn, Slack, Facebook, X) never run JS, so
 * these tags must exist in the first HTML response.
 */
export const getPublicSessionMeta = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "").trim() }))
  .handler(async ({ data }): Promise<PublicSessionMeta> => {
    const empty: PublicSessionMeta = {
      found: false,
      startupName: "Startup Idea",
      topic: "",
      verdict: "Pending",
      score: null,
      ratingsCount: 8,
      createdAt: null,
    };

    if (!data.id) return empty;

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return empty;

    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: row, error } = await supabase
      .from("debate_sessions")
      .select("topic, judge_verdict, startup_name, ratings, created_at")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();

    if (error || !row) return empty;

    const verdictObj = (row.judge_verdict ?? {}) as Record<string, unknown>;
    const rawScore = verdictObj["overallScore"];
    // Strip markdown so social previews read as plain prose.
    const topic = String(row.topic ?? "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/(\*\*|__|\*|_|`|>)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      found: true,
      startupName: row.startup_name || "Startup Idea",
      topic: topic.length > 180 ? `${topic.slice(0, 177)}...` : topic,
      verdict: typeof verdictObj["verdict"] === "string" ? (verdictObj["verdict"] as string) : "Pending",
      score: typeof rawScore === "number" ? Math.round(rawScore * 10) : null,
      ratingsCount: Array.isArray(row.ratings) ? (row.ratings as unknown[]).length : 8,
      createdAt: row.created_at ?? null,
    };
  });
