import Stripe from "stripe";
import {
  PRO_MONTHLY_EVALUATIONS,
  creditsFromCheckout,
  isMissingMigrationError,
  resolveSubscription,
  type ResolvedSubscription,
  type SubscriptionSnapshot,
} from "@/lib/billingRules";

const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;

function getStripe(): Stripe {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
}

function productIdOf(product: Stripe.Price["product"] | null | undefined): string | null {
  if (!product) return null;
  if (typeof product === "string") return product;
  return "id" in product ? product.id : null;
}

function periodOf(item: Stripe.SubscriptionItem | undefined): { start: number | null; end: number | null } {
  const period = item as (Stripe.SubscriptionItem & {
    current_period_start?: number;
    current_period_end?: number;
  }) | undefined;
  return {
    start: typeof period?.current_period_start === "number" ? period.current_period_start : null,
    end: typeof period?.current_period_end === "number" ? period.current_period_end : null,
  };
}

export async function lookupSubscription(email: string): Promise<ResolvedSubscription | null> {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) return null;
  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return null;
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const snapshots: SubscriptionSnapshot[] = subscriptions.data.map((subscription) => {
      const item = subscription.items.data[0];
      const period = periodOf(item);
      return {
        id: subscription.id,
        status: subscription.status,
        productId: productIdOf(item?.price?.product),
        periodStart: period.start,
        periodEnd: period.end,
      };
    });
    return resolveSubscription(snapshots);
  } catch (error) {
    console.error("[billing] subscription lookup failed:", error);
    return null;
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function ensureProAllowance(userId: string, subscription: ResolvedSubscription): Promise<void> {
  if (subscription.tier !== "pro") return;
  const supabaseAdmin = await admin();
  const { error } = await supabaseAdmin.rpc("grant_pro_monthly_allowance", {
    p_user_id: userId,
    p_stripe_subscription_id: subscription.subscriptionId,
    p_period_start: new Date(subscription.periodStart * 1000).toISOString(),
    p_period_end: new Date(subscription.periodEnd * 1000).toISOString(),
    p_credits: PRO_MONTHLY_EVALUATIONS,
  } as never);
  if (error && !isMissingMigrationError(error)) {
    console.error("[billing] pro allowance grant failed:", error.message);
  } else if (error) {
    console.error("[billing] apply supabase/migrations/20261015040000_credit_purchases_and_pro_allowance.sql before granting Pro credits");
  }
}

export async function readMonthlyRemaining(userId: string): Promise<number> {
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin
    .from("pro_allowances" as never)
    .select("granted, consumed, expires_at")
    .eq("user_id", userId);
  if (error) {
    if (!isMissingMigrationError(error)) console.error("[billing] allowance read failed:", error.message);
    return 0;
  }
  const now = Date.now();
  return ((data ?? []) as { granted: number; consumed: number; expires_at: string }[]).reduce((sum, row) => {
    if (new Date(row.expires_at).getTime() <= now || row.consumed >= row.granted) return sum;
    return sum + (row.granted - row.consumed);
  }, 0);
}

interface CheckoutLike {
  id: string;
  mode: Stripe.Checkout.Session.Mode | null;
  payment_status: Stripe.Checkout.Session.PaymentStatus | null;
  metadata: Stripe.Metadata | null;
  line_items?: Stripe.ApiList<Stripe.LineItem> | null;
}

function creditsForSession(session: CheckoutLike, expectedUserId: string | null): number | null {
  const price = session.line_items?.data[0]?.price;
  const priceId = typeof price === "string" ? price : price?.id ?? null;
  return creditsFromCheckout({
    mode: session.mode,
    paymentStatus: session.payment_status,
    priceId,
    metadataCredits: session.metadata?.["credits"] ?? null,
    metadataUserId: session.metadata?.["user_id"] ?? null,
    expectedUserId,
  });
}

/** Adds each completed pack payment once. A repeated call for the same session adds nothing. */
export async function syncPurchasedCreditsForUser(userId: string, email: string): Promise<{ added: number }> {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) return { added: 0 };
  const stripe = getStripe();
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) return { added: 0 };

  const supabaseAdmin = await admin();
  let added = 0;
  let startingAfter: string | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await stripe.checkout.sessions.list({
      customer: customer.id,
      status: "complete",
      limit: 100,
      expand: ["data.line_items"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const session of list.data) {
      const credits = creditsForSession(session, userId);
      if (!credits) continue;
      const { data, error } = await supabaseAdmin.rpc("apply_credit_purchase", {
        p_user_id: userId,
        p_stripe_session_id: session.id,
        p_credits: credits,
      } as never);
      if (error) {
        if (isMissingMigrationError(error)) {
          console.error("[billing] apply supabase/migrations/20261015040000_credit_purchases_and_pro_allowance.sql before credit packs can land");
          return { added };
        }
        console.error("[billing] credit purchase apply failed:", error.message);
        continue;
      }
      const result = (data ?? {}) as { added?: number };
      added += result.added ?? 0;
    }
    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1]?.id;
  }
  return { added };
}

export async function applyCheckoutSessionById(sessionId: string): Promise<{ added: number }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  const userId = session.metadata?.["user_id"] ?? null;
  const credits = creditsForSession(session, userId);
  if (!credits || !userId) return { added: 0 };
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin.rpc("apply_credit_purchase", {
    p_user_id: userId,
    p_stripe_session_id: session.id,
    p_credits: credits,
  } as never);
  if (error) {
    if (isMissingMigrationError(error)) {
      console.error("[billing] apply supabase/migrations/20261015040000_credit_purchases_and_pro_allowance.sql before credit packs can land");
      return { added: 0 };
    }
    throw new Error(error.message);
  }
  const result = (data ?? {}) as { added?: number };
  return { added: result.added ?? 0 };
}
