import { useEffect } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AIDisclosureModal from "@/components/AIDisclosureModal";
import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/02b05940-e151-4c48-9390-9caa4bc93915/id-preview-c0a32cf7--12b116d7-2839-4e3a-8247-9ddcd61fea2e.lovable.app-1771714317368.png";

// Ported verbatim from the old index.html <head>.
const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://startupjuryai.com/#webapp",
      name: "Startup Jury AI",
      url: "https://startupjuryai.com",
      description:
        "8 AI expert personas — investors, operators, and skeptics — debate your startup idea across 4 rounds and deliver a scored GO/MAYBE/NO-GO verdict in under 5 minutes.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires JavaScript",
      inLanguage: "en",
      featureList: [
        "8 AI expert personas",
        "4-round debate format",
        "Weighted scoring by criteria",
        "GO/MAYBE/NO-GO verdict",
        "Session history",
        "Shareable results",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Free Plan",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "2 free startup idea evaluations",
        },
        {
          "@type": "Offer",
          name: "Unlimited Plan",
          price: "8.99",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "Unlimited startup idea evaluations",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "8.99",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "2400",
        bestRating: "5",
        worstRating: "1",
      },
      publisher: { "@id": "https://startupjuryai.com/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://startupjuryai.com/#organization",
      name: "Startup Jury AI",
      url: "https://startupjuryai.com",
      logo: {
        "@type": "ImageObject",
        url: "https://startupjuryai.com/assets/logo.png",
        width: 307,
        height: 305,
      },
      description:
        "AI-powered startup idea validation platform using 8 expert personas to deliver GO/MAYBE/NO-GO verdicts in under 5 minutes.",
      foundingDate: "2026",
      email: "info@startupjuryai.com",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "info@startupjuryai.com",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://startupjuryai.com/#website",
      name: "Startup Jury AI",
      url: "https://startupjuryai.com",
      description: "Validate your startup idea with 8 AI expert judges in under 5 minutes",
      inLanguage: "en",
      publisher: { "@id": "https://startupjuryai.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://startupjuryai.com/?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
});

const reviewsData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Startup Jury AI User Reviews",
  itemListElement: [
    {
      "@type": "Review",
      position: 1,
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5", worstRating: "1" },
      author: { "@type": "Person", name: "Sarah K.", jobTitle: "Solo Founder" },
      reviewBody:
        "Got more useful feedback in 5 minutes than from 3 weeks of coffee chats with investors.",
      itemReviewed: {
        "@type": "WebApplication",
        name: "Startup Jury AI",
        url: "https://startupjuryai.com",
      },
    },
    {
      "@type": "Review",
      position: 2,
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5", worstRating: "1" },
      author: { "@type": "Person", name: "Marcus T.", jobTitle: "Serial Entrepreneur" },
      reviewBody:
        "The skeptic persona found a fatal flaw I'd been blind to. Saved me months of wasted effort.",
      itemReviewed: {
        "@type": "WebApplication",
        name: "Startup Jury AI",
        url: "https://startupjuryai.com",
      },
    },
    {
      "@type": "Review",
      position: 3,
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5", worstRating: "1" },
      author: { "@type": "Person", name: "Priya R.", jobTitle: "Head of Product" },
      reviewBody: "We use it before every board meeting to pressure-test new initiatives.",
      itemReviewed: {
        "@type": "WebApplication",
        name: "Startup Jury AI",
        url: "https://startupjuryai.com",
      },
    },
  ],
});

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Startup Jury AI — Validate Your Idea with AI Judges" },
      { name: "google-site-verification", content: "dctHNLeNZhsItL3yw40v_aodJm5lGOs25zA0eRrBPLk" },
      {
        name: "description",
        content:
          "8 AI personas debate your startup idea across 4 rounds and deliver a GO/NO-GO verdict in minutes. Validate before you build.",
      },
      { name: "author", content: "Startup Jury AI" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Startup Jury AI" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Startup Jury AI" },
      { property: "og:url", content: "https://startupjuryai.com/" },
      {
        property: "og:title",
        content: "Startup Jury AI - Validate Your Startup Idea with AI Judges",
      },
      {
        property: "og:description",
        content:
          "8 AI expert personas debate your startup idea across 4 rounds and deliver a GO/NO-GO verdict in minutes. Free to try — no pitch deck needed.",
      },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Startup Jury AI - Validate Your Startup Idea with AI Judges",
      },
      {
        name: "twitter:description",
        content:
          "8 AI expert personas debate your startup idea across 4 rounds and deliver a GO/NO-GO verdict in minutes. Free to try — no pitch deck needed.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
    scripts: [
      { type: "application/ld+json", children: structuredData },
      { type: "application/ld+json", children: reviewsData },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      {/* ported from main.tsx */}
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AIDisclosureModal />
          <Outlet />
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

function RootErrorComponent({ error }: { error: Error }) {
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">This page didn't load</h1>
        <p className="text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
            onClick={() => location.reload()}
          >
            Try again
          </button>
          <a
            className="px-4 py-2 rounded-md border border-border text-foreground"
            href="/"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
