import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_panelist",
  title: "Create panelist",
  description:
    "Add a new jury panelist to the signed-in user's roster so it can be seated in a custom panel. Subject to the user's panelist slot allowance.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Panelist full name."),
    title: z.string().trim().optional().describe("Role, e.g. 'General Partner'."),
    firm: z.string().trim().optional().describe("Firm or company."),
    credentials: z.string().trim().optional().describe("Short credentials line."),
    bio: z.string().trim().optional().describe("Short biography."),
    background: z.string().trim().optional().describe("Investing/operating background."),
    signature_style: z
      .string()
      .trim()
      .optional()
      .describe("How this panelist questions founders."),
    expertise: z
      .array(z.string())
      .optional()
      .describe("Expertise tags, e.g. ['fintech','GTM']."),
    base_persona_id: z
      .string()
      .trim()
      .optional()
      .describe("Built-in archetype id this panelist is based on."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("panelists")
      .insert({
        user_id: ctx.getUserId()!,
        name: input.name,
        title: input.title ?? null,
        firm: input.firm ?? null,
        credentials: input.credentials ?? null,
        bio: input.bio ?? null,
        background: input.background ?? null,
        signature_style: input.signature_style ?? null,
        expertise: input.expertise ?? [],
        ...(input.base_persona_id ? { base_persona_id: input.base_persona_id } : {}),
      })
      .select()
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { panelist: data },
    };
  },
});
