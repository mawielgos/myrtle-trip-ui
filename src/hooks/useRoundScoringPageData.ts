import { useCallback, useEffect, useState } from "react";
import {
  getRoundReadiness,
  getRoundScorecards,
  getRoundScrambleScores,
  getRoundStatus,
  getScorecardDetail,
} from "../api/roundApi";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import { getTripRounds } from "../api/tripApi";
import type {
  RoundReadinessResponse,
  RoundStatus,
  RoundSetupStatusResponse,
  RoundTeeOption,
  ScrambleScoreEntryMode,
} from "../types/round";
import { roundHasScrambleEvent } from "../utils/roundEventCapabilities";
import {
  buildRows,
  normalizeParticipationStatus,
  type ScoreRow,
} from "../pages/roundScoringLogic";
import {
  buildScrambleRows,
  buildScrambleSnapshot,
  resolveScrambleEntryMode,
  type ScrambleTeamRow,
} from "../pages/roundScrambleScoringLogic";

async function loadEventRoundNumber(status: RoundStatus): Promise<number | null> {
  if (
    typeof status.roundNumber === "number" &&
    Number.isFinite(status.roundNumber)
  ) {
    return status.roundNumber;
  }

  if (status.tripId == null) {
    return null;
  }

  try {
    const rounds = await getTripRounds(status.tripId);
    const matchedRound = rounds.find((round) => round.roundId === status.roundId);
    return matchedRound?.roundNumber ?? null;
  } catch (err) {
    console.error("Failed to load event round number for scoring page", err);
    return null;
  }
}

function buildPlayerRowsSnapshot(rows: ScoreRow[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      scorecardId: row.scorecardId,
      roundTeeId: row.roundTeeId ?? null,
      participationStatus: normalizeParticipationStatus(row.participationStatus),
      withdrawalHoleNumber: row.withdrawalHoleNumber ?? null,
      holes: row.holes.map((value) => value.trim()),
    })),
  );
}

export function useRoundScoringPageData(numericRoundId: number) {
  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [eventRoundNumber, setEventRoundNumber] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<RoundReadinessResponse | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [scrambleRows, setScrambleRows] = useState<ScrambleTeamRow[]>([]);
  const [scrambleEntryMode, setScrambleEntryMode] =
    useState<ScrambleScoreEntryMode>("TOTAL");
  const [teeOptions, setTeeOptions] = useState<RoundTeeOption[]>([]);
  const [defaultRoundTeeId, setDefaultRoundTeeId] = useState<number | null>(null);
  const [initialRowsSnapshot, setInitialRowsSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusRequestId, setFocusRequestId] = useState(0);

  const loadPage = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [roundStatus, roundReadiness, setupStatus] = await Promise.all([
        getRoundStatus(id),
        getRoundReadiness(id),
        getRoundSetupStatus(id),
      ]);

      const setup = setupStatus as RoundSetupStatusResponse;
      const nextDefaultRoundTeeId =
        setup.teamAssignment?.defaultRoundTeeId ?? null;
      const nextTeeOptions = setup.teamAssignment?.teeOptions ?? [];

      setDefaultRoundTeeId(nextDefaultRoundTeeId);
      setTeeOptions(nextTeeOptions);
      setStatus(roundStatus);
      setEventRoundNumber(await loadEventRoundNumber(roundStatus));
      setReadiness(roundReadiness);

      if (roundHasScrambleEvent(roundReadiness, roundStatus.format)) {
        const [scrambleScores, roundScorecards] = await Promise.all([
          getRoundScrambleScores(id),
          getRoundScorecards(id),
        ]);
        const loadedScrambleRows = buildScrambleRows(
          scrambleScores.teams,
          roundStatus,
          roundScorecards,
        );
        const loadedMode = resolveScrambleEntryMode(
          scrambleScores.entryMode,
          roundStatus.scrambleScoreEntryMode,
          loadedScrambleRows,
        );

        setRows([]);
        setScrambleRows(loadedScrambleRows);
        setScrambleEntryMode(loadedMode);
        setInitialRowsSnapshot(
          buildScrambleSnapshot(loadedMode, loadedScrambleRows),
        );
        setFocusRequestId((current) => current + 1);
        return;
      }

      const roundScorecards = await getRoundScorecards(id);
      const details = await Promise.all(
        roundScorecards.map((scorecard) =>
          getScorecardDetail(scorecard.scorecardId),
        ),
      );
      const loadedRows = buildRows(
        roundScorecards,
        details,
        roundStatus,
        nextDefaultRoundTeeId,
      );

      setRows(loadedRows);
      setScrambleRows([]);
      setInitialRowsSnapshot(buildPlayerRowsSnapshot(loadedRows));
      setFocusRequestId((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load round scoring page.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Number.isFinite(numericRoundId) || numericRoundId <= 0) {
      setError("Invalid round id.");
      setLoading(false);
      return;
    }

    void loadPage(numericRoundId);
  }, [loadPage, numericRoundId]);

  return {
    status,
    eventRoundNumber,
    readiness,
    rows,
    setRows,
    scrambleRows,
    setScrambleRows,
    scrambleEntryMode,
    setScrambleEntryMode,
    teeOptions,
    defaultRoundTeeId,
    initialRowsSnapshot,
    loading,
    message,
    setMessage,
    error,
    setError,
    focusRequestId,
    loadPage,
  };
}
