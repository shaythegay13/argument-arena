import { describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ControlPanel from "@/components/ControlPanel";
import FinalStatementsReview from "@/components/FinalStatementsReview";
import { PERSONAS } from "@/data/personas";
import type { Round } from "@/types/debate";

const MAX_ROUNDS = 4;
const personas = PERSONAS.slice(0, 3);

function renderRound(currentRound: number) {
  cleanup();
  return render(
    <ControlPanel
      topic="An AI jury that grades startup pitches"
      onTopicChange={() => {}}
      selectedPersonas={personas}
      onTogglePersona={() => {}}
      onStartDebate={() => {}}
      onNextRound={() => {}}
      onJudgeSummary={() => {}}
      hasStarted={currentRound > 0}
      currentRound={currentRound}
      maxRounds={MAX_ROUNDS}
      isGenerating={false}
      isGeneratingSummary={false}
    />
  );
}

describe("end-to-end round progression 1 -> 4", () => {
  it("keeps Next Round available through rounds 1-3", () => {
    for (const round of [1, 2, 3]) {
      renderRound(round);
      const next = screen.getByRole("button", { name: new RegExp(`Next Round \\(${round + 1}/4\\)`) });
      expect(next).toBeEnabled();
      expect(screen.queryByRole("button", { name: /Get Panel Grades/i })).toBeNull();
    }
    cleanup();
  });

  it("on round 4 the only enabled action is Get Panel Grades", () => {
    renderRound(MAX_ROUNDS);

    const grades = screen.getByRole("button", { name: /Get Panel Grades/i });
    expect(grades).toBeEnabled();

    // No "Next Round (5/4)" advance button exists; the placeholder is disabled.
    expect(screen.queryByRole("button", { name: /Next Round/i })).toBeNull();
    const finalStatements = screen.getByRole("button", { name: /Final Statements complete/i });
    expect(finalStatements).toBeDisabled();

    const enabled = screen.getAllByRole("button").filter((b) => !(b as HTMLButtonElement).disabled);
    expect(enabled).toEqual([grades]);
    cleanup();
  });
});

describe("Review Final Statements gate", () => {
  const round: Round = {
    roundNumber: 4,
    messages: personas.map((p) => ({ personaId: p.id, text: `${p.name}'s closing position on the pitch.` })),
  };

  it("summarizes every juror and unlocks grading once acknowledged", async () => {
    const onAcknowledge = vi.fn();
    render(
      <FinalStatementsReview personas={personas} round={round} acknowledged={false} onAcknowledge={onAcknowledge} />
    );

    for (const p of personas) {
      expect(screen.getByText(new RegExp(`^${p.name}`))).toBeTruthy();
    }

    await userEvent.click(screen.getByRole("button", { name: /reviewed the final statements/i }));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);

    cleanup();
    render(
      <FinalStatementsReview personas={personas} round={round} acknowledged onAcknowledge={onAcknowledge} />
    );
    expect(screen.getByText(/grading unlocked/i)).toBeTruthy();
    cleanup();
  });
});
