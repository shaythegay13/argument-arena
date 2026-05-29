import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TAVUS_BASE = "https://tavusapi.com/v2";
const MAX_SCRIPT_LENGTH = 3000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TAVUS_API_KEY = Deno.env.get('TAVUS_API_KEY');
    if (!TAVUS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);

    // GET with conversation_id → get conversation status
    const conversationId = url.searchParams.get("conversation_id");
    if (req.method === 'GET' && conversationId) {
      if (!/^[a-zA-Z0-9_-]+$/.test(conversationId)) {
        return new Response(JSON.stringify({ error: 'Invalid conversation_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(`${TAVUS_BASE}/conversations/${conversationId}`, {
        headers: { 'x-api-key': TAVUS_API_KEY },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`[Tavus] Poll error [${res.status}]:`, JSON.stringify(data));
        return new Response(JSON.stringify({ error: 'Failed to check conversation status' }), {
          status: res.status >= 500 ? 502 : res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        conversation_id: data.conversation_id,
        status: data.status,
        conversation_url: data.conversation_url || null,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST → create conversation
    if (req.method === 'POST') {
      const { script, action, persona_id } = await req.json();

      // Validate script
      if (script !== undefined) {
        if (typeof script !== 'string' || script.length > MAX_SCRIPT_LENGTH) {
          return new Response(JSON.stringify({ error: `Invalid or too long script (max ${MAX_SCRIPT_LENGTH} chars)` }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Action: create persona
      if (action === 'create-persona') {
        const res = await fetch(`${TAVUS_BASE}/personas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': TAVUS_API_KEY,
          },
          body: JSON.stringify({
            persona_name: `debate-host-${Date.now()}`,
            system_prompt: `You are the host of a startup debate panel called "Startup Jury". You deliver concise round recaps summarizing what the expert panelists said. Be energetic, professional, and brief. Speak directly to the founder/viewer. Here is the recap you should deliver:\n\n${script}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(`[Tavus] Create persona error [${res.status}]:`, JSON.stringify(data));
          return new Response(JSON.stringify({ error: 'Failed to create persona' }), {
            status: res.status >= 500 ? 502 : res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.log(`[Tavus] Persona created: ${data.persona_id}`);
        return new Response(JSON.stringify({ persona_id: data.persona_id }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default action: create conversation
      const replica_id = Deno.env.get('TAVUS_REPLICA_ID');
      if (!replica_id) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const conversationBody: Record<string, unknown> = {
        replica_id,
        conversation_name: `debate-recap-${Date.now()}`,
        conversational_context: script,
        properties: {
          max_call_duration: 120,
        },
      };

      if (persona_id) {
        conversationBody.persona_id = persona_id;
      }

      console.log(`[Tavus] Creating conversation with replica_id=${replica_id}`);

      const res = await fetch(`${TAVUS_BASE}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TAVUS_API_KEY,
        },
        body: JSON.stringify(conversationBody),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`[Tavus] Create conversation error [${res.status}]:`, JSON.stringify(data));
        return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
          status: res.status >= 500 ? 502 : res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[Tavus] Conversation created: ${data.conversation_id}`);

      return new Response(JSON.stringify({
        conversation_id: data.conversation_id,
        conversation_url: data.conversation_url,
        status: data.status,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Tavus] Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
