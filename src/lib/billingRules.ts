import { CREDIT_PACKS, SINGLE_EVAL, STRIPE_PRO, STRIPE_STUDIO } from "@/data/pricing";

/** One included evaluation per Pro billing period, matching the pricing page. */
export const PRO_MONTHLY_EVALUATIONS = STRIPE_PRO.monthlyCredits;

export const PRO_PRODUCT_ID = STRIPE_PRO.product_id;
export const STUDIO_PRODUCT_ID = STRIPE_STUDIO.product_id;

const PACK_CREDIT_AMOUNTS = new Set<number>([
  SINGLE_EVAL.credits,
  ...CREDIT_PACKS.map((pack) => pack.credits),
]);

export type PlanTier = "free" | "pro" | "studio";

export interface SubscriptionSnapshot {
  id: string;
  status: string;
  productId: string | null;
  /** Unix seconds. Null when Stripe did not send a period. */
  periodStart: number | null;
  periodEnd: number | null;
}

export interface ResolvedSubscription {
  tier: "pro" | "studio";
  subscriptionId: string;
  periodStart: number;
  periodEnd: number;
}

const BILLABLE_STATUSES = new Set(["active", "trialing"]);

/**
 * Studio wins when both products are active. Unknown products and inactive
 * subscriptions do not grant a plan.
 */
export function resolveSubscription(subscriptions: SubscriptionSnapshot[]): ResolvedSubscription | null {
  const billable = subscriptions.filter(
    (subscription) => BILLABLE_STATUSES.has(subscription.status) && subscription.productId,
  );
  const studio = billable.find((subscription) => subscription.productId === STUDIO_PRODUCT_ID);
  const pro = billable.find((subscription) => subscription.productId === PRO_PRODUCT_ID);
  const chosen = studio ?? pro;
  if (!chosen?.productId || chosen.periodStart == null || chosen.periodEnd == null) return null;
  return {
    tier: chosen.productId === STUDIO_PRODUCT_ID ? "studio" : "pro",
    subscriptionId: chosen.id,
    periodStart: chosen.periodStart,
    periodEnd: chosen.periodEnd,
  };
}

/** Studio is unlimited. Pro and free accounts spend a credit. Utility calls are never billed. */
export function chargePolicy(tier: PlanTier, isUtility: boolean): "waive" | "charge" {
  if (isUtility || tier === "studio") return "waive";
  return "charge";
}

export function creditsForPriceId(priceId: string | null | undefined): number | null {
  if (!priceId) return null;
  if (priceId === SINGLE_EVAL.price_id) return SINGLE_EVAL.credits;
  const pack = CREDIT_PACKS.find((item) => item.price_id === priceId);
  return pack ? pack.credits : null;
}

export interface CheckoutCreditInput {
  mode: string | null;
  paymentStatus: string | null;
  priceId: string | null;
  metadataCredits: string | null;
  metadataUserId: string | null;
  /** Authenticated user the credits would be applied to. Null in a webhook before the metadata owner is known. */
  expectedUserId: string | null;
}

/**
 * Credits to add for one completed Checkout payment.
 * The price id is the source of truth. Metadata is accepted only when it
 * matches a pack defined on the pricing page, and only for the paying user.
 */
export function creditsFromCheckout(input: CheckoutCreditInput): number | null {
  if (input.mode !== "payment") return null;
  if (input.paymentStatus !== "paid" && input.paymentStatus !== "no_payment_required") return null;
  if (input.expectedUserId && input.metadataUserId && input.metadataUserId !== input.expectedUserId) {
    return null;
  }
  const fromPrice = creditsForPriceId(input.priceId);
  if (fromPrice != null) return fromPrice;
  const parsed = Number(input.metadataCredits);
  if (!Number.isInteger(parsed) || !PACK_CREDIT_AMOUNTS.has(parsed)) return null;
  return parsed;
}

export interface AllowanceBucket {
  id: string;
  periodStart: number;
  expiresAt: number;
  granted: number;
  consumed: number;
}

export interface BillingAccounts {
  balance: number;
  allowances: AllowanceBucket[];
  /** Debate session ids that already have a charge row, including refunded ones. */
  chargedSessionIds: Set<string>;
}

export type ChargeOutcome =
  | { status: "already_charged"; accounts: BillingAccounts }
  | { status: "waived"; accounts: BillingAccounts }
  | { status: "charged"; source: "allowance" | "balance"; accounts: BillingAccounts }
  | { status: "insufficient"; accounts: BillingAccounts };

/**
 * Spend a monthly allowance credit before a purchased credit so expiring
 * Pro evaluations are used first. A session id is charged at most once.
 */
export function chargeEvaluation(
  accounts: BillingAccounts,
  sessionId: string,
  policy: "waive" | "charge",
  nowSeconds: number,
): ChargeOutcome {
  if (accounts.chargedSessionIds.has(sessionId)) {
    return { status: "already_charged", accounts };
  }
  if (policy === "waive") {
    return { status: "waived", accounts };
  }

  const allowance = [...accounts.allowances]
    .filter((bucket) => bucket.expiresAt > nowSeconds && bucket.consumed < bucket.granted)
    .sort((a, b) => a.periodStart - b.periodStart)[0];

  if (allowance) {
    const allowances = accounts.allowances.map((bucket) =>
      bucket.id === allowance.id ? { ...bucket, consumed: bucket.consumed + 1 } : bucket,
    );
    const chargedSessionIds = new Set(accounts.chargedSessionIds);
    chargedSessionIds.add(sessionId);
    return {
      status: "charged",
      source: "allowance",
      accounts: { ...accounts, allowances, chargedSessionIds },
    };
  }

  if (accounts.balance > 0) {
    const chargedSessionIds = new Set(accounts.chargedSessionIds);
    chargedSessionIds.add(sessionId);
    return {
      status: "charged",
      source: "balance",
      accounts: { ...accounts, balance: accounts.balance - 1, chargedSessionIds },
    };
  }

  return { status: "insufficient", accounts };
}

export function remainingAllowance(allowances: AllowanceBucket[], nowSeconds: number): number {
  return allowances.reduce((sum, bucket) => {
    if (bucket.expiresAt <= nowSeconds || bucket.consumed >= bucket.granted) return sum;
    return sum + (bucket.granted - bucket.consumed);
  }, 0);
}

/** Unused Pro credits stay available until one month after the period ends. */
export function allowanceExpiresAt(periodEndSeconds: number): number {
  const end = new Date(periodEndSeconds * 1000);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return Math.floor(end.getTime() / 1000);
}

export function grantProAllowance(
  allowances: AllowanceBucket[],
  grant: { subscriptionId: string; periodStart: number; periodEnd: number; credits: number },
): { allowances: AllowanceBucket[]; created: boolean } {
  const id = `${grant.subscriptionId}:${grant.periodStart}`;
  if (allowances.some((bucket) => bucket.id === id)) {
    return { allowances, created: false };
  }
  return {
    created: true,
    allowances: [
      ...allowances,
      {
        id,
        periodStart: grant.periodStart,
        expiresAt: allowanceExpiresAt(grant.periodEnd),
        granted: grant.credits,
        consumed: 0,
      },
    ],
  };
}

export interface PurchaseLedger {
  appliedSessionIds: Set<string>;
  balance: number;
}

/** The same Checkout session id never increases the balance twice. */
export function applyPackPurchase(
  ledger: PurchaseLedger,
  sessionId: string,
  credits: number,
): { ledger: PurchaseLedger; added: number; alreadyApplied: boolean } {
  if (ledger.appliedSessionIds.has(sessionId) || credits <= 0) {
    return { ledger, added: 0, alreadyApplied: ledger.appliedSessionIds.has(sessionId) };
  }
  const appliedSessionIds = new Set(ledger.appliedSessionIds);
  appliedSessionIds.add(sessionId);
  return {
    ledger: { appliedSessionIds, balance: ledger.balance + credits },
    added: credits,
    alreadyApplied: false,
  };
}

export function isMissingMigrationError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST202" || error.code === "42883") return true;
  return /does not exist|schema cache|could not find the function/i.test(error.message ?? "");
}
