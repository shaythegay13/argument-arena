# Block the jury when credits run out

Today a user with 0 credits can still trigger the panel: the start button fires, round 1 begins, and the failure only surfaces mid-run as a generic "Generation failed" toast. Nothing checks the credit balance before starting, and the out-of-credits error from the backend is treated like any other error.

## What changes

1. **Pre-flight credit check.** Before any AI call, if the user is not Pro/Studio and has 0 credits, the jury does not start at all — the upgrade/credits popup opens instead. No round is generated, no partial panel output.
2. **Clear popup copy + buy button.** The popup opens directly on the credits tab with a message that they're out of evaluation credits and a prominent button to purchase a credit pack (existing checkout flow).
3. **Backend refusal is handled gracefully.** If the backend still refuses (balance changed in another tab, race condition), the app recognizes the out-of-credits response specifically, cleanly resets the stage back to the idea form instead of leaving a half-rendered panel, and shows the same popup rather than a generic error toast.
4. **Consistent rule elsewhere.** The same guard applies wherever a new evaluation can be launched (start debate entry points), so credits are always checked before a session begins. Continuing an already-started session is unaffected — a full 4-round jury remains one credit.

## Technical notes

- `src/pages/Index.tsx` — in `handleStartDebate`, add an early return when `!subscription.isPro && subscription.credits <= 0` that calls `setShowUpgrade(true)`; run `subscription.checkSubscription()` first so the balance is fresh. Also catch out-of-credits errors in the round-1 `catch` block, reset `phase` to the pre-debate state, and open the modal.
- `src/lib/ai.ts` — surface a recognizable error (e.g. a typed error or an `OUT_OF_CREDITS` marker) when the edge function returns the "No evaluation credits remaining" message, and do not retry it.
- `src/components/UpgradeModal.tsx` — accept an optional `reason="out_of_credits"` prop to force the credits tab and show the out-of-credits headline; no pricing changes.
- No edge function or database changes; `debate-ai` already deducts one credit per session and lets in-progress sessions finish.
