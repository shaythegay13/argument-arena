import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREDIT_PACKS, SINGLE_EVAL, STRIPE_PRO, STRIPE_STUDIO } from "@/data/pricing";
import {
  PRO_MONTHLY_EVALUATIONS,
  allowanceExpiresAt,
  applyPackPurchase,
  chargeEvaluation,
  chargePolicy,
  creditsForPriceId,
  creditsFromCheckout,
  grantProAllowance,
  remainingAllowance,
  resolveSubscription,
  type BillingAccounts,
} from "@/lib/billingRules";

const PERIOD_START = 1_700_000_000;
const PERIOD_END = PERIOD_START + 30 * 24 * 60 * 60;

function accounts(partial: Partial<BillingAccounts> = {}): BillingAccounts {
  return {
    balance: 0,
    allowances: [],
    chargedSessionIds: new Set(),
    ...partial,
  };
}

describe("resolveSubscription", () => {
  it("recognizes Pro and Studio and lets Studio win", () => {
    const resolved = resolveSubscription([
      {
        id: "sub_pro",
        status: "active",
        productId: STRIPE_PRO.product_id,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      },
      {
        id: "sub_studio",
        status: "trialing",
        productId: STRIPE_STUDIO.product_id,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
      },
    ]);
    expect(resolved?.tier).toBe("studio");
    expect(resolved?.subscriptionId).toBe("sub_studio");
  });

  it("ignores inactive subscriptions and unknown products", () => {
    expect(
      resolveSubscription([
        {
          id: "sub_old",
          status: "canceled",
          productId: STRIPE_PRO.product_id,
          periodStart: PERIOD_START,
          periodEnd: PERIOD_END,
        },
        {
          id: "sub_other",
          status: "active",
          productId: "prod_other",
          periodStart: PERIOD_START,
          periodEnd: PERIOD_END,
        },
      ]),
    ).toBeNull();
  });
});

describe("chargePolicy", () => {
  it("waives Studio and utility calls, and charges Pro", () => {
    expect(chargePolicy("studio", false)).toBe("waive");
    expect(chargePolicy("pro", true)).toBe("waive");
    expect(chargePolicy("pro", false)).toBe("charge");
    expect(chargePolicy("free", false)).toBe("charge");
  });
});

describe("credit packs", () => {
  it("maps each pricing-page price to that pack's credits", () => {
    expect(creditsForPriceId(SINGLE_EVAL.price_id)).toBe(1);
    expect(creditsForPriceId(CREDIT_PACKS[0]!.price_id)).toBe(5);
    expect(creditsForPriceId(CREDIT_PACKS[1]!.price_id)).toBe(15);
    expect(creditsForPriceId(CREDIT_PACKS[2]!.price_id)).toBe(40);
    expect(creditsForPriceId("price_unknown")).toBeNull();
  });

  it("rejects a metadata amount that is not a published pack", () => {
    expect(
      creditsFromCheckout({
        mode: "payment",
        paymentStatus: "paid",
        priceId: null,
        metadataCredits: "20",
        metadataUserId: "user-1",
        expectedUserId: "user-1",
      }),
    ).toBeNull();
    expect(
      creditsFromCheckout({
        mode: "payment",
        paymentStatus: "paid",
        priceId: null,
        metadataCredits: "50",
        metadataUserId: "user-1",
        expectedUserId: "user-1",
      }),
    ).toBeNull();
  });

  it("prefers the price id over a conflicting metadata amount", () => {
    expect(
      creditsFromCheckout({
        mode: "payment",
        paymentStatus: "paid",
        priceId: CREDIT_PACKS[1]!.price_id,
        metadataCredits: "40",
        metadataUserId: "user-1",
        expectedUserId: "user-1",
      }),
    ).toBe(15);
  });

  it("does not credit a subscription invoice or another user's checkout", () => {
    expect(
      creditsFromCheckout({
        mode: "subscription",
        paymentStatus: "paid",
        priceId: STRIPE_PRO.price_id,
        metadataCredits: "15",
        metadataUserId: "user-1",
        expectedUserId: "user-1",
      }),
    ).toBeNull();
    expect(
      creditsFromCheckout({
        mode: "payment",
        paymentStatus: "paid",
        priceId: SINGLE_EVAL.price_id,
        metadataCredits: "1",
        metadataUserId: "user-2",
        expectedUserId: "user-1",
      }),
    ).toBeNull();
  });

  it("applies a pack once for the same Checkout session", () => {
    const first = applyPackPurchase({ appliedSessionIds: new Set(), balance: 2 }, "cs_test_1", 15);
    expect(first.added).toBe(15);
    expect(first.ledger.balance).toBe(17);
    const second = applyPackPurchase(first.ledger, "cs_test_1", 15);
    expect(second.alreadyApplied).toBe(true);
    expect(second.added).toBe(0);
    expect(second.ledger.balance).toBe(17);
    const other = applyPackPurchase(second.ledger, "cs_test_2", 5);
    expect(other.ledger.balance).toBe(22);
  });
});

describe("Pro allowance", () => {
  it("grants 15 once per period and rolls unused credits for one month", () => {
    expect(PRO_MONTHLY_EVALUATIONS).toBe(15);
    const first = grantProAllowance([], {
      subscriptionId: "sub_pro",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      credits: PRO_MONTHLY_EVALUATIONS,
    });
    expect(first.created).toBe(true);
    expect(first.allowances[0]?.granted).toBe(15);
    expect(first.allowances[0]?.expiresAt).toBe(allowanceExpiresAt(PERIOD_END));
    const again = grantProAllowance(first.allowances, {
      subscriptionId: "sub_pro",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      credits: PRO_MONTHLY_EVALUATIONS,
    });
    expect(again.created).toBe(false);
    expect(again.allowances).toHaveLength(1);
  });

  it("spends allowance before purchased credits, and never twice for one session", () => {
    const granted = grantProAllowance([], {
      subscriptionId: "sub_pro",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      credits: 15,
    });
    const start = accounts({ balance: 3, allowances: granted.allowances });
    const now = PERIOD_END + 60;
    const first = chargeEvaluation(start, "session-1", "charge", now);
    expect(first.status).toBe("charged");
    if (first.status !== "charged") return;
    expect(first.source).toBe("allowance");
    expect(first.accounts.balance).toBe(3);
    expect(remainingAllowance(first.accounts.allowances, now)).toBe(14);

    const duplicate = chargeEvaluation(first.accounts, "session-1", "charge", now);
    expect(duplicate.status).toBe("already_charged");
    expect(remainingAllowance(duplicate.accounts.allowances, now)).toBe(14);
  });

  it("falls back to the credit balance after the allowance is gone", () => {
    const now = PERIOD_END;
    const outcome = chargeEvaluation(
      accounts({
        balance: 2,
        allowances: [
          { id: "old", periodStart: PERIOD_START, expiresAt: now - 1, granted: 15, consumed: 0 },
          { id: "used", periodStart: PERIOD_START, expiresAt: now + 10, granted: 15, consumed: 15 },
        ],
      }),
      "session-2",
      "charge",
      now,
    );
    expect(outcome.status).toBe("charged");
    if (outcome.status !== "charged") return;
    expect(outcome.source).toBe("balance");
    expect(outcome.accounts.balance).toBe(1);
  });

  it("does not touch balances when the policy waives the charge", () => {
    const start = accounts({ balance: 2 });
    const outcome = chargeEvaluation(start, "session-3", "waive", PERIOD_END);
    expect(outcome.status).toBe("waived");
    expect(outcome.accounts.balance).toBe(2);
  });
});

describe("migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20261015040000_credit_purchases_and_pro_allowance.sql",
    "utf8",
  );

  it("keys each payment on the Checkout session id and grants Pro once per period", () => {
    expect(sql).toContain("stripe_session_id text PRIMARY KEY");
    expect(sql).toContain("ON CONFLICT (user_id, stripe_subscription_id, period_start) DO NOTHING");
    expect(sql).toContain("p_period_end + interval '1 month'");
    expect(sql).toContain("consumed < granted");
    expect(sql).toContain("1, 'allowance'");
  });
});
