import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "npm:@copilotkit/runtime@1.51.3";
import OpenAI from "npm:openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle /info endpoint for CopilotKit agent discovery
    const body = await req.clone().text();
    let parsed: any = null;
    try { parsed = JSON.parse(body); } catch {}

    if (parsed?.method === "info" || req.url.endsWith("/info")) {
      return new Response(
        JSON.stringify({
          agents: [{ name: "default", description: "Default CopilotKit agent" }],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const openai = new OpenAI({
      apiKey: LOVABLE_API_KEY,
      baseURL: "https://ai.gateway.lovable.dev/v1",
    });

    const adapter = new OpenAIAdapter({ openai, model: "google/gemini-3-flash-preview" });
    const runtime = new CopilotRuntime();

    const handler = copilotRuntimeNodeHttpEndpoint({
      endpoint: "/copilotkit",
      runtime,
      serviceAdapter: adapter,
    });

    const response = await handler(req);

    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (e) {
    console.error("copilotkit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
