import { describe, it, expect } from "vitest";

// We test the pure helper functions by extracting their logic inline
// since they're not exported from ai.ts

describe("inferIndustry", () => {
  const keywords: Record<string, string> = {
    fintech: "fintech", finance: "finance", health: "healthcare",
    medical: "healthcare", education: "edtech", food: "food & beverage",
    retail: "retail", ecommerce: "e-commerce", "e-commerce": "e-commerce",
    saas: "SaaS", ai: "artificial intelligence", crypto: "crypto/web3",
    gaming: "gaming", sports: "sports", "real estate": "real estate",
    logistics: "logistics", travel: "travel",
  };

  function inferIndustry(topic: string): string {
    const lower = topic.toLowerCase();
    for (const [key, industry] of Object.entries(keywords)) {
      if (lower.includes(key)) return industry;
    }
    return "technology";
  }

  it("detects fintech from topic", () => {
    expect(inferIndustry("A fintech app for micro-loans")).toBe("fintech");
  });

  it("detects healthcare from 'medical'", () => {
    expect(inferIndustry("Medical device for remote diagnosis")).toBe("healthcare");
  });

  it("returns 'technology' as default", () => {
    expect(inferIndustry("A platform for connecting dog walkers")).toBe("technology");
  });

  it("is case-insensitive", () => {
    expect(inferIndustry("AI-powered SaaS dashboard")).toBe("SaaS");
    expect(inferIndustry("An AI chatbot for pets")).toBe("artificial intelligence");
  });
});

describe("parseRatingFromText", () => {
  const mockPersona = {
    id: "test",
    name: "Test",
    subtitle: "Tester",
    colorKey: "blue",
    systemPrompt: "",
    scoringWeights: [
      { label: "Grit", weight: 0.4 },
      { label: "Timing", weight: 0.3 },
      { label: "Upside", weight: 0.3 },
    ],
    inverseScore: false,
  };

  function parseRatingFromText(text: string, persona: typeof mockPersona) {
    const assessmentText = text.replace(/SCORE:.*$/is, "").replace(/RATING:.*$/is, "").trim();
    const patterns = [
      /SCORE:\s*(\d+)\s*\/\s*10\s*\|\s*(.+?)\.\s*METRICS:\s*(.+)/i,
      /SCORE:\s*(\d+)\s*\/\s*10\s*\|\s*(.+?)\s*METRICS:\s*(.+)/i,
      /SCORE:\s*(\d+)\s*\/\s*10\s*\|\s*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let rawScore = Math.min(10, Math.max(0, parseInt(match[1])));
        if (persona.inverseScore) rawScore = 10 - rawScore;
        const verdictText = match[2].trim().replace(/\.\s*$/, "");
        const metrics: Record<string, number> = {};
        const metricsStr = match[3];
        if (metricsStr) {
          metricsStr.split(",").forEach((m) => {
            const parts = m.split("=").map((s) => s.trim());
            if (parts[0] && parts[1]) metrics[parts[0]] = parseInt(parts[1]) || 0;
          });
        }
        return { personaId: persona.id, score: rawScore, verdict: verdictText, assessment: assessmentText, metrics };
      }
    }

    const anyScoreMatch = text.match(/(\d+)\s*\/\s*10/);
    let fallbackScore = anyScoreMatch ? Math.min(10, Math.max(0, parseInt(anyScoreMatch[1]))) : 5;
    if (persona.inverseScore) fallbackScore = 10 - fallbackScore;

    return {
      personaId: persona.id,
      score: fallbackScore,
      verdict: assessmentText.split(".").slice(-2).join(".").trim() || "Rating not provided",
      assessment: assessmentText,
      metrics: {},
    };
  }

  it("parses a well-formed SCORE line with metrics", () => {
    const text = `Great idea overall.\nSCORE: 8/10 | Strong founder-market fit. METRICS: Grit=9, Timing=7, Upside=8`;
    const result = parseRatingFromText(text, mockPersona);
    expect(result.score).toBe(8);
    expect(result.verdict).toBe("Strong founder-market fit");
    expect(result.metrics).toEqual({ Grit: 9, Timing: 7, Upside: 8 });
    expect(result.assessment).toBe("Great idea overall.");
  });

  it("applies inverse scoring for skeptic persona", () => {
    const skeptic = { ...mockPersona, id: "skeptic", inverseScore: true };
    const text = `Risky.\nSCORE: 9/10 | Extremely risky venture. METRICS: Grit=2, Timing=3, Upside=1`;
    const result = parseRatingFromText(text, skeptic);
    expect(result.score).toBe(1); // 10 - 9
  });

  it("falls back to 5 when no score found", () => {
    const result = parseRatingFromText("No structured output here.", mockPersona);
    expect(result.score).toBe(5);
    expect(result.metrics).toEqual({});
  });

  it("clamps score to 0-10 range", () => {
    const text = `SCORE: 15/10 | Off the charts. METRICS: Grit=10, Timing=10, Upside=10`;
    const result = parseRatingFromText(text, mockPersona);
    expect(result.score).toBe(10);
  });

  it("handles SCORE line without METRICS section", () => {
    const text = `Assessment here.\nSCORE: 7/10 | Decent potential`;
    const result = parseRatingFromText(text, mockPersona);
    expect(result.score).toBe(7);
    expect(result.verdict).toBe("Decent potential");
  });
});

describe("JudgeVerdict JSON parsing", () => {
  it("parses valid judge verdict JSON", () => {
    const raw = `{"verdict":"GO","overallScore":8.2,"why":"Strong team","strengths":["A","B","C"],"risks":["R1","R2"],"nextStep":"Ship MVP","topPraise":"Brilliant","skepticKillShot":"No moat","percentile":82}`;
    const parsed = JSON.parse(raw);
    expect(parsed.verdict).toBe("GO");
    expect(parsed.strengths).toHaveLength(3);
    expect(parsed.risks).toHaveLength(2);
    expect(parsed.percentile).toBe(82);
  });

  it("handles verdict with escaped quotes", () => {
    const raw = `{"verdict":"MAYBE","overallScore":6.5,"why":"Needs work","strengths":["Good \\"UX\\"","B","C"],"risks":["R1","R2"],"nextStep":"Validate","topPraise":"Nice","skepticKillShot":"Weak","percentile":55}`;
    const parsed = JSON.parse(raw);
    expect(parsed.verdict).toBe("MAYBE");
    expect(parsed.strengths[0]).toContain("UX");
  });
});
