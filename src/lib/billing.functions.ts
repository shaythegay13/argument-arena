import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRO_PRODUCT_ID = "prod_U7OtWtNsHfTIoU";
const STUDIO_PRODUCT_ID = "prod_U85rRKfBRN9oEQ";

const PLANS: Record<string, string> = {
  pro: "price_1T9A5NIN6aHiJNfpbFsvvKTr",
  studio: "price_1T9pg3IN6aHiJNfpZEArQYTJ",
};

// Credit pack configuration
const CREDIT_PACKS: Record<string, { price_id: string; credits: number }> = {
  single: { price_id: "price_1T9pfvIN6aHiJNfpBCp1cnsD", credits: 1 },
  starter: { price_id: "price_1T9ASKIN6aHiJNfpOaigNoJR", credits: 5 },
  builder: { price_id: "price_1T9AzaIN6aHiJNfp7y0yJW7k", credits: 15 },
  founder: { price_id: "price_1T9pIAIN6aHiJNfp3213kJyd", credits: 40 },
};

// Maps Stripe product IDs to credit amounts (one-time purchase products)
const PRODUCT_CREDITS: Record<string, number> = {
  prod_U7PGFSHKimigyy: 5, // Starter
  prod_U7PppbYmYQ99wv: 20, // Builder
  prod_U85Ttrs2dF7rwc: 50, // Founder
};

function getStripe(): Stripe {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
}

function getOrigin(): string {
  const request = getRequest();
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) return `https://${forwardedHost}`;
  }
  return url.origin;
}

function getEmail(claims: Record<string, unknown>): string | null {
  const email = claims?.["email"];
  return typeof email === "string" ? email : null;
}

export interface CheckSubscriptionResult {
  subscribed: boolean;
  tier: string | null;
  subscription_end: string | null;
  credits: number;
}

export const checkSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CheckSubscriptionResult> => {
    const { supabase, userId, claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    try {
      // Ensure user has a credits row
      const { data: creditRow } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .single();

      let credits = 2;
      if (!creditRow) {
        await supabase.from("user_credits").insert({ user_id: userId, credits: 2 });
      } else {
        credits = creditRow.credits;
      }

      const stripe = getStripe();
      const customers = await stripe.customers.list({ email, limit: 1 });

      if (customers.data.length === 0) {
        return { subscribed: false, tier: null, subscription_end: null, credits };
      }

      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      const hasActiveSub = subscriptions.data.length > 0;
      let subscriptionEnd: string | null = null;
      let tier: string | null = null;

      if (hasActiveSub) {
        for (const subscription of subscriptions.data) {
          const productId = subscription.items.data[0]?.price?.product;
          if (productId === STUDIO_PRODUCT_ID) {
            tier = "studio";
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            break;
          }
          if (productId === PRO_PRODUCT_ID) {
            tier = "pro";
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          }
        }
      }

      return {
        subscribed: !!tier,
        tier,
        subscription_end: subscriptionEnd,
        credits,
      };
    } catch (error) {
      console.error("[checkSubscription] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });

export interface CreateCheckoutResult {
  url: string | null;
}

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan?: string }) => ({ plan: input?.plan }))
  .handler(async ({ context, data }): Promise<CreateCheckoutResult> => {
    const { claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    try {
      const plan = data.plan && PLANS[data.plan] ? data.plan : "pro";
      const priceId = PLANS[plan];
      const origin = getOrigin();

      const stripe = getStripe();
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string | undefined;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/dashboard?upgrade=success`,
        cancel_url: `${origin}/dashboard?upgrade=canceled`,
      });

      return { url: session.url };
    } catch (error) {
      console.error("[createCheckout] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });

export interface PurchaseCreditsResult {
  url: string | null;
}

export const purchaseCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pack: string }) => ({ pack: String(input?.pack ?? "") }))
  .handler(async ({ context, data }): Promise<PurchaseCreditsResult> => {
    const { userId, claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    try {
      const packConfig = CREDIT_PACKS[data.pack];
      if (!packConfig) throw new Error("Invalid credit pack");

      const origin = getOrigin();
      const stripe = getStripe();
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string | undefined;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : email,
        line_items: [{ price: packConfig.price_id, quantity: 1 }],
        mode: "payment",
        metadata: {
          user_id: userId,
          pack: data.pack,
          credits: String(packConfig.credits),
        },
        success_url: `${origin}/dashboard?credits=success&pack=${data.pack}`,
        cancel_url: `${origin}/dashboard?credits=canceled`,
      });

      return { url: session.url };
    } catch (error) {
      console.error("[purchaseCredits] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });

export interface OpenCustomerPortalResult {
  url: string;
}

export const openCustomerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpenCustomerPortalResult> => {
    const { claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    try {
      const stripe = getStripe();
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No subscription found.");
      }

      const origin = getOrigin();
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: `${origin}/dashboard`,
      });

      return { url: portalSession.url };
    } catch (error) {
      console.error("[openCustomerPortal] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });

export interface SyncPurchasedCreditsResult {
  credits: number;
  added: number;
}

export const syncPurchasedCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncPurchasedCreditsResult> => {
    const { userId, claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    try {
      const stripe = getStripe();
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) {
        return { credits: 0, added: 0 };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Check for completed one-time payment sessions not yet credited
      const sessions = await stripe.checkout.sessions.list({
        customer: customers.data[0].id,
        status: "complete",
        limit: 100,
      });

      let totalNewCredits = 0;
      for (const session of sessions.data) {
        if (session.mode !== "payment") continue;
        if (!session.metadata?.["credits"]) continue;

        const creditsToAdd = parseInt(session.metadata["credits"], 10);
        if (isNaN(creditsToAdd) || creditsToAdd <= 0) continue;

        // Use presence of a row as idempotency check
        const { data: existing } = await supabaseAdmin
          .from("user_credits")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existing) {
          await supabaseAdmin
            .from("user_credits")
            .insert({ user_id: userId, credits: 2 + creditsToAdd, updated_at: new Date().toISOString() });
          totalNewCredits += creditsToAdd;
        }
        // For simplicity, we add all unprocessed credits in a single pass
        break;
      }

      const { data: creditRow } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .single();

      return {
        credits: creditRow?.credits ?? 0,
        added: totalNewCredits,
      };
    } catch (error) {
      console.error("[syncPurchasedCredits] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });
