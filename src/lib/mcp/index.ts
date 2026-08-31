import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDebatesTool from "./tools/list-debates";
import getDebateTool from "./tools/get-debate";
import listPanelistsTool from "./tools/list-panelists";
import createPanelistTool from "./tools/create-panelist";
import getCreditBalanceTool from "./tools/get-credit-balance";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef =
  import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "startup-jury-ai",
  title: "Startup Jury AI",
  version: "0.1.0",
  instructions:
    "Tools for Startup Jury AI, where founders pitch to an AI jury of investor personas across four rounds. Use `list_debates` and `get_debate` to review a founder's past evaluations, rounds, grades and verdicts; `list_panelists` and `create_panelist` to manage their custom jury roster; and `get_credit_balance` to check remaining evaluation credits. All tools act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listDebatesTool,
    getDebateTool,
    listPanelistsTool,
    createPanelistTool,
    getCreditBalanceTool,
  ],
});
