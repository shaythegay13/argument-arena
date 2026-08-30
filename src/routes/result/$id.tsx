import { createFileRoute } from "@tanstack/react-router";
import ResultPage from "@/pages/ResultPage";
import { getPublicSessionMeta } from "@/lib/publicSession.functions";

const SITE = "https://www.startupjuryai.com";
const OG_IMAGE = `${SITE}/og-verdict.png`;

export const Route = createFileRoute("/result/$id")({
  loader: async ({ params }) => {
    const meta = await getPublicSessionMeta({ data: { id: params.id } });
    return { meta, url: `${SITE}/result/${params.id}` };
  },
  head: ({ loaderData }) => {
    const meta = loaderData?.meta;
    const url = loaderData?.url ?? SITE;
    const score = meta?.score ?? null;
    const startupName = meta?.startupName ?? "Startup Idea";
    const verdict = meta?.verdict ?? "Pending";

    const title = meta?.found
      ? `${verdict} — ${startupName} scored ${score ?? "—"}/100 | Startup Jury AI`
      : "Jury Verdict | Startup Jury AI";
    const description = meta?.found
      ? (score
          ? `An AI panel of ${meta.ratingsCount} investor personas debated this idea and returned ${verdict} at ${score}/100. ${meta.topic}`
          : meta.topic || "An AI investor panel debated this startup idea on Startup Jury AI.")
          .slice(0, 300)
      : "See how an AI panel of investor personas judged this startup idea on Startup Jury AI.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:site_name", content: "Startup Jury AI" },
        { property: "og:locale", content: "en_US" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:secure_url", content: OG_IMAGE },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Startup Jury AI verdict card" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@startupjuryai" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
        { name: "twitter:image:alt", content: "Startup Jury AI verdict card" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: meta?.found
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Review",
                url,
                name: `${verdict} verdict for ${startupName}`,
                reviewBody: meta.topic,
                datePublished: meta.createdAt ?? undefined,
                author: { "@type": "Organization", name: "Startup Jury AI", url: SITE },
                itemReviewed: { "@type": "Thing", name: startupName },
                ...(score
                  ? {
                      reviewRating: {
                        "@type": "Rating",
                        ratingValue: score,
                        bestRating: 100,
                        worstRating: 0,
                      },
                    }
                  : {}),
              }),
            },
          ]
        : [],
    };
  },
  component: ResultPage,
});
