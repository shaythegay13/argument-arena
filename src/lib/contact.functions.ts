import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(2000),
  userId: z.string().uuid().nullable().optional(),
});

export interface SubmitContactMessageResult {
  ok: boolean;
}

/**
 * Stores a contact form submission. Works for signed-out visitors too:
 * the row is written server-side with the service role and user_id left null.
 */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitContactMessageResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("contact_messages").insert({
      user_id: data.userId ?? null,
      name: data.name,
      email: data.email,
      message: data.message,
    });

    if (error) {
      console.error("[submitContactMessage] insert failed:", error.message);
      throw new Error("Could not send your message. Please try again.");
    }

    return { ok: true };
  });
