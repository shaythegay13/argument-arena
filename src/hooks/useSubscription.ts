import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  isPro: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isPro: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isPro: false, subscriptionEnd: null, loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setState({
        isPro: data?.subscribed ?? false,
        subscriptionEnd: data?.subscription_end ?? null,
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

  // Re-check on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });
    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  const startCheckout = async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout");
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
    manageSubscription,
  };
}
