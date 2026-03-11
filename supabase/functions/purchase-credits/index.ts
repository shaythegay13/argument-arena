import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit pack configuration
const CREDIT_PACKS: Record<string, { price_id: string; credits: number }> = {
  starter: { price_id: "price_1T9ASKIN6aHiJNfpOaigNoJR", credits: 5 },
  builder: { price_id: "price_1T9AzaIN6aHiJNfp7y0yJW7k", credits: 20 },
  founder: { price_id: "price_1T9pIAIN6aHiJNfp3213kJyd", credits: 50 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { pack } = await req.json();
    const packConfig = CREDIT_PACKS[pack];
    if (!packConfig) throw new Error("Invalid credit pack");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: packConfig.price_id, quantity: 1 }],
      mode: "payment",
      metadata: {
        user_id: user.id,
        pack,
        credits: String(packConfig.credits),
      },
      success_url: `${req.headers.get("origin")}/dashboard?credits=success&pack=${pack}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?credits=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[purchase-credits] Error:", error);
    return new Response(JSON.stringify({ error: "Request failed. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
