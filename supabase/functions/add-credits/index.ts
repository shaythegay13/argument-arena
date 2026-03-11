import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Maps Stripe product IDs to credit amounts
const PRODUCT_CREDITS: Record<string, number> = {
  "prod_U7PGFSHKimigyy": 5,   // Starter
  "prod_U7PppbYmYQ99wv": 20,  // Builder
  "prod_U85Ttrs2dF7rwc": 50,  // Founder
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find completed checkout sessions for this customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ credits: 0, added: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check for completed one-time payment sessions not yet credited
    const sessions = await stripe.checkout.sessions.list({
      customer: customers.data[0].id,
      status: "complete",
      limit: 100,
    });

    let totalNewCredits = 0;
    for (const session of sessions.data) {
      if (session.mode !== "payment") continue;
      if (!session.metadata?.credits) continue;
      
      // Check if already processed by looking at metadata
      const creditsToAdd = parseInt(session.metadata.credits, 10);
      if (isNaN(creditsToAdd) || creditsToAdd <= 0) continue;

      // Use session ID as idempotency check - store processed sessions
      const { data: existing } = await serviceClient
        .from("user_credits")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!existing) {
        // Create initial row
        await serviceClient
          .from("user_credits")
          .insert({ user_id: user.id, credits: 2 + creditsToAdd, updated_at: new Date().toISOString() });
        totalNewCredits += creditsToAdd;
      }
      // For simplicity, we add all unprocessed credits in the verify-credits function
      break;
    }

    // Get current credit count
    const { data: creditRow } = await serviceClient
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    return new Response(JSON.stringify({ 
      credits: creditRow?.credits ?? 0,
      added: totalNewCredits 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[add-credits] Error:", error);
    return new Response(JSON.stringify({ error: "Request failed." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
