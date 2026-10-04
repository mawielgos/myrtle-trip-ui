import React, { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ScrambleScoreEntryMode } from "../types/round";
import {
  isHoleOpenForRow,
  scrubScoreInput,
  shouldAutoAdvanceScoreInput,
  type ScoreRow,
} from "../pages/roundScoringLogic";
import type { ScrambleTeamRow } from "../pages/roundScrambleScoringLogic";

interface UseRoundScoringInteractionsArgs {
  rows: ScoreRow[];
  setRows: Dispatch<SetStateAction<ScoreRow[]>>;
  scrambleRows: ScrambleTeamRow[];
  setScrambleRows: Dispatch<SetStateAction<ScrambleTeamRow[]>>;
  scrambleEntryMode: ScrambleScoreEntryMode;
  setScrambleEntryMode: Dispatch<SetStateAction<ScrambleScoreEntryMode>>;
  isScramble: boolean;
  loading: boolean;
  saving: boolean;
  finalizing: boolean;
  scoringReadOnly: boolean;
  focusRequestId: number;
  setMessage: (message: string | null) => void;
  setError: (message: string | null) => void;
}

export function useRoundScoringInteractions({
  rows,
  setRows,
  scrambleRows,
  setScrambleRows,
  scrambleEntryMode,
  setScrambleEntryMode,
  isScramble,
  loading,
  saving,
  finalizing,
  scoringReadOnly,
  focusRequestId,
  setMessage,
  setError,
}: UseRoundScoringInteractionsArgs) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const handledFocusRequestIdRef = useRef(0);

  function clearFeedback(): void {
    setMessage(null);
    setError(null);
  }

  function getInputKey(
    rowId: number,
    holeIndex: number,
    prefix = "player",
  ): string {
    return `${prefix}-${rowId}-${holeIndex}`;
  }

  function setInputRef(
    rowId: number,
    holeIndex: number,
    element: HTMLInputElement | null,
    prefix = "player",
  ): void {
    inputRefs.current[getInputKey(rowId, holeIndex, prefix)] = element;
  }

  function focusInput(
    rowId: number,
    holeIndex: number,
    prefix = "player",
  ): void {
    const element = inputRefs.current[getInputKey(rowId, holeIndex, prefix)];
    if (!element) {
      return;
    }

    window.setTimeout(() => {
      element.scrollIntoView({ block: "center", inline: "nearest" });
      element.focus();
      element.select();
    }, 0);
  }

  function focusNextInput(
    rowId: number,
    holeIndex: number,
    prefix = "player",
  ): void {
    if (holeIndex >= 17) {
      return;
    }
    focusInput(rowId, holeIndex + 1, prefix);
  }

  function focusPreviousInput(
    rowId: number,
    holeIndex: number,
    prefix = "player",
  ): void {
    if (holeIndex <= 0) {
      return;
    }
    focusInput(rowId, holeIndex - 1, prefix);
  }

  function focusFirstBlankScoreInput(): void {
    if (isScramble) {
      if (scrambleEntryMode === "TOTAL") {
        const firstIncompleteTeam = scrambleRows.find(
          (team) => team.totalScore.trim() === "",
        );

        if (firstIncompleteTeam) {
          focusInput(firstIncompleteTeam.roundTeamId, 0, "scramble-total");
        }
        return;
      }

      for (const team of scrambleRows) {
        const firstBlankHoleIndex = team.holes.findIndex(
          (hole) => hole.trim() === "",
        );

        if (firstBlankHoleIndex >= 0) {
          focusInput(team.roundTeamId, firstBlankHoleIndex, "scramble");
          return;
        }
      }
      return;
    }

    for (const row of rows) {
      const firstBlankHoleIndex = row.holes.findIndex(
        (hole, index) => isHoleOpenForRow(row, index) && hole.trim() === "",
      );

      if (firstBlankHoleIndex >= 0) {
        focusInput(row.scorecardId, firstBlankHoleIndex);
        return;
      }
    }
  }

  function updateHole(
    scorecardId: number,
    holeIndex: number,
    value: string,
  ): void {
    const digitsOnly = scrubScoreInput(value, 2);

    setRows((prev) =>
      prev.map((row) => {
        if (row.scorecardId !== scorecardId) {
          return row;
        }

        const nextHoles = [...row.holes];
        nextHoles[holeIndex] = digitsOnly;

        return {
          ...row,
          holes: nextHoles,
        };
      }),
    );

    clearFeedback();
  }

  function updateScrambleHole(
    roundTeamId: number,
    holeIndex: number,
    value: string,
  ): void {
    const digitsOnly = scrubScoreInput(value, 2);

    setScrambleRows((prev) =>
      prev.map((team) => {
        if (team.roundTeamId !== roundTeamId) {
          return team;
        }

        const nextHoles = [...team.holes];
        nextHoles[holeIndex] = digitsOnly;
        const total = nextHoles.reduce(
          (sum, hole) => sum + (hole === "" ? 0 : Number(hole)),
          0,
        );

        return {
          ...team,
          holes: nextHoles,
          totalScore: nextHoles.some((hole) => hole !== "")
            ? String(total)
            : team.totalScore,
        };
      }),
    );

    clearFeedback();
  }

  function handlePlayerHoleChange(
    scorecardId: number,
    holeIndex: number,
    value: string,
  ): void {
    const digitsOnly = scrubScoreInput(value, 2);
    updateHole(scorecardId, holeIndex, digitsOnly);

    if (shouldAutoAdvanceScoreInput(digitsOnly)) {
      focusNextInput(scorecardId, holeIndex);
    }
  }

  function handleScrambleHoleChange(
    roundTeamId: number,
    holeIndex: number,
    value: string,
  ): void {
    const digitsOnly = scrubScoreInput(value, 2);
    updateScrambleHole(roundTeamId, holeIndex, digitsOnly);

    if (shouldAutoAdvanceScoreInput(digitsOnly)) {
      focusNextInput(roundTeamId, holeIndex, "scramble");
    }
  }

  function updateScrambleTotal(roundTeamId: number, value: string): void {
    const digitsOnly = scrubScoreInput(value, 3);

    setScrambleRows((prev) =>
      prev.map((team) =>
        team.roundTeamId === roundTeamId
          ? {
              ...team,
              totalScore: digitsOnly,
            }
          : team,
      ),
    );

    clearFeedback();
  }

  function updateScrambleMode(mode: ScrambleScoreEntryMode): void {
    setScrambleEntryMode(mode);
    clearFeedback();
  }

  function updateTee(scorecardId: number, roundTeeId: number): void {
    setRows((prev) =>
      prev.map((row) =>
        row.scorecardId === scorecardId
          ? {
              ...row,
              roundTeeId,
            }
          : row,
      ),
    );

    clearFeedback();
  }

  function updateWithdrawalStatus(
    scorecardId: number,
    withdrawalHoleNumber: number | null,
  ): void {
    setRows((prev) =>
      prev.map((row) => {
        if (row.scorecardId !== scorecardId) {
          return row;
        }

        if (withdrawalHoleNumber == null) {
          return {
            ...row,
            participationStatus: "ACTIVE",
            withdrawalHoleNumber: null,
          };
        }

        const normalizedHole = Math.max(1, Math.min(18, withdrawalHoleNumber));
        const nextHoles = row.holes.map((value, index) =>
          index + 1 > normalizedHole ? "" : value,
        );

        return {
          ...row,
          participationStatus: "WITHDRAWN",
          withdrawalHoleNumber: normalizedHole,
          holes: nextHoles,
        };
      }),
    );

    clearFeedback();
  }

  function markRowWithdrawn(scorecardId: number): void {
    const row = rows.find((item) => item.scorecardId === scorecardId);
    const filledHoleCount = row
      ? row.holes.filter((hole) => hole !== "").length
      : 0;
    updateWithdrawalStatus(scorecardId, Math.max(1, filledHoleCount));
  }

  function handleHoleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    rowId: number,
    holeIndex: number,
    currentValue: string,
    prefix = "player",
  ): void {
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const isDigitKey = /^[0-9]$/.test(event.key);

    if (event.key === "Backspace" && currentValue === "") {
      event.preventDefault();
      focusPreviousInput(rowId, holeIndex, prefix);
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      selectionStart === 0 &&
      selectionEnd === 0
    ) {
      event.preventDefault();
      focusPreviousInput(rowId, holeIndex, prefix);
      return;
    }

    if (
      event.key === "ArrowRight" &&
      selectionStart === currentValue.length &&
      selectionEnd === currentValue.length
    ) {
      event.preventDefault();
      focusNextInput(rowId, holeIndex, prefix);
      return;
    }

    if (!isDigitKey) {
      return;
    }

    const entireValueSelected =
      currentValue.length > 0 &&
      selectionStart === 0 &&
      selectionEnd === currentValue.length;

    if (entireValueSelected) {
      event.preventDefault();

      if (prefix === "scramble") {
        updateScrambleHole(rowId, holeIndex, event.key);
      } else {
        updateHole(rowId, holeIndex, event.key);
      }

      if (shouldAutoAdvanceScoreInput(event.key)) {
        focusNextInput(rowId, holeIndex, prefix);
      }
    }
  }

  useEffect(() => {
    if (
      loading ||
      saving ||
      finalizing ||
      scoringReadOnly ||
      focusRequestId === 0 ||
      handledFocusRequestIdRef.current === focusRequestId
    ) {
      return;
    }

    handledFocusRequestIdRef.current = focusRequestId;
    const timer = window.setTimeout(() => {
      focusFirstBlankScoreInput();
    }, 75);

    return () => window.clearTimeout(timer);
  }, [focusRequestId, loading, saving, finalizing, scoringReadOnly]);

  return {
    setInputRef,
    handlePlayerHoleChange,
    handleScrambleHoleChange,
    handleHoleKeyDown,
    updateScrambleTotal,
    updateScrambleMode,
    updateTee,
    updateWithdrawalStatus,
    markRowWithdrawn,
  };
}
