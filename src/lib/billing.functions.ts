import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

function getStripe(): Stripe {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
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
  /** Unexpired Pro evaluations for this billing period, including one month of rollover. */
  monthlyRemaining: number;
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

      if (!creditRow) {
        await supabase.from("user_credits").insert({ user_id: userId, credits: 2 });
      }

      const { lookupSubscription, ensureProAllowance, syncPurchasedCreditsForUser, readMonthlyRemaining } =
        await import("@/lib/billingSync.server");
      const subscription = await lookupSubscription(email);
      if (subscription?.tier === "pro") {
        await ensureProAllowance(userId, subscription);
      }
      await syncPurchasedCreditsForUser(userId, email);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: refreshed } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();
      const monthlyRemaining = subscription?.tier === "pro" ? await readMonthlyRemaining(userId) : 0;

      return {
        subscribed: subscription != null,
        tier: subscription?.tier ?? null,
        subscription_end: subscription ? new Date(subscription.periodEnd * 1000).toISOString() : null,
        credits: refreshed?.credits ?? creditRow?.credits ?? 2,
        monthlyRemaining,
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
      const customerId: string | undefined = customers.data[0]?.id;

      const params: Stripe.Checkout.SessionCreateParams = {
        line_items: [{ price: priceId as string, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/dashboard?upgrade=success`,
        cancel_url: `${origin}/dashboard?upgrade=canceled`,
        ...(customerId ? { customer: customerId } : { customer_email: email }),
      };
      const session = await stripe.checkout.sessions.create(params);

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
      const customerId: string | undefined = customers.data[0]?.id;

      const params: Stripe.Checkout.SessionCreateParams = {
        line_items: [{ price: packConfig.price_id, quantity: 1 }],
        mode: "payment",
        metadata: {
          user_id: userId,
          pack: data.pack,
          credits: String(packConfig.credits),
        },
        success_url: `${origin}/dashboard?credits=success&pack=${data.pack}`,
        cancel_url: `${origin}/dashboard?credits=canceled`,
        ...(customerId ? { customer: customerId } : { customer_email: email }),
      };
      const session = await stripe.checkout.sessions.create(params);

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
        customer: customers.data[0]!.id,
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
      const { syncPurchasedCreditsForUser } = await import("@/lib/billingSync.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { added } = await syncPurchasedCreditsForUser(userId, email);
      const { data: creditRow } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        credits: creditRow?.credits ?? 0,
        added,
      };
    } catch (error) {
      console.error("[syncPurchasedCredits] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });
