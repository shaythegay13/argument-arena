import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5-mini",
];

const MAX_PROMPT_LENGTH = 20000;
const PRO_PRODUCT_ID = "prod_U7OtWtNsHfTIoU";

async function isUserSubscribed(email: string): Promise<boolean> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return false;

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) return false;

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) return false;
    const productId = subscriptions.data[0].items.data[0]?.price?.product;
    return productId === PRO_PRODUCT_ID;
  } catch (e) {
    console.error("[debate-ai] Stripe check error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { systemPrompt, userPrompt, model, sessionId } = await req.json();

    // Structured validation: sessionId is required for idempotent billing.
    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      console.error("[debate-ai] missing sessionId", { userId: user.id, received: typeof sessionId });
      return new Response(
        JSON.stringify({
          error: "MISSING_SESSION",
          code: "MISSING_SESSION",
          message:
            "A session id is required before the jury can run. No credit was charged.",
          details: {
            field: "sessionId",
            expected: "non-empty session id string",
            received: sessionId === undefined ? "undefined" : typeof sessionId,
            hint: "Create the debate session row first, then attach its id to every round request.",
          },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Use service role to check credits
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Check subscription status
    const isPro = user.email ? await isUserSubscribed(user.email) : false;

    // Check credits
    const { data: creditRow } = await serviceClient
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    const currentCredits = creditRow?.credits ?? 0;

    // Check if this session has already started (paid its credit)
    const { data: sessionRounds } = sessionId ? await serviceClient
      .from("debate_sessions")
      .select("rounds")
      .eq("id", sessionId)
      .single() : { data: null };

    const rounds = (sessionRounds?.rounds as any[]) ?? [];
    const sessionAlreadyStarted = rounds.length > 0;

    // Idempotent billing: exactly one charge per session id, enforced in the DB.
    let chargedNow = false;
    if (!isPro && !sessionAlreadyStarted) {



      const { data: chargeResult, error: chargeError } = await serviceClient.rpc(
        "consume_evaluation_credit",
        { p_user_id: user.id, p_session_id: String(sessionId) }
      );

      if (chargeError) {
        console.error("credit charge failed:", chargeError.message);
        return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const charge = (chargeResult ?? {}) as {
        charged?: boolean; already_charged?: boolean; error?: string;
      };

      if (!charge.charged && !charge.already_charged) {
        return new Response(
          JSON.stringify({
            error: "No evaluation credits remaining. Purchase credits or subscribe to Pro.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      chargedNow = Boolean(charge.charged);
    }

    const refundIfCharged = async () => {
      if (!chargedNow || !sessionId) return;
      chargedNow = false;
      const { error } = await serviceClient.rpc("refund_evaluation_credit", {
        p_user_id: user.id, p_session_id: String(sessionId),
      });
      if (error) console.error("credit refund failed:", error.message);
    };


    // Input validation
    if (typeof systemPrompt !== "string" || systemPrompt.length > MAX_PROMPT_LENGTH) {
      await refundIfCharged();
      return new Response(JSON.stringify({ error: "Invalid or too long systemPrompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof userPrompt !== "string" || userPrompt.length > MAX_PROMPT_LENGTH) {
      await refundIfCharged();
      return new Response(JSON.stringify({ error: "Invalid or too long userPrompt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedModel = ALLOWED_MODELS.includes(model) ? model : "google/gemini-3-flash-preview";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await refundIfCharged();
      throw new Error("Server configuration error");
    }

    let response: Response;
    try {
      response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );
    } catch (networkError) {
      console.error("AI gateway network error:", networkError);
      await refundIfCharged();
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      // The evaluation never produced output — never keep the credit.
      await refundIfCharged();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let content = "";
    try {
      const data = await response.json();
      content = data.choices?.[0]?.message?.content ?? "";
    } catch (parseError) {
      console.error("AI gateway parse error:", parseError);
    }

    if (!content.trim()) {
      await refundIfCharged();
      return new Response(
        JSON.stringify({ error: "The panel returned an empty response. Please try again — no credit was charged." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("debate-ai error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
