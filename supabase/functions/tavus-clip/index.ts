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
    const videoId = url.searchParams.get("video_id");

    // GET with video_id param → poll status
    if (req.method === 'GET' && videoId) {
      const res = await fetch(`${TAVUS_BASE}/videos/${videoId}`, {
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
        status: data.status,
        hosted_url: data.hosted_url || null,
        stream_url: data.stream_url || null,
        download_url: data.download_url || null,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST → create video
    if (req.method === 'POST') {
      const { script } = await req.json();

      const replica_id = Deno.env.get('TAVUS_REPLICA_ID');
      if (!replica_id) {
        return new Response(JSON.stringify({ error: 'TAVUS_REPLICA_ID is not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requestBody = {
        script,
        replica_id,
        video_name: `debate-recap-${Date.now()}`,
      };
      console.log(`[Tavus] Creating video with replica_id=${replica_id}, script length=${script.length}`);
      console.log(`[Tavus] API key starts with: ${TAVUS_API_KEY.substring(0, 8)}...`);

      const res = await fetch(`${TAVUS_BASE}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TAVUS_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`[Tavus] Create error [${res.status}]:`, JSON.stringify(data));
        return new Response(JSON.stringify({ error: 'Tavus create failed', details: data }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        video_id: data.video_id,
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
