import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Returns an HTML page with OG meta tags for social media crawlers.
 * Social platforms (Twitter, LinkedIn) fetch this URL and read the meta tags
 * to generate rich link previews.
 *
 * Usage: /functions/v1/og-result?id=<session_id>
 *
 * The frontend should reference this in a <meta> tag or use it as the
 * canonical share URL for crawler-friendly previews.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("id");

  if (!sessionId) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data, error } = await supabaseClient
    .from("debate_sessions")
    .select("topic, judge_verdict, startup_name, ratings")
    .eq("id", sessionId)
    .eq("is_public", true)
    .single();

  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  const verdict = data.judge_verdict as any;
  const verdictLabel = verdict?.verdict ?? "Pending";
  const score = verdict?.overallScore ? verdict.overallScore * 10 : null;
  const startupName = data.startup_name || "Startup Idea";
  const topic = (data.topic as string) || "";
  const truncatedTopic = topic.length > 155 ? topic.slice(0, 152) + "..." : topic;

  const title = `${verdictLabel} Verdict — ${escapeHtml(startupName)} | Startup Jury AI`;
  const description = score
    ? `Score: ${score}/100. ${escapeHtml(truncatedTopic)}`
    : escapeHtml(truncatedTopic);

  const siteUrl = `https://startupjury.lovable.app/result/${sessionId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${siteUrl}" />
  <meta property="og:site_name" content="Startup Jury AI" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <!-- Redirect browsers to the real page -->
  <meta http-equiv="refresh" content="0;url=${siteUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${siteUrl}">Startup Jury AI</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
