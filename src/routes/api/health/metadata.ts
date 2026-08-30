import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Internal metadata healthcheck.
 *
 * GET /api/health/metadata?session=<id>
 *
 * Fetches /result/<session> as each common social crawler (no JS execution)
 * and asserts the server-rendered HTML carries the expected Open Graph and
 * Twitter Card tags, plus an og:image that actually returns 200.
 *
 * Requires a signed-in caller — it is a diagnostic, not a public endpoint.
 */

const CRAWLERS: Record<string, string> = {
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  linkedin: "LinkedInBot/1.0 (compatible; Mozilla/5.0; +https://www.linkedin.com)",
  slack: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  twitter: "Twitterbot/1.0",
  discord: "Discordbot/2.0",
  whatsapp: "WhatsApp/2.23",
};

const REQUIRED_META: Array<{ key: string; kind: "property" | "name" }> = [
  { key: "og:title", kind: "property" },
  { key: "og:description", kind: "property" },
  { key: "og:type", kind: "property" },
  { key: "og:url", kind: "property" },
  { key: "og:image", kind: "property" },
  { key: "twitter:card", kind: "name" },
  { key: "twitter:title", kind: "name" },
  { key: "twitter:description", kind: "name" },
  { key: "twitter:image", kind: "name" },
];

interface CrawlerReport {
  crawler: string;
  status: number;
  ok: boolean;
  title: string | null;
  canonical: string | null;
  tags: Record<string, string | null>;
  missing: string[];
  problems: string[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function readMeta(html: string, key: string, kind: "property" | "name"): string | null {
  const escaped = key.replace(/[:]/g, "\\:");
  const patterns = [
    new RegExp(`<meta[^>]+${kind}=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${kind}=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = re.exec(html);
    if (match?.[1]) return match[1];
  }
  return null;
}

function looksUnrendered(value: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  return v.length === 0 || /undefined|null|\{\{|%s|lovable generated project|lovable app/i.test(v);
}

export const Route = createFileRoute("/api/health/metadata")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
        const token = authHeader.slice("Bearer ".length);

        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!supabaseUrl || !publishableKey) return json({ error: "Server not configured" }, 500);

        const authClient = createClient(supabaseUrl, publishableKey, {
          auth: { persistSession: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (
                publishableKey.startsWith("sb_") &&
                headers.get("Authorization") === `Bearer ${publishableKey}`
              ) {
                headers.delete("Authorization");
              }
              headers.set("apikey", publishableKey);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const { data: userData, error: userError } = await authClient.auth.getUser(token);
        if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

        const url = new URL(request.url);
        const sessionId = (url.searchParams.get("session") ?? "").trim();
        if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
          return json(
            {
              error: "INVALID_SESSION",
              message: "Pass ?session=<session uuid> to check that result page's metadata.",
            },
            422,
          );
        }

        const origin = url.origin;
        const target = `${origin}/result/${sessionId}`;
        const reports: CrawlerReport[] = [];
        const imageChecks: Record<string, number> = {};

        for (const [crawler, ua] of Object.entries(CRAWLERS)) {
          const problems: string[] = [];
          let status = 0;
          let html = "";
          try {
            const res = await fetch(target, {
              headers: { "User-Agent": ua, Accept: "text/html" },
              redirect: "follow",
            });
            status = res.status;
            html = await res.text();
          } catch (e) {
            problems.push(`fetch failed: ${e instanceof Error ? e.message : "unknown error"}`);
          }

          if (status !== 200) problems.push(`expected HTTP 200, got ${status}`);

          const tags: Record<string, string | null> = {};
          const missing: string[] = [];
          for (const { key, kind } of REQUIRED_META) {
            const value = readMeta(html, key, kind);
            tags[key] = value;
            if (looksUnrendered(value)) missing.push(key);
          }

          const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
          const title = titleMatch?.[1]?.trim() ?? null;
          if (looksUnrendered(title)) problems.push("missing or placeholder <title>");

          const canonical =
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html)?.[1] ?? null;
          if (!canonical) problems.push("missing canonical link");
          else if (!canonical.includes(sessionId)) problems.push("canonical does not self-reference this result");

          const ogUrl = tags["og:url"];
          if (ogUrl && !ogUrl.includes(sessionId)) problems.push("og:url does not self-reference this result");

          // og:image must be absolute and actually resolvable.
          const image = tags["og:image"];
          if (image) {
            if (!/^https?:\/\//i.test(image)) {
              problems.push("og:image is not an absolute URL");
            } else if (imageChecks[image] === undefined) {
              try {
                const probe = new URL(image);
                // Probe locally when the tag points at this deployment's own host.
                const probeUrl = `${origin}${probe.pathname}${probe.search}`;
                const imgRes = await fetch(probeUrl, { headers: { "User-Agent": CRAWLERS["facebook"]! } });
                imageChecks[image] = imgRes.status;
              } catch {
                imageChecks[image] = 0;
              }
            }
            const imgStatus = imageChecks[image] ?? 0;
            if (imgStatus !== 200) problems.push(`og:image did not return 200 (got ${imgStatus})`);
          }

          if (missing.length) problems.push(`missing tags: ${missing.join(", ")}`);

          reports.push({
            crawler,
            status,
            ok: problems.length === 0,
            title,
            canonical,
            tags,
            missing,
            problems,
          });
        }

        const healthy = reports.every((r) => r.ok);
        return json(
          {
            healthy,
            checkedAt: new Date().toISOString(),
            target,
            sessionId,
            imageStatuses: imageChecks,
            crawlers: reports,
          },
          healthy ? 200 : 503,
        );
      },
    },
  },
});
