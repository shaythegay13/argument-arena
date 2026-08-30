import type { JudgeVerdict, Persona, PersonaRating, Round } from "@/types/debate";

export interface DebateExportInput {
  topic: string;
  personas: Persona[];
  rounds: Round[];
  ratings: PersonaRating[];
  judgeVerdict: JudgeVerdict | null;
  sessionId?: string | undefined;
}

const ROUND_TITLES: Record<number, string> = {
  1: "Initial Reactions",
  2: "Risks & Critiques",
  3: "Founder Defense",
  4: "Final Statements",
};

function personaLabel(personas: Persona[], id: string) {
  const p = personas.find((x) => x.id === id);
  return { name: p?.name ?? "Expert", subtitle: p?.subtitle ?? "Expert" };
}

export function buildDebateJSON(input: DebateExportInput): string {
  const { topic, personas, rounds, ratings, judgeVerdict, sessionId } = input;

  const payload = {
    source: "Startup Jury AI",
    exportedAt: new Date().toISOString(),
    sessionId: sessionId ?? null,
    topic,
    jury: personas.map((p) => ({ id: p.id, name: p.name, role: p.subtitle })),
    rounds: [...rounds]
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((round) => ({
        roundNumber: round.roundNumber,
        title: ROUND_TITLES[round.roundNumber] ?? `Round ${round.roundNumber}`,
        responses: round.messages.map((m) => {
          const { name, subtitle } = personaLabel(personas, m.personaId);
          return { jurorId: m.personaId, juror: name, role: subtitle, response: m.text };
        }),
      })),
    scores: ratings.map((r) => {
      const { name, subtitle } = personaLabel(personas, r.personaId);
      return {
        jurorId: r.personaId,
        juror: name,
        role: subtitle,
        score: r.score,
        verdict: r.verdict,
        assessment: r.assessment,
        metrics: r.metrics,
      };
    }),
    judgeSummary: judgeVerdict
      ? {
          verdict: judgeVerdict.verdict,
          overallScore: judgeVerdict.overallScore,
          percentile: judgeVerdict.percentile,
          why: judgeVerdict.why,
          strengths: judgeVerdict.strengths,
          risks: judgeVerdict.risks,
          nextStep: judgeVerdict.nextStep,
          topPraise: judgeVerdict.topPraise,
          skepticKillShot: judgeVerdict.skepticKillShot,
        }
      : null,
  };

  return JSON.stringify(payload, null, 2);
}

export function buildDebateMarkdown(input: DebateExportInput): string {
  const { topic, personas, rounds, ratings, judgeVerdict } = input;
  const lines: string[] = [];

  lines.push("# Startup Jury AI — Full Debate Transcript", "");
  lines.push(`**Idea:** ${topic}`, "");
  lines.push(`**Exported:** ${new Date().toLocaleString()}`, "");
  lines.push("## Jury Panel", "");
  personas.forEach((p) => lines.push(`- **${p.name}** — ${p.subtitle}`));
  lines.push("");

  [...rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .forEach((round) => {
      lines.push(
        `## Round ${round.roundNumber} — ${ROUND_TITLES[round.roundNumber] ?? "Debate"}`,
        ""
      );
      round.messages.forEach((m) => {
        const { name, subtitle } = personaLabel(personas, m.personaId);
        lines.push(`### ${name} (${subtitle})`, "", m.text.trim(), "");
      });
    });

  if (ratings.length) {
    lines.push("## Panel Scores", "", "| Juror | Role | Score | Verdict |", "| --- | --- | --- | --- |");
    ratings.forEach((r) => {
      const { name, subtitle } = personaLabel(personas, r.personaId);
      lines.push(`| ${name} | ${subtitle} | ${r.score}/10 | ${r.verdict.replace(/\|/g, "/")} |`);
    });
    lines.push("");
  }

  if (judgeVerdict) {
    lines.push("## Judge's Summary", "");
    lines.push(`**Verdict:** ${judgeVerdict.verdict} · **Score:** ${judgeVerdict.overallScore}/10 · **Percentile:** ${judgeVerdict.percentile}`, "");
    lines.push(judgeVerdict.why, "");
    lines.push("**Strengths**", "");
    judgeVerdict.strengths.forEach((s) => lines.push(`- ${s}`));
    lines.push("", "**Risks**", "");
    judgeVerdict.risks.forEach((s) => lines.push(`- ${s}`));
    lines.push("", `**Top praise:** ${judgeVerdict.topPraise}`, "");
    lines.push(`**Sharpest critique:** ${judgeVerdict.skepticKillShot}`, "");
    lines.push(`**Next step:** ${judgeVerdict.nextStep}`, "");
  }

  return lines.join("\n");
}

export function slugifyTopic(topic: string): string {
  return (
    topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "startup-jury"
  );
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
