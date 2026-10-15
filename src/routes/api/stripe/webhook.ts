import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { isMissingMigrationError } from "@/lib/billingRules";

/**
 * Stripe webhook for completed credit-pack payments.
 * Configure it in Stripe test mode only. This route does not create or edit
 * Stripe products, prices, or webhook endpoints.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const stripeKey = process.env["STRIPE_SECRET_KEY"];
        const signature = request.headers.get("stripe-signature");
        if (!secret || !stripeKey || !signature) {
          return json({ error: "Stripe webhook is not configured" }, 500);
        }
        if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("rk_test_")) {
          return json({ error: "Refusing a non-test Stripe key" }, 400);
        }

        const raw = await request.text();
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(raw, signature, secret);
        } catch (error) {
          console.error("[stripe-webhook] signature rejected:", error);
          return json({ error: "Invalid signature" }, 400);
        }

        if (event.type !== "checkout.session.completed") {
          return json({ received: true });
        }

        const session = event.data.object as Stripe.Checkout.Session;
        try {
          const { applyCheckoutSessionById } = await import("@/lib/billingSync.server");
          const result = await applyCheckoutSessionById(session.id);
          return json({ received: true, added: result.added });
        } catch (error) {
          if (isMissingMigrationError(error as { message?: string; code?: string })) {
            return json({ error: "Billing migration is not applied" }, 503);
          }
          console.error("[stripe-webhook] apply failed:", error);
          return json({ error: "Failed to apply credits" }, 500);
        }
      },
    },
  },
});
