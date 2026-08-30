import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_TEXT_LENGTH = 2000;

const ALLOWED_VOICE_IDS = new Set([
  "JBFqnCBsd6RMkjVDRZzb", // George (default)
]);

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/elevenlabs-tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return jsonError("Unauthorized", 401);
          }

          const SUPABASE_URL = process.env["SUPABASE_URL"];
          const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return jsonError("Server configuration error", 500);
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
          const token = authHeader.replace("Bearer ", "");
          const { data: userData, error: userError } = await supabase.auth.getUser(token);
          if (userError || !userData?.user) {
            return jsonError("Unauthorized", 401);
          }

          const ELEVENLABS_API_KEY = process.env["ELEVENLABS_TTS_API_KEY"] || process.env["ELEVENLABS_API_KEY"];
          if (!ELEVENLABS_API_KEY) {
            return jsonError("Server configuration error", 500);
          }

          const { text, voiceId } = await request.json();

          if (!text || typeof text !== "string" || !text.trim()) {
            return jsonError("Text is required", 400);
          }

          if (text.length > MAX_TEXT_LENGTH) {
            return jsonError(`Text too long (max ${MAX_TEXT_LENGTH} chars)`, 400);
          }

          const voice = voiceId && ALLOWED_VOICE_IDS.has(voiceId) ? voiceId : "JBFqnCBsd6RMkjVDRZzb";

          console.log(`[ElevenLabs TTS] Generating speech for ${text.length} chars with voice ${voice}`);

          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.6,
                  similarity_boost: 0.75,
                  style: 0.4,
                  use_speaker_boost: true,
                },
              }),
            }
          );

          if (!response.ok) {
            const err = await response.text();
            console.error(`[ElevenLabs TTS] Error [${response.status}]:`, err);
            return jsonError("TTS generation failed", response.status >= 500 ? 502 : response.status);
          }

          const audioBuffer = await response.arrayBuffer();
          console.log(`[ElevenLabs TTS] Generated ${audioBuffer.byteLength} bytes of audio`);

          return new Response(audioBuffer, {
            headers: {
              "Content-Type": "audio/mpeg",
            },
          });
        } catch (error) {
          console.error("[ElevenLabs TTS] Error:", error);
          return jsonError("Internal server error", 500);
        }
      },
    },
  },
});
