import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Jury generation endpoint (ported from the standalone debate-ai function).
 *
 * It is a server route rather than a server function because the browser needs
 * the raw SSE stream so each juror's answer appears progressively.
 */

const ALLOWED_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5-mini",
];

const MAX_PROMPT_LENGTH = 20000;
const PRO_PRODUCT_ID = "prod_U7OtWtNsHfTIoU";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function isUserSubscribed(email: string): Promise<boolean> {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (!stripeKey) return false;
  try {
    const stripe = new Stripe(stripeKey);
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return false;
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });
    const sub = subscriptions.data[0];
    if (!sub) return false;
    return sub.items.data[0]?.price?.product === PRO_PRODUCT_ID;
  } catch (e) {
    console.error("[debate-ai] subscription check error:", e);
    return false;
  }
}

export const Route = createFileRoute("/api/debate-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
          const token = authHeader.slice("Bearer ".length);

          const supabaseUrl = process.env["SUPABASE_URL"]!;
          const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
          const authClient = createClient(supabaseUrl, publishableKey, {
            auth: { persistSession: false },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (
                  publishableKey.startsWith("sb_") &&
                  headers.get("Authorization") === `Bearer ${publishableKey}`
                ) {
                  headers.delete("Authorization");
                }
                headers.set("apikey", publishableKey);
                return fetch(input, { ...init, headers });
              },
            },
          });

          const { data: userData, error: userError } = await authClient.auth.getUser(token);
          const user = userData?.user;
          if (userError || !user) return json({ error: "Unauthorized" }, 401);

          const body = (await request.json()) as {
            systemPrompt?: unknown;
            userPrompt?: unknown;
            model?: unknown;
            sessionId?: unknown;
            stream?: unknown;
            mode?: unknown;
          };
          const { systemPrompt, userPrompt, model, sessionId } = body;
          const wantStream = body.stream === true;
          // Utility calls (panel routing, completeness hints, host recap script)
          // are not jury evaluations: never billed, no session row required.
          const isUtility = body.mode === "utility";

          if (!isUtility && (typeof sessionId !== "string" || sessionId.trim().length === 0)) {
            console.error("[debate-ai] missing sessionId", { userId: user.id });
            return json(
              {
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
              },
              422,
            );
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const isPro = isUtility ? true : (user.email ? await isUserSubscribed(user.email) : false);

          let sessionAlreadyStarted = false;
          if (!isUtility && typeof sessionId === "string") {
            const { data: sessionRow } = await supabaseAdmin
              .from("debate_sessions")
              .select("rounds")
              .eq("id", sessionId)
              .maybeSingle();
            const rounds = (sessionRow?.rounds as unknown[]) ?? [];
            sessionAlreadyStarted = rounds.length > 0;
          }

          // Idempotent billing: exactly one charge per session id, enforced in the DB.
          let chargedNow = false;
          if (!isUtility && !isPro && !sessionAlreadyStarted) {
            const { data: chargeResult, error: chargeError } = await supabaseAdmin.rpc(
              "consume_evaluation_credit",
              { p_user_id: user.id, p_session_id: String(sessionId) } as never,
            );

            if (chargeError) {
              console.error("credit charge failed:", chargeError.message);
              return json({ error: "Service temporarily unavailable" }, 500);
            }

            const charge = (chargeResult ?? {}) as {
              charged?: boolean;
              already_charged?: boolean;
            };

            if (!charge.charged && !charge.already_charged) {
              return json(
                {
                  error:
                    "No evaluation credits remaining. Purchase credits or subscribe to Pro.",
                },
                429,
              );
            }
            chargedNow = Boolean(charge.charged);
          }

          const refundIfCharged = async () => {
            if (!chargedNow || typeof sessionId !== "string") return;
            chargedNow = false;
            const { error } = await supabaseAdmin.rpc("refund_evaluation_credit", {
              p_user_id: user.id,
              p_session_id: String(sessionId),
            } as never);
            if (error) console.error("credit refund failed:", error.message);
          };

          if (typeof systemPrompt !== "string" || systemPrompt.length > MAX_PROMPT_LENGTH) {
            await refundIfCharged();
            return json({ error: "Invalid or too long systemPrompt" }, 400);
          }
          if (typeof userPrompt !== "string" || userPrompt.length > MAX_PROMPT_LENGTH) {
            await refundIfCharged();
            return json({ error: "Invalid or too long userPrompt" }, 400);
          }

          const selectedModel =
            typeof model === "string" && ALLOWED_MODELS.includes(model)
              ? model
              : "google/gemini-3-flash-preview";

          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) {
            await refundIfCharged();
            console.error("[debate-ai] LOVABLE_API_KEY missing");
            return json({ error: "Service temporarily unavailable" }, 500);
          }

          let response: Response;
          try {
            response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: selectedModel,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                ...(wantStream ? { stream: true } : {}),
              }),
            });
          } catch (networkError) {
            console.error("AI gateway network error:", networkError);
            await refundIfCharged();
            return json({ error: "Service temporarily unavailable" }, 500);
          }

          if (!response.ok) {
            // The evaluation never produced output — never keep the credit.
            await refundIfCharged();
            if (response.status === 429) {
              return json(
                { error: "Rate limit exceeded. Please wait a moment and try again." },
                429,
              );
            }
            if (response.status === 402) {
              return json(
                { error: "AI usage credits exhausted. Please add credits in Settings." },
                402,
              );
            }
            console.error("AI gateway error:", response.status, await response.text());
            return json({ error: "Service temporarily unavailable" }, 500);
          }

          if (wantStream && response.body) {
            let sawContent = false;
            const relay = new TransformStream<Uint8Array, Uint8Array>({
              transform(chunk, controller) {
                if (!sawContent) {
                  const text = new TextDecoder().decode(chunk);
                  if (/"(content|text)"\s*:\s*"[^"]/.test(text)) sawContent = true;
                }
                controller.enqueue(chunk);
              },
              async flush() {
                if (!sawContent) {
                  console.error("[debate-ai] stream produced no content — refunding");
                  await refundIfCharged();
                }
              },
            });

            return new Response(response.body.pipeThrough(relay), {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-store",
                Connection: "keep-alive",
              },
            });
          }

          let content = "";
          try {
            const data = (await response.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            content = data.choices?.[0]?.message?.content ?? "";
          } catch (parseError) {
            console.error("AI gateway parse error:", parseError);
          }

          if (!content.trim()) {
            await refundIfCharged();
            return json(
              {
                error:
                  "The panel returned an empty response. Please try again — no credit was charged.",
              },
              502,
            );
          }

          return json({ content });
        } catch (e) {
          console.error("debate-ai error:", e);
          return json({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});
