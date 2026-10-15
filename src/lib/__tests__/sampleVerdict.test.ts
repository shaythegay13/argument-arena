import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_STATS, SAMPLE_VERDICT, formatJurorScore } from "@/data/sampleVerdict";

describe("homepage sample", () => {
  it("does not claim an evaluation count and scores jurors on a 0–10 scale", () => {
    expect(HOMEPAGE_STATS.map((stat) => stat.value)).not.toContain("2,400+");
    expect(SAMPLE_VERDICT.scoreScale).toBe(10);
    expect(SAMPLE_VERDICT.score).toBeGreaterThanOrEqual(0);
    expect(SAMPLE_VERDICT.score).toBeLessThanOrEqual(10);
    expect(SAMPLE_VERDICT.disclosure.toLowerCase()).toContain("example");
    expect(SAMPLE_VERDICT.disclosure).toContain("0–10");
    for (const judge of SAMPLE_VERDICT.judges) {
      expect(judge.score).toBeGreaterThanOrEqual(0);
      expect(judge.score).toBeLessThanOrEqual(10);
      expect(formatJurorScore(judge.score)).toBe(judge.score.toFixed(1));
    }
  });

  it("is the copy rendered on the landing page", () => {
    const landing = readFileSync("src/pages/Landing.tsx", "utf8");
    expect(landing).toContain("SAMPLE_VERDICT");
    expect(landing).toContain("HOMEPAGE_STATS");
    expect(landing).not.toContain("2,400+");
    expect(landing).not.toContain("/100");
  });
});
