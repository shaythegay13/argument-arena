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

  const siteUrl = `https://www.startupjuryai.com/result/${sessionId}`;
  const imageUrl = "https://www.startupjuryai.com/og-verdict.png";
  const ratingsCount = Array.isArray(data.ratings) ? (data.ratings as unknown[]).length : 8;

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

  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Startup Jury AI verdict card" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta name="twitter:image:alt" content="Startup Jury AI verdict card" />

  <link rel="canonical" href="${siteUrl}" />
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Review",
    url: siteUrl,
    name: `${verdictLabel} verdict for ${startupName}`,
    reviewBody: truncatedTopic,
    author: { "@type": "Organization", name: "Startup Jury AI" },
    itemReviewed: { "@type": "Thing", name: startupName },
    ...(score
      ? { reviewRating: { "@type": "Rating", ratingValue: score, bestRating: 100, worstRating: 0 } }
      : {}),
    ...(ratingsCount ? { positiveNotes: `${ratingsCount} AI jurors` } : {}),
  })}
  </script>

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
