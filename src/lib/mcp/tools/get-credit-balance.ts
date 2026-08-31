import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_credit_balance",
  title: "Get evaluation credits",
  description:
    "Return how many Startup Jury evaluation credits the signed-in user has left. One credit runs a full four-round jury evaluation.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_credits")
      .select("credits, updated_at")
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const credits = data?.credits ?? 0;
    return {
      content: [
        {
          type: "text",
          text: `${credits} evaluation credit${credits === 1 ? "" : "s"} remaining.`,
        },
      ],
      structuredContent: { credits, updated_at: data?.updated_at ?? null },
    };
  },
});
