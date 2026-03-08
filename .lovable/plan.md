

## Problem

When a user completes the full flow (rounds → grades → verdict) and then navigates back via the RoundTimeline, clicking "Grades" or "Verdict" **re-generates** all the data from scratch instead of displaying the already-computed results. This triggers unnecessary AI calls, which then hit the evaluation limit (429 error).

The root cause is in `Index.tsx`:
- `onGradesClick` → `handleGenerateRatings` always wipes ratings (`ratings: []`) and regenerates
- `onJudgeClick` → `handleJudge` always regenerates the verdict
- Clicking a round sets `phase: "debating"`, hiding ratings/verdict — but there's no way to **view** them again without regenerating

## Solution

Make the timeline navigation **view-only** when data already exists:

### 1. `Index.tsx` — Add view-only navigation handlers

- **New `handleViewGrades` function**: If `state.ratings.length > 0`, just set `phase: "final-ratings"` (no regeneration). If no ratings exist, fall through to `handleGenerateRatings`.
- **New `handleViewJudge` function**: If `state.judgeVerdict` exists, just set `phase: "judge"` (no regeneration). If no verdict exists, fall through to `handleJudge`.
- Wire these new handlers to `RoundTimeline`'s `onGradesClick` and `onJudgeClick` props instead of the generation functions.

### 2. `Index.tsx` — Fix round navigation to preserve phase context

When clicking a round number (line 617-624), currently it forces `phase: "debating"`. This should still set `currentRoundNumber` but also show the debate table. The existing logic already handles this correctly since the debate table renders when phase is `"debating"`. No change needed here — rounds already work as view-only since round data is stored in `state.rounds`.

### 3. `RoundTimeline.tsx` — Allow navigating back to Grades/Verdict after viewing rounds

Currently `gradesEnabled` and `judgeEnabled` are computed based on phase. When viewing a round (phase="debating"), verdict/grades buttons should still be clickable if data exists. Pass additional props:

- Add `hasRatings: boolean` and `hasVerdict: boolean` props
- Update `gradesEnabled`: also true when `hasRatings` is true
- Update `judgeEnabled`: also true when `hasVerdict` is true

### Files changed
- `src/pages/Index.tsx` — Add `handleViewGrades`, `handleViewJudge`, pass new props to RoundTimeline
- `src/components/RoundTimeline.tsx` — Accept `hasRatings`/`hasVerdict` props, update enabled logic

