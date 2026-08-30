import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Server-rendered HTML for a debate result, built for link-preview crawlers.
 *
 * Crawlers (LinkedIn, Slack, Facebook, X, Discord, WhatsApp, Telegram…) do not
 * execute JavaScript, so the static SPA head at /result/<id> is useless to them.
 * This function renders the real per-session <head> on the server.
 *
 * Usage: /functions/v1/og-result/<session_id>   (or ?id=<session_id>)
 *
 * Real browsers are redirected (302) to https://www.startupjuryai.com/result/<id>
 * so a shared link still lands humans on the interactive transcript.
 */

const SITE = "https://www.startupjuryai.com";
const OG_IMAGE = `${SITE}/og-verdict.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** User agents that must receive HTML meta tags instead of a redirect. */
const CRAWLER_RE =
  /(facebookexternalhit|facebookcatalog|linkedinbot|slackbot|slack-imgproxy|twitterbot|discordbot|whatsapp|telegrambot|skypeuripreview|pinterest|redditbot|embedly|quora link preview|nuzzel|vkshare|outbrain|applebot|bingbot|googlebot|google-inspectiontool|yandex|baiduspider|duckduckbot|mastodon|iframely|bufferbot|snapchat|tumblr|flipboard|opengraph|metainspector|preview|bot|crawler|spider)/i;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sessionIdFrom(url: URL): string | null {
  const fromQuery = url.searchParams.get("id");
  if (fromQuery) return fromQuery.trim();
  // Path style: /functions/v1/og-result/<id>
  const segments = url.pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("og-result");
  const tail = idx >= 0 ? segments[idx + 1] : segments[segments.length - 1];
  return tail && tail !== "og-result" ? tail.trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sessionId = sessionIdFrom(url);
  const ua = req.headers.get("user-agent") ?? "";
  const isCrawler = CRAWLER_RE.test(ua);

  if (!sessionId) {
    return new Response("Missing id parameter", { status: 400, headers: corsHeaders });
  }

  const target = `${SITE}/result/${sessionId}`;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data, error } = await supabaseClient
    .from("debate_sessions")
    .select("topic, judge_verdict, startup_name, ratings, created_at")
    .eq("id", sessionId)
    .eq("is_public", true)
    .maybeSingle();

  // Humans always go to the app, even when the session is private or missing.
  if (!isCrawler) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: target, "Cache-Control": "no-store" },
    });
  }

  if (error || !data) {
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }

  const verdict = (data.judge_verdict ?? {}) as Record<string, any>;
  const verdictLabel = verdict?.verdict ?? "Pending";
  const rawScore = typeof verdict?.overallScore === "number" ? verdict.overallScore : null;
  const score = rawScore != null ? Math.round(rawScore * 10) : null;
  const startupName = (data.startup_name as string) || "Startup Idea";
  const topic = ((data.topic as string) || "").replace(/\s+/g, " ").trim();
  const truncatedTopic = topic.length > 150 ? `${topic.slice(0, 147)}...` : topic;
  const ratingsCount = Array.isArray(data.ratings) ? (data.ratings as unknown[]).length : 8;

  const titleText = `${verdictLabel} — ${startupName} scored ${score ?? "—"}/100 | Startup Jury AI`;
  const descriptionText = score
    ? `An AI panel of ${ratingsCount} investor personas debated this idea and returned ${verdictLabel} at ${score}/100. ${truncatedTopic}`
    : truncatedTopic || "An AI investor panel debated this startup idea on Startup Jury AI.";

  const title = escapeHtml(titleText);
  const description = escapeHtml(descriptionText.slice(0, 300));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${target}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${target}" />
  <meta property="og:site_name" content="Startup Jury AI" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:secure_url" content="${OG_IMAGE}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Startup Jury AI verdict card" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@startupjuryai" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <meta name="twitter:image:alt" content="Startup Jury AI verdict card" />

  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Review",
    url: target,
    name: `${verdictLabel} verdict for ${startupName}`,
    reviewBody: truncatedTopic,
    datePublished: data.created_at ?? undefined,
    author: { "@type": "Organization", name: "Startup Jury AI", url: SITE },
    itemReviewed: { "@type": "Thing", name: startupName },
    ...(score
      ? { reviewRating: { "@type": "Rating", ratingValue: score, bestRating: 100, worstRating: 0 } }
      : {}),
  })}
  </script>
</head>
<body>
  <main>
    <h1>${escapeHtml(startupName)} — ${escapeHtml(String(verdictLabel))}${score ? ` (${score}/100)` : ""}</h1>
    <p>${escapeHtml(truncatedTopic)}</p>
    <p>Judged by ${ratingsCount} AI investor personas on Startup Jury AI.</p>
    <p><a href="${target}">Read the full jury transcript</a></p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
});
