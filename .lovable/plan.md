

# Plan: Adapt Startup Jury AI to PRD Specifications

## Current State vs PRD Gap Analysis

The app already covers ~70% of the PRD. Here's what needs to change:

### Already Implemented (No Changes Needed)
- AI persona debate (8 personas, 4 rounds)
- GO / MAYBE / NO-GO verdict with 0-10 scoring
- Session history dashboard
- Share & iterate flow
- Auth (email-based)
- Free tier with limits

### Changes Required

---

## 1. Enhanced Idea Submission Form

**Current**: Single textarea for topic.
**PRD wants**: Structured form with fields for Problem, Solution, Target Market, and Monetization, plus optional file uploads (images/PDFs like wireframes).

**Plan**:
- Replace the single `topic` textarea in `Index.tsx` setup phase with a multi-field form (Problem, Solution, Target Market, Monetization Strategy)
- Concatenate fields into a structured prompt string for the AI pipeline (no schema change needed -- `topic` column stores the combined text)
- Add optional image/PDF upload via a storage bucket for attachments
- Add AI completeness check: if key fields are empty, show inline suggestions prompting for missing details

---

## 2. Scoring System Alignment

**Current**: 0-10 scale with persona-specific weighted metrics (Grit, TAM, Moat, etc.)
**PRD wants**: 0-100 scale with standardized criteria (30% Market Size, 25% Competition, 20% Feasibility, 15% Monetization, 10% Innovation)

**Plan**: Keep the current 0-10 persona-specific scoring (it's more nuanced and differentiated than the PRD's generic weights). Display as percentage (score * 10) on the results page to match the PRD's 0-100 feel. No structural changes -- the current approach is superior for multi-persona evaluation.

---

## 3. PDF Export for Reports

**Current**: Not implemented (listed as Pro feature but no code).
**PRD wants**: Shareable/downloadable reports.

**Plan**:
- Add a "Download Report" button on the Result page and post-verdict screen
- Use browser-native `window.print()` with a print-optimized CSS stylesheet, or generate a PDF client-side using a lightweight library
- Gate behind Pro tier

---

## 4. Stripe Integration for Pro Plan

**Current**: `localStorage.setItem("startup_jury_pro", "true")` placeholder.
**PRD wants**: Real monetization ($19/mo or $9/mo freemium).

**Plan**:
- Enable Stripe via the Stripe connector
- Create a `subscriptions` table to track active plans
- Add a checkout flow in `UpgradeModal.tsx` that creates a Stripe Checkout session
- Add a webhook edge function to handle subscription lifecycle events
- Replace all `localStorage` Pro checks with database subscription lookups

---

## 5. Idea Iteration / Re-submission

**Current**: "Refine & Re-Test" button resets the debate with the same topic text.
**PRD wants**: Users can tweak and re-submit for new debates, with history tracking.

**Plan**: Already implemented. The "Refine" button preserves the topic and starts fresh. Each re-submission creates a new session in history. No changes needed.

---

## 6. OAuth / Social Login

**Current**: Email/password only.
**PRD wants**: Google OAuth.

**Plan**:
- Enable Google OAuth provider via the auth configuration
- Add a "Sign in with Google" button on the Auth page
- Configure redirect URLs

---

## 7. Analytics Tracking

**Current**: No analytics.
**PRD wants**: Track debate views, score distributions, user retention.

**Plan**:
- Add basic analytics by creating a `user_analytics` edge function that logs events to a new `analytics_events` table
- Track key events: debate_started, debate_completed, verdict_viewed, result_shared
- Add a simple stats section to the Dashboard showing personal trends (debates over time, average scores)

---

## 8. AI Completeness Validation on Submission

**Current**: Only checks if topic text is non-empty.
**PRD wants**: AI checks for completeness; prompts for missing details.

**Plan**:
- After the user fills in the structured form, run a quick AI call (using gemini-2.5-flash-lite) to check if the submission has enough detail
- If incomplete, show inline suggestions like "Consider adding your target customer segment" before starting the debate
- Make this optional/skippable so it doesn't block fast users

---

## Implementation Priority (Recommended Order)

1. **Enhanced Idea Submission Form** -- highest UX impact, purely frontend
2. **PDF Export** -- commonly requested, straightforward
3. **Stripe Integration** -- unlocks revenue
4. **Google OAuth** -- reduces signup friction
5. **AI Completeness Validation** -- polish feature
6. **Analytics Tracking** -- growth infrastructure
7. **Scoring display as 0-100** -- cosmetic alignment with PRD

---

## Files to Modify

| Area | Files |
|------|-------|
| Submission form | `src/pages/Index.tsx`, new `src/components/IdeaSubmissionForm.tsx` |
| PDF export | `src/pages/ResultPage.tsx`, `src/components/JudgeVerdictCard.tsx` |
| Stripe | `src/components/UpgradeModal.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`, new edge function, new DB table |
| OAuth | `src/pages/Auth.tsx`, auth config |
| AI validation | New edge function or branch in `debate-ai`, `src/pages/Index.tsx` |
| Analytics | New DB table, new edge function, `src/pages/Index.tsx`, `src/pages/ResultPage.tsx` |

