import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getPanelistSlots,
  purchasePanelistSlots,
  type PanelistSlotsResult,
} from "@/lib/panelistSlots.functions";

/**
 * Resolves how many custom panelist slots the founder is entitled to (tier
 * allowance plus any slots they bought) and exposes a Stripe checkout hop for
 * buying more.
 */
export function usePanelistSlots(userId: string | undefined, rosterCount: number) {
  const fetchSlots = useServerFn(getPanelistSlots);
  const buySlots = useServerFn(purchasePanelistSlots);

  const [slots, setSlots] = useState<PanelistSlotsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSlots(null);
      return;
    }
    setLoading(true);
    try {
      setSlots(await fetchSlots({ data: {} } as never));
    } catch (err) {
      console.warn("[usePanelistSlots] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchSlots]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (quantity = 1) => {
      setPurchasing(true);
      try {
        const { url } = await buySlots({ data: { quantity } });
        if (url) window.location.href = url;
        else throw new Error("Checkout unavailable. Please try again.");
      } finally {
        setPurchasing(false);
      }
    },
    [buySlots]
  );

  const totalSlots = slots?.totalSlots ?? 1;
  const usedSlots = Math.max(slots?.usedSlots ?? 0, rosterCount);

  return {
    slots,
    loading,
    purchasing,
    refresh,
    purchase,
    totalSlots,
    usedSlots,
    remaining: Math.max(totalSlots - usedSlots, 0),
    atLimit: usedSlots >= totalSlots,
  };
}
