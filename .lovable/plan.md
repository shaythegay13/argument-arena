

## Fix: Remove CopilotKit to Eliminate Blank Screen Crash

### Problem
CopilotKit v1.51.4 crashes the app with "Agent 'default' not found after runtime sync" during its agent discovery protocol. Multiple attempts to fix the `/info` endpoint and client-side agent registration have failed due to version incompatibilities between the client SDK and the edge function runtime.

### Impact Assessment
CopilotKit is used for two things in this project:
1. **`useCopilotReadable` hooks** in `useDebateAgentState.ts` -- exposes debate state as readable context for a CopilotKit agent. This is observability/debug tooling only.
2. **`emitAgUIEvent` function** -- logs events to the console. Does not depend on CopilotKit at all.

Neither feature affects the core debate flow, AI generation, Tavus video clips, voice input, or any user-facing functionality.

### Plan

**1. Remove CopilotKit wrapper from `src/App.tsx`**
- Remove the `CopilotKit` provider and its import
- Remove the `@copilotkit/react-ui/styles.css` import
- Keep all other providers (QueryClient, Tooltip, Router) unchanged

**2. Simplify `src/hooks/useDebateAgentState.ts`**
- Remove all `useCopilotReadable` calls
- Keep the `useEffect` console logging (useful for debugging)
- Keep the `emitAgUIEvent` function (no CopilotKit dependency)

**3. Clean up**
- The `copilotkit` edge function can remain deployed (harmless) or be removed later
- No other files reference CopilotKit

### Result
The app will load without the blank screen crash. All debate functionality, AI generation, Tavus video recaps, and voice input will continue working exactly as before.

