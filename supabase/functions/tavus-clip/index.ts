import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TAVUS_BASE = "https://tavusapi.com/v2";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TAVUS_API_KEY = Deno.env.get('TAVUS_API_KEY');
  if (!TAVUS_API_KEY) {
    return new Response(JSON.stringify({ error: 'TAVUS_API_KEY is not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);

    // GET with conversation_id → get conversation status
    const conversationId = url.searchParams.get("conversation_id");
    if (req.method === 'GET' && conversationId) {
      const res = await fetch(`${TAVUS_BASE}/conversations/${conversationId}`, {
        headers: { 'x-api-key': TAVUS_API_KEY },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`[Tavus] Poll error [${res.status}]:`, JSON.stringify(data));
        return new Response(JSON.stringify({ error: 'Tavus poll failed', details: data }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          return new Response(JSON.stringify({ error: 'Tavus persona creation failed', details: data }), {
            status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        return new Response(JSON.stringify({ error: 'TAVUS_REPLICA_ID is not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      
      // Build conversation request
      const conversationBody: Record<string, unknown> = {
        replica_id,
        conversation_name: `debate-recap-${Date.now()}`,
        conversational_context: script,
        properties: {
          max_call_duration: 120,
        },
      };

      // Add persona_id if provided
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
        return new Response(JSON.stringify({ error: 'Tavus conversation creation failed', details: data }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[Tavus] Conversation created: ${data.conversation_id}, url: ${data.conversation_url}`);

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
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
