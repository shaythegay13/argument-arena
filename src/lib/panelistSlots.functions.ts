import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One-time purchase: unlocks a single extra custom panelist slot. */
const SLOT_PRICE_ID = "price_1UAHskIN6aHiJNfpLZlMYZKr";
const PRO_PRODUCT_ID = "prod_U7OtWtNsHfTIoU";
const STUDIO_PRODUCT_ID = "prod_U85rRKfBRN9oEQ";

/** Slots each tier includes before any à-la-carte purchases. */
export const TIER_INCLUDED_SLOTS: Record<string, number> = {
  free: 3,
  pro: 8,
  studio: 25,
};

export interface PanelistSlotsResult {
  tier: string;
  includedSlots: number;
  purchasedSlots: number;
  totalSlots: number;
  usedSlots: number;
}

function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

function getOrigin(): string {
  const request = getRequest();
  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    const forwarded = request.headers.get("x-forwarded-host");
    if (forwarded) return `https://${forwarded}`;
  }
  return url.origin;
}

function getEmail(claims: Record<string, unknown>): string | null {
  const email = claims?.["email"];
  return typeof email === "string" ? email : null;
}

async function resolveTier(stripe: Stripe, email: string): Promise<string> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customerId = customers.data[0]?.id;
  if (!customerId) return "free";

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
  let tier = "free";
  for (const sub of subs.data) {
    const product = sub.items.data[0]?.price?.product;
    if (product === STUDIO_PRODUCT_ID) return "studio";
    if (product === PRO_PRODUCT_ID) tier = "pro";
  }
  return tier;
}

/**
 * Credits any completed slot purchases that have not been recorded yet, then
 * reports the caller's slot entitlement. Recording each Stripe session id keeps
 * the sync idempotent, so refreshing never grants free slots.
 */
export const getPanelistSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PanelistSlotsResult> => {
    const { supabase, userId, claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    let tier = "free";
    try {
      const stripe = getStripe();
      tier = await resolveTier(stripe, email);

      const customers = await stripe.customers.list({ email, limit: 1 });
      const customerId = customers.data[0]?.id;

      if (customerId) {
        const sessions = await stripe.checkout.sessions.list({
          customer: customerId,
          status: "complete",
          limit: 100,
        });
        const slotSessions = sessions.data.filter(
          (s) => s.mode === "payment" && s.metadata?.["panelist_slots"] && s.metadata?.["user_id"] === userId
        );

        if (slotSessions.length) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: recorded } = await supabaseAdmin
            .from("panelist_slot_purchases")
            .select("stripe_session_id")
            .eq("user_id", userId);
          const seen = new Set((recorded ?? []).map((r) => r.stripe_session_id));

          let added = 0;
          for (const session of slotSessions) {
            if (seen.has(session.id)) continue;
            const slots = parseInt(session.metadata?.["panelist_slots"] ?? "0", 10);
            if (!Number.isFinite(slots) || slots <= 0) continue;
            const { error } = await supabaseAdmin
              .from("panelist_slot_purchases")
              .insert({ user_id: userId, stripe_session_id: session.id, slots });
            if (!error) added += slots;
          }

          if (added > 0) {
            const { data: existing } = await supabaseAdmin
              .from("panelist_slots")
              .select("purchased_slots")
              .eq("user_id", userId)
              .maybeSingle();
            await supabaseAdmin.from("panelist_slots").upsert(
              {
                user_id: userId,
                purchased_slots: (existing?.purchased_slots ?? 0) + added,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
          }
        }
      }
    } catch (error) {
      // Billing lookups must never lock a founder out of their own roster.
      console.error("[getPanelistSlots] billing sync failed:", error);
    }

    const { data: slotRow } = await supabase
      .from("panelist_slots")
      .select("purchased_slots")
      .eq("user_id", userId)
      .maybeSingle();

    const { count } = await supabase
      .from("panelists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const includedSlots = TIER_INCLUDED_SLOTS[tier] ?? 1;
    const purchasedSlots = slotRow?.purchased_slots ?? 0;

    return {
      tier,
      includedSlots,
      purchasedSlots,
      totalSlots: includedSlots + purchasedSlots,
      usedSlots: count ?? 0,
    };
  });

export interface PurchasePanelistSlotsResult {
  url: string | null;
}

export const purchasePanelistSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { quantity?: number }) => ({
    quantity: Math.min(Math.max(Math.round(Number(input?.quantity ?? 1)) || 1, 1), 20),
  }))
  .handler(async ({ context, data }): Promise<PurchasePanelistSlotsResult> => {
    const { userId, claims } = context;
    const email = getEmail(claims);
    if (!email) throw new Error("Request failed. Please try again.");

    try {
      const stripe = getStripe();
      const origin = getOrigin();
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customerId = customers.data[0]?.id;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: SLOT_PRICE_ID, quantity: data.quantity }],
        mode: "payment",
        metadata: {
          user_id: userId,
          panelist_slots: String(data.quantity),
        },
        success_url: `${origin}/panelists?slots=success`,
        cancel_url: `${origin}/panelists?slots=canceled`,
        ...(customerId ? { customer: customerId } : { customer_email: email }),
      });

      return { url: session.url };
    } catch (error) {
      console.error("[purchasePanelistSlots] Error:", error);
      throw new Error("Request failed. Please try again.");
    }
  });
