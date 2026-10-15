/** Static homepage preview. These are not live results and are not a count of evaluations. */

export const HOMEPAGE_STATS = [
  { value: "16", label: "AI personas" },
  { value: "< 5 min", label: "Per verdict" },
  { value: "8", label: "Judges per panel" },
] as const;

export const SAMPLE_VERDICT = {
  disclosure: "Example preview — not a real evaluation. Scores use the 0–10 juror scale.",
  topic: "AI-powered onboarding tool for SaaS companies",
  verdict: "GO" as const,
  /** Average-style headline on the same 0–10 scale the jury actually returns. */
  score: 7.4,
  scoreScale: 10 as const,
  summary:
    "Strong market timing — SaaS churn is a $1.6T problem and onboarding is the #1 lever. The AI angle is differentiated. Main risk is enterprise sales cycle length vs. your runway.",
  strengths: ["Clear, quantifiable pain point", "Viral product-led growth loop", "Defensible data moat over time"],
  risks: [
    "Crowded market — Appcues, Pendo, Intercom",
    "High enterprise CAC vs. SMB LTV",
    "Integration complexity slows GTM",
  ],
  judges: [
    { role: "Angel", score: 8.2, color: "text-primary" },
    { role: "VC", score: 7.4, color: "text-accent" },
    { role: "Skeptic", score: 6.1, color: "text-verdict-nogo" },
    { role: "Analyst", score: 7.8, color: "text-muted-foreground" },
  ],
} as const;

export function formatJurorScore(score: number): string {
  return score.toFixed(1);
}
