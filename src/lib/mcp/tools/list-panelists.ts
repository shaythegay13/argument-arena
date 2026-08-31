import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_panelists",
  title: "List my panelists",
  description:
    "List the signed-in user's saved jury panelists with their title, firm, expertise and bio.",
  inputSchema: {
    active_only: z
      .boolean()
      .optional()
      .describe("Only return panelists marked active (default true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ active_only }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("panelists")
      .select(
        "id, name, title, firm, credentials, expertise, bio, background, signature_style, base_persona_id, is_active, created_at",
      )
      .order("created_at", { ascending: true });
    if (active_only !== false) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { panelists: data ?? [] },
    };
  },
});
