import { describe, it, expect } from "vitest";
import {
  buildClosingRule,
  buildRoundNPrompt,
  buildRound1Prompt,
  FORBIDDEN_FINAL_ROUND_PHRASES,
  isFinalRoundNumber,
} from "@/lib/ai";
import type { Persona, Round } from "@/types/debate";

const personas: Persona[] = [
  {
    id: "marcus",
    name: "Marcus",
    subtitle: "VC",
    colorKey: "blue",
    emoji: "💼",
    vibe: "sharp",
    systemPrompt: "vc",
    scoringWeights: [{ label: "Upside", weight: 1 }],
  },
];

const previousRound: Round = {
  roundNumber: 1,
  messages: [{ personaId: "marcus", text: "Interesting but the TAM is unclear." }],
};

function promptFor(roundNumber: number) {
  return buildRoundNPrompt("An AI jury for founders", roundNumber, previousRound, personas, "We have 20 paying pilots.").userPrompt;
}

describe("round classification", () => {
  it("treats round 4 and beyond as final", () => {
    expect(isFinalRoundNumber(3)).toBe(false);
    expect(isFinalRoundNumber(4)).toBe(true);
    expect(isFinalRoundNumber(5)).toBe(true);
  });
});

describe("rounds 1-3 stay question-driven", () => {
  it("round 1 asks pointed questions", () => {
    expect(buildRound1Prompt("idea")).toMatch(/questions for the founder/i);
  });

  it.each([2, 3])("round %i closes with questions for the founder", (round) => {
    const prompt = promptFor(round);
    expect(prompt).toMatch(/End with 1-2 new questions for the founder\./);
    expect(prompt).not.toMatch(/FINAL round/i);
    expect(buildClosingRule(round)).toBe("End with 1-2 new questions for the founder.");
  });
});

describe("round 4 is finale-style", () => {
  const prompt = promptFor(4);
  const closing = buildClosingRule(4);

  it("labels the round as Final Statements", () => {
    expect(prompt).toContain("Round 4 — Final Statements");
  });

  it("states the founder gets no further turn", () => {
    expect(closing).toMatch(/will NOT have another chance to respond/);
    expect(closing).toMatch(/Do NOT ask the founder anything/);
    expect(closing).toMatch(/do NOT imply that another round/);
  });

  it("enforces the conclusive structure", () => {
    expect(closing).toMatch(/final, definitive position/);
    expect(closing).toMatch(/strongest reason/);
    expect(closing).toMatch(/biggest remaining risk/);
    expect(closing).toMatch(/one piece of direct advice/);
    expect(closing).toMatch(/conclusive language/);
    expect(closing).toMatch(/Never end on a question mark/);
  });

  it("contains no follow-up / next-turn instructions", () => {
    for (const phrase of FORBIDDEN_FINAL_ROUND_PHRASES) {
      // Allowed only inside an explicit prohibition; the instruction text itself must not request it.
      expect(prompt.toLowerCase()).not.toContain(`end with 1-2 ${phrase}`);
      expect(prompt.toLowerCase()).not.toContain(`ask ${phrase}`);
    }
    expect(prompt).not.toMatch(/End with 1-2 new questions/);
    expect(prompt).not.toMatch(/next round/i);
  });
});
