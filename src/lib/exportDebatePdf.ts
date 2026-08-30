import type { DebateExportInput } from "@/lib/exportDebate";

const ROUND_TITLES: Record<number, string> = {
  1: "Initial Reactions",
  2: "Risks & Critiques",
  3: "Founder Defense",
  4: "Final Statements",
};

const NAVY: [number, number, number] = [15, 23, 42];
const ORANGE: [number, number, number] = [249, 115, 22];
const SLATE: [number, number, number] = [100, 116, 139];

/**
 * Builds a print-ready PDF of the whole jury session: topic, panel, every round
 * of persona statements, the judge summary and the final grades.
 */
export async function downloadDebatePdf(input: DebateExportInput, filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const label = (id: string) => {
    const p = input.personas.find((x) => x.id === id);
    return { name: p?.name ?? "Expert", role: p?.subtitle ?? "Expert" };
  };

  const ensure = (needed: number) => {
    if (y + needed <= pageH - margin) return;
    doc.addPage();
    y = margin;
  };

  const text = (
    value: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; gap?: number } = {}
  ) => {
    const { size = 10, style = "normal", color = [30, 41, 59] as [number, number, number], gap = 6 } = opts;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(value, maxW) as string[];
    const lineH = size * 1.35;
    lines.forEach((line) => {
      ensure(lineH);
      doc.text(line, margin, y);
      y += lineH;
    });
    y += gap;
  };

  const rule = () => {
    ensure(14);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 76, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Startup Jury AI", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...ORANGE);
  doc.text("Full jury transcript & verdict", margin, 58);
  y = 104;

  text("The Pitch", { size: 13, style: "bold", color: NAVY, gap: 4 });
  text(input.topic || "Untitled pitch", { size: 11 });
  text(`Exported ${new Date().toLocaleString()}`, { size: 8, color: SLATE });
  rule();

  text("Jury Panel", { size: 13, style: "bold", color: NAVY, gap: 4 });
  input.personas.forEach((p) => text(`• ${p.name} — ${p.subtitle}`, { size: 10, gap: 2 }));
  y += 6;
  rule();

  [...input.rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .forEach((round) => {
      ensure(60);
      text(`Round ${round.roundNumber} — ${ROUND_TITLES[round.roundNumber] ?? "Debate"}`, {
        size: 13,
        style: "bold",
        color: NAVY,
        gap: 6,
      });
      round.messages.forEach((m) => {
        const { name, role } = label(m.personaId);
        text(`${name} (${role})`, { size: 10, style: "bold", color: ORANGE, gap: 2 });
        text(m.text.trim(), { size: 10, gap: 10 });
      });
      rule();
    });

  if (input.judgeVerdict) {
    const v = input.judgeVerdict;
    ensure(80);
    text("Judge's Summary", { size: 13, style: "bold", color: NAVY, gap: 4 });
    text(`Verdict: ${v.verdict}   |   Score: ${v.overallScore}/10   |   Percentile: ${v.percentile}`, {
      size: 10,
      style: "bold",
      gap: 6,
    });
    text(v.why, { size: 10 });
    if (v.strengths?.length) {
      text("Strengths", { size: 11, style: "bold", color: NAVY, gap: 2 });
      v.strengths.forEach((s) => text(`• ${s}`, { size: 10, gap: 2 }));
      y += 4;
    }
    if (v.risks?.length) {
      text("Risks", { size: 11, style: "bold", color: NAVY, gap: 2 });
      v.risks.forEach((s) => text(`• ${s}`, { size: 10, gap: 2 }));
      y += 4;
    }
    text(`Top praise: ${v.topPraise}`, { size: 10, style: "italic", gap: 2 });
    text(`Sharpest critique: ${v.skepticKillShot}`, { size: 10, style: "italic", gap: 2 });
    text(`Next step: ${v.nextStep}`, { size: 10, style: "italic" });
    rule();
  }

  if (input.ratings.length) {
    ensure(60);
    text("Final Panel Grades", { size: 13, style: "bold", color: NAVY, gap: 6 });
    input.ratings.forEach((r) => {
      const { name, role } = label(r.personaId);
      text(`${name} (${role}) — ${r.score}/10 · ${r.verdict}`, {
        size: 10,
        style: "bold",
        gap: 2,
      });
      if (r.assessment) text(r.assessment, { size: 9, color: SLATE, gap: 8 });
    });
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(`startupjuryai.com  ·  Page ${i} of ${pages}`, margin, pageH - 24);
  }

  doc.save(filename);
}
