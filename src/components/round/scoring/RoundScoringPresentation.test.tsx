import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RoundScoringActionPanel from "./RoundScoringActionPanel";
import RoundScrambleScoringSection from "./RoundScrambleScoringSection";
import RoundPlayerScoringSection from "./RoundPlayerScoringSection";
import type { ScoreRow } from "../../../pages/roundScoringLogic";

const holeMeta = Array.from({ length: 18 }, (_, index) => ({
  holeNumber: index + 1,
  par: 4,
  handicap: index + 1,
  strokes: null,
}));

describe("Round scoring presentation components", () => {
  it("renders the scoring action buttons for an editable player round", () => {
    render(
      <RoundScoringActionPanel
        location="top"
        scoringReadOnly={false}
        finalized={false}
        canFinalize={true}
        hasIncompleteScorecards={false}
        isScramble={false}
        readinessBlocksScoring={false}
        showSaveButton={true}
        saveDisabled={false}
        saveButtonLabel="Save Scores"
        saving={false}
        refreshHandicapsDisabled={false}
        refreshingHandicaps={false}
        hasChanges={true}
        finalizeDisabled={false}
        finalizing={false}
        handleSaveScores={vi.fn(async () => {})}
        handleRefreshHandicaps={vi.fn(async () => {})}
        handleFinalizeRound={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByRole("button", { name: "Save Scores" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh Handicaps" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize Round" })).toBeInTheDocument();
  });

  it("renders scramble teams in final-score mode", () => {
    render(
      <RoundScrambleScoringSection
        scrambleGameLabel="4-Person Scramble"
        scrambleModeLabel="Scoring Mode: Total Team Score"
        scrambleEntryMode="TOTAL"
        scrambleRows={[
          {
            roundTeamId: 7,
            teamName: "Team Seven",
            playerNames: ["Ann", "Bob"],
            totalScore: "72",
            holes: Array(18).fill(""),
          },
        ]}
        headerHoles={holeMeta}
        saving={false}
        finalizing={false}
        scoringReadOnly={false}
        finalized={false}
        updateScrambleMode={vi.fn()}
        updateScrambleTotal={vi.fn()}
        setInputRef={vi.fn()}
        handleScrambleHoleChange={vi.fn()}
        handleHoleKeyDown={vi.fn()}
      />,
    );

    expect(screen.getByText("Team Seven")).toBeInTheDocument();
    expect(screen.getByDisplayValue("72")).toBeInTheDocument();
    expect(screen.getByText("Ann / Bob")).toBeInTheDocument();
  });

  it("renders a player score row with tee and totals", () => {
    const row: ScoreRow = {
      scorecardId: 11,
      playerId: 22,
      playerName: "Player One",
      teamId: 3,
      teamName: "Team 3",
      tripIndex: 8.4,
      gender: "M",
      roundTeeId: 101,
      courseHandicap: 9,
      playingHandicap: 8,
      grossScore: 72,
      netScore: 64,
      participationStatus: "ACTIVE",
      holes: Array(18).fill("4"),
      holeMeta,
    };

    render(
      <RoundPlayerScoringSection
        rows={[row]}
        headerHoles={holeMeta}
        frontNineParTotal={36}
        backNineParTotal={36}
        totalParTotal={72}
        teeOptions={[
          {
            roundTeeId: 101,
            teeName: "Blue",
            displayName: "Blue",
            displayNameForMen: "Blue",
            eligibleForMen: true,
          },
        ]}
        defaultRoundTeeId={101}
        saving={false}
        finalizing={false}
        scoringReadOnly={false}
        setInputRef={vi.fn()}
        updateTee={vi.fn()}
        updateWithdrawalStatus={vi.fn()}
        markRowWithdrawn={vi.fn()}
        handlePlayerHoleChange={vi.fn()}
        handleHoleKeyDown={vi.fn()}
      />,
    );

    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("101");
    expect(screen.getByText("64")).toBeInTheDocument();
  });
});
