import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRO_PRODUCT_ID = "prod_U7OtWtNsHfTIoU";
const STUDIO_PRODUCT_ID = "prod_U85rRKfBRN9oEQ";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Ensure user has a credits row
    const { data: creditRow } = await supabaseClient
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    let credits = 2;
    if (!creditRow) {
      await supabaseClient
        .from("user_credits")
        .insert({ user_id: user.id, credits: 2 });
    } else {
      credits = creditRow.credits;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false, tier: null, credits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let tier: string | null = null;

    if (hasActiveSub) {
      for (const subscription of subscriptions.data) {
        const productId = subscription.items.data[0]?.price?.product;
        if (productId === STUDIO_PRODUCT_ID) {
          tier = "studio";
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          break;
        }
        if (productId === PRO_PRODUCT_ID) {
          tier = "pro";
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }
      }
      logStep("Subscription found", { tier, endDate: subscriptionEnd });
    }

    return new Response(JSON.stringify({
      subscribed: !!tier,
      tier,
      subscription_end: subscriptionEnd,
      credits,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Request failed. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
