import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  isPro: boolean;
  isStudio: boolean;
  tier: string | null;
  subscriptionEnd: string | null;
  credits: number;
  loading: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isPro: false,
    isStudio: false,
    tier: null,
    subscriptionEnd: null,
    credits: 0,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isPro: false, isStudio: false, tier: null, subscriptionEnd: null, credits: 0, loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      const tier = data?.tier ?? null;
      setState({
        isPro: tier === "pro" || tier === "studio",
        isStudio: tier === "studio",
        tier,
        subscriptionEnd: data?.subscription_end ?? null,
        credits: data?.credits ?? 0,
        loading: false,
      });
    } catch (err) {
      console.warn("[useSubscription]", err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });
    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  const startCheckout = async (plan: string = "pro") => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { plan },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const purchaseCredits = async (pack: string) => {
    const { data, error } = await supabase.functions.invoke("purchase-credits", {
      body: { pack },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const manageSubscription = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  return {
    ...state,
    checkSubscription,
    startCheckout,
    purchaseCredits,
    manageSubscription,
  };
}
