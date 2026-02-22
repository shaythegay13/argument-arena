import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTermsAccepted(userId: string | undefined) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    supabase
      .from("user_agreements")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setAccepted(!!data);
        setLoading(false);
      });
  }, [userId]);

  return { accepted, loading };
}
