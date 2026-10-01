import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  finalizeRound,
  getRoundReadiness,
  getRoundScorecards,
  getRoundScrambleScores,
  getRoundStatus,
  getScorecardDetail,
  refreshRoundHandicaps,
  saveBulkScores,
  saveRoundScrambleScores,
  setScorecardParticipation,
  setScorecardTee,
} from "../api/roundApi";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import { getTripRounds } from "../api/tripApi";
import { saveRoundCorrections } from "../api/roundCorrectionApi";
import type {
  BulkScoreEntryRequest,
  HoleScoreDto,
  RoundReadinessResponse,
  RoundScorecardSummary,
  RoundScrambleTeamScoreResponse,
  RoundStatus,
  RoundSetupStatusResponse,
  RoundTeeOption,
  ScorecardDetail,
  ScrambleScoreEntryMode,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
  compactSelectStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import RoundReadinessPanel from "../components/round/RoundReadinessPanel";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import RoundCorrectionHistoryPanel from "../components/RoundCorrectionHistoryPanel";
import { roundHasScrambleEvent } from "../utils/roundEventCapabilities";
type ScoreRow = {
  scorecardId: number;
  playerId: number;
  playerName: string;
  teamId?: number | null;
  teamName?: string | null;
  teamNumber?: number | null;
  playerOrder?: number | null;
  tripIndex?: number | null;
  handicapAsOfDate?: string | null;
  handicapMethod?: string | null;
  handicapLabel?: string | null;
  teeName?: string | null;
  currentTeeName?: string | null;
  gender?: string | null;
  roundTeeId?: number | null;
  courseHandicap?: number | null;
  playingHandicap?: number | null;
  grossScore?: number | null;
  netScore?: number | null;
  adjustedGrossScore?: number | null;
  participationStatus?: "ACTIVE" | "NO_SHOW" | "WITHDRAWN" | string | null;
  withdrawalHoleNumber?: number | null;
  holes: string[];
  holeMeta: HoleScoreDto[];
};

type ScrambleTeamRow = {
  roundTeamId: number;
  teamNumber?: number | null;
  teamName: string;
  playerNames?: string[];
  totalScore: string;
  holes: string[];
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const topButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "5px",
  flexWrap: "wrap",
  alignItems: "center",
};

const compactStatusWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const compactStatusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(92px, 120px))",
  gap: "5px",
};

const compactStatusCardStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "8px 10px",
  background: "#fafafa",
};

const compactStatusLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#666",
  marginBottom: "2px",
  fontWeight: 600,
};

const compactStatusValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: 1.1,
};

const compactStatusSubValueStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#555",
  marginTop: "2px",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

const scoringTableWrapStyle: React.CSSProperties = {
  ...tableWrapStyle,
  maxHeight: "430px",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "0.78rem",
};

const stickyColumnStyle: React.CSSProperties = {
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 2,
};

const stickyHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  backgroundColor: "#f9fafb",
  background: "#f9fafb",
  opacity: 1,
  borderBottom: "1px solid #d1d5db",
  zIndex: 20,
};

const stickyScoringHeaderRowOneStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  top: 0,
  height: "26px",
  minHeight: "26px",
  lineHeight: "26px",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  zIndex: 30,
};

const stickyScoringHeaderRowTwoStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  top: "26px",
  height: "26px",
  minHeight: "26px",
  lineHeight: "26px",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  zIndex: 29,
};

const stickyScoringHeaderRowThreeStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  top: "52px",
  height: "26px",
  minHeight: "26px",
  lineHeight: "26px",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  zIndex: 28,
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #d1d5db",
  padding: "0.16rem 0.12rem",
  textAlign: "left",
  whiteSpace: "nowrap",
  background: "#f9fafb",
  fontWeight: 700,
};

const centeredThStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: "0.18rem 0.2rem",
  verticalAlign: "middle",
};

const centeredTdStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

const metaCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  whiteSpace: "nowrap",
};

const holeCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  padding: "0.1rem 0.04rem",
};

const holeInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: "30px",
  height: "32px",
  padding: 0,
  border: 0,
  borderRadius: 0,
  outline: "none",
  background: "transparent",
  color: "#111827",
  textAlign: "center",
  fontSize: "0.84rem",
  fontWeight: 700,
  lineHeight: 1,
  boxSizing: "border-box",
};

const totalInputStyle: React.CSSProperties = {
  ...holeInputStyle,
  width: "100%",
  minWidth: "58px",
};

const teeSelectStyle: React.CSSProperties = {
  ...compactSelectStyle,
  width: "112px",
  minWidth: "112px",
  maxWidth: "112px",
  height: "26px",
  fontSize: "0.7rem",
};

const subtotalCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  fontWeight: 700,
  background: "#f8fafc",
};

const compactSubtotalCellStyle: React.CSSProperties = {
  ...subtotalCellStyle,
  width: "34px",
  minWidth: "34px",
  maxWidth: "34px",
  paddingLeft: "0.08rem",
  paddingRight: "0.08rem",
};

const compactTotalCellStyle: React.CSSProperties = {
  ...subtotalCellStyle,
  width: "40px",
  minWidth: "40px",
  maxWidth: "40px",
  paddingLeft: "0.08rem",
  paddingRight: "0.08rem",
};

const compactPostCellStyle: React.CSSProperties = {
  ...subtotalCellStyle,
  width: "42px",
  minWidth: "42px",
  maxWidth: "42px",
  paddingLeft: "0.08rem",
  paddingRight: "0.08rem",
};

const disabledButtonStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

const wdButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  fontWeight: 800,
  padding: "2px 6px",
  fontSize: "0.68rem",
};

const wdActiveButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#b45309",
  background: "#fef3c7",
  color: "#78350f",
  fontWeight: 800,
  padding: "2px 6px",
  fontSize: "0.68rem",
};

const activeStatusButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: "2px 5px",
  fontSize: "0.68rem",
};

function getErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as any;
  const responseError = anyErr?.response?.data?.error;
  if (typeof responseError === "string" && responseError.trim() !== "") {
    return responseError;
  }

  if (err instanceof Error && err.message.trim() !== "") {
    return err.message;
  }

  return fallback;
}

const modeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: "6px 10px",
};

const selectedModeButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  padding: "6px 10px",
};

const scoreActionPanelStyle: React.CSSProperties = {
  ...sectionStyle,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const stickyTopActionPanelStyle: React.CSSProperties = {
  ...scoreActionPanelStyle,
  position: "sticky",
  top: "8px",
  zIndex: 20,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
};

const actionHintStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.88rem",
};

const scoringModeBadgeStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "999px",
  padding: "5px 10px",
  background: "#f8fafc",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#374151",
};

function isVisibleOnScoringPage(
  status?: string | null,
  withdrawalHoleNumber?: number | null,
): boolean {
  const normalized = String(status ?? "ACTIVE")
    .trim()
    .toUpperCase();
  if (normalized === "NO_SHOW") {
    return false;
  }
  if (normalized === "WITHDRAWN") {
    return Number(withdrawalHoleNumber ?? 0) > 0;
  }
  return true;
}

function normalizeParticipationStatus(
  status?: string | null,
): "ACTIVE" | "NO_SHOW" | "WITHDRAWN" {
  const normalized = String(status ?? "ACTIVE")
    .trim()
    .toUpperCase();
  return normalized === "NO_SHOW" || normalized === "WITHDRAWN"
    ? normalized
    : "ACTIVE";
}

function isHoleOpenForRow(row: ScoreRow, holeIndex: number): boolean {
  const status = normalizeParticipationStatus(row.participationStatus);
  if (status !== "WITHDRAWN") {
    return status === "ACTIVE";
  }
  const wdAfter = Number(row.withdrawalHoleNumber ?? 0);
  return wdAfter > 0 && holeIndex + 1 <= wdAfter;
}

function getRequiredHoleCount(row: ScoreRow): number {
  return normalizeParticipationStatus(row.participationStatus) === "WITHDRAWN"
    ? Math.max(0, Math.min(18, Number(row.withdrawalHoleNumber ?? 0)))
    : 18;
}

function getFilledRequiredHoleCount(row: ScoreRow): number {
  return row.holes.filter(
    (hole, index) => isHoleOpenForRow(row, index) && hole !== "",
  ).length;
}

function rowHasRequiredScores(row: ScoreRow): boolean {
  const requiredHoleCount = getRequiredHoleCount(row);
  if (requiredHoleCount <= 0) {
    return false;
  }
  return row.holes.every(
    (hole, index) => !isHoleOpenForRow(row, index) || hole !== "",
  );
}

function getHandicapStrokesForHole(
  handicap: number | null | undefined,
  strokeIndex: number | null | undefined,
): number {
  const normalizedHandicap = Number(handicap ?? 0);
  const normalizedStrokeIndex = Number(strokeIndex ?? 0);
  if (normalizedHandicap <= 0 || normalizedStrokeIndex <= 0) {
    return 0;
  }

  const base = Math.floor(normalizedHandicap / 18);
  const remainder = normalizedHandicap % 18;
  return base + (normalizedStrokeIndex <= remainder ? 1 : 0);
}

function getPostingAdjustedScore(row: ScoreRow): {
  adjustedTotal: number;
  playedHoleCount: number;
  completeForCurrentStatus: boolean;
} {
  let adjustedTotal = 0;
  let playedHoleCount = 0;
  let completeForCurrentStatus = true;

  row.holes.forEach((value, index) => {
    if (!isHoleOpenForRow(row, index)) {
      return;
    }

    if (value === "") {
      completeForCurrentStatus = false;
      return;
    }

    const strokes = Number(value);
    const meta = row.holeMeta[index];
    const par = Number(meta?.par ?? 0);
    const strokeIndex = Number(meta?.handicap ?? 0);

    if (!Number.isFinite(strokes) || strokes <= 0 || par <= 0) {
      completeForCurrentStatus = false;
      return;
    }

    const courseHandicapStrokes = getHandicapStrokesForHole(
      row.courseHandicap,
      strokeIndex,
    );
    adjustedTotal += Math.min(strokes, par + 2 + courseHandicapStrokes);
    playedHoleCount += 1;
  });

  return { adjustedTotal, playedHoleCount, completeForCurrentStatus };
}

function formatPostingAdjustedScore(row: ScoreRow): string {
  const status = normalizeParticipationStatus(row.participationStatus);
  const posting = getPostingAdjustedScore(row);

  if (!posting.completeForCurrentStatus || posting.playedHoleCount === 0) {
    return "";
  }

  if (status === "WITHDRAWN") {
    return "";
  }

  return String(posting.adjustedTotal);
}

function formatRoundTotal(row: ScoreRow, total: number): string {
  const status = normalizeParticipationStatus(row.participationStatus);
  const playedHoleCount = getFilledRequiredHoleCount(row);

  if (total <= 0 && !row.holes.some((hole) => hole !== "")) {
    return "";
  }

  if (status === "WITHDRAWN" && playedHoleCount > 0 && playedHoleCount < 18) {
    return `${total} (${playedHoleCount}h)`;
  }

  return String(total);
}

function formatNetTotal(row: ScoreRow): string {
  const status = normalizeParticipationStatus(row.participationStatus);
  if (status === "WITHDRAWN") {
    return "";
  }
  return row.netScore == null ? "" : String(row.netScore);
}

function getPlayerRowStatusText(row: ScoreRow): string {
  const filledHoleCount = getFilledRequiredHoleCount(row);
  const requiredHoleCount = getRequiredHoleCount(row);
  const rowIsComplete = rowHasRequiredScores(row);
  const rowStatus = normalizeParticipationStatus(row.participationStatus);

  if (rowStatus === "WITHDRAWN") {
    return `WD ${row.withdrawalHoleNumber ?? "?"} • ${filledHoleCount}/${requiredHoleCount}`;
  }

  return rowIsComplete ? "Complete" : `${filledHoleCount}/${requiredHoleCount}`;
}

function compareScoreRowsByGroupOrder(a: ScoreRow, b: ScoreRow): number {
  const aTeamNumber = a.teamNumber ?? Number.MAX_SAFE_INTEGER;
  const bTeamNumber = b.teamNumber ?? Number.MAX_SAFE_INTEGER;

  if (aTeamNumber !== bTeamNumber) {
    return aTeamNumber - bTeamNumber;
  }

  const aPlayerOrder = a.playerOrder ?? Number.MAX_SAFE_INTEGER;
  const bPlayerOrder = b.playerOrder ?? Number.MAX_SAFE_INTEGER;

  if (aPlayerOrder !== bPlayerOrder) {
    return aPlayerOrder - bPlayerOrder;
  }

  return a.playerName.localeCompare(b.playerName, undefined, {
    sensitivity: "base",
  });
}

function buildRows(
  summaries: RoundScorecardSummary[],
  details: ScorecardDetail[],
  roundStatus: RoundStatus,
  defaultRoundTeeId: number | null,
): ScoreRow[] {
  const detailByScorecard = new Map<number, ScorecardDetail>();
  details.forEach((detail) =>
    detailByScorecard.set(detail.scorecardId, detail),
  );

  const statusPlayerByPlayerId = new Map(
    (roundStatus.players ?? []).map((player) => [player.playerId, player]),
  );

  return summaries
    .filter((summary) => {
      const detail = detailByScorecard.get(summary.scorecardId);
      const statusPlayer = statusPlayerByPlayerId.get(summary.playerId);
      return isVisibleOnScoringPage(
        detail?.participationStatus ??
          summary.participationStatus ??
          statusPlayer?.participationStatus ??
          null,
        detail?.withdrawalHoleNumber ??
          summary.withdrawalHoleNumber ??
          statusPlayer?.withdrawalHoleNumber ??
          null,
      );
    })
    .map((summary) => {
      const detail = detailByScorecard.get(summary.scorecardId);
      const statusPlayer = statusPlayerByPlayerId.get(summary.playerId);

      const holeMeta = Array.from({ length: 18 }, (_, index) => {
        const holeNumber = index + 1;
        return (
          detail?.holes?.find((item) => item.holeNumber === holeNumber) ?? {
            holeNumber,
            par: null,
            handicap: null,
            strokes: null,
          }
        );
      });

      const holes = holeMeta.map((hole) =>
        hole.strokes != null ? String(hole.strokes) : "",
      );

      return {
        scorecardId: summary.scorecardId,
        playerId: summary.playerId,
        playerName: summary.playerName,
        teamId: summary.teamId,
        teamName: detail?.teamName ?? summary.teamName,
        teamNumber: summary.teamNumber ?? statusPlayer?.teamNumber ?? null,
        playerOrder: summary.playerOrder ?? statusPlayer?.playerOrder ?? null,
        tripIndex:
          detail?.tripIndex ??
          summary.tripIndex ??
          statusPlayer?.tripIndex ??
          null,
        handicapAsOfDate:
          detail?.handicapAsOfDate ??
          summary.handicapAsOfDate ??
          statusPlayer?.handicapAsOfDate ??
          null,
        handicapMethod:
          detail?.handicapMethod ??
          summary.handicapMethod ??
          statusPlayer?.handicapMethod ??
          null,
        handicapLabel:
          detail?.handicapLabel ??
          summary.handicapLabel ??
          statusPlayer?.handicapLabel ??
          null,
        teeName: detail?.teeName ?? summary.teeName,
        currentTeeName: detail?.currentTeeName ?? summary.currentTeeName,
        gender: statusPlayer?.gender ?? null,
        roundTeeId:
          detail?.roundTeeId ??
          summary.roundTeeId ??
          statusPlayer?.roundTeeId ??
          defaultRoundTeeId,
        courseHandicap: detail?.courseHandicap ?? summary.courseHandicap,
        playingHandicap: detail?.playingHandicap ?? summary.playingHandicap,
        grossScore: detail?.grossScore ?? summary.grossScore,
        netScore: detail?.netScore ?? summary.netScore,
        adjustedGrossScore:
          detail?.adjustedGrossScore ?? summary.adjustedGrossScore,
        participationStatus:
          detail?.participationStatus ??
          summary.participationStatus ??
          statusPlayer?.participationStatus ??
          "ACTIVE",
        withdrawalHoleNumber:
          detail?.withdrawalHoleNumber ??
          summary.withdrawalHoleNumber ??
          statusPlayer?.withdrawalHoleNumber ??
          null,
        holes,
        holeMeta,
      };
    })
    .sort(compareScoreRowsByGroupOrder);
}

function buildScrambleRows(
  teams: RoundScrambleTeamScoreResponse[],
  roundStatus: RoundStatus,
  scorecards: RoundScorecardSummary[],
): ScrambleTeamRow[] {
  const playersByTeamId = new Map<number, string[]>();
  const playersByTeamName = new Map<string, string[]>();

  scorecards.forEach((scorecard) => {
    if (scorecard.teamId != null) {
      const current = playersByTeamId.get(scorecard.teamId) ?? [];
      current.push(scorecard.playerName);
      playersByTeamId.set(scorecard.teamId, current);
    }

    if (scorecard.teamName) {
      const normalizedTeamName = scorecard.teamName.trim().toLowerCase();
      const current = playersByTeamName.get(normalizedTeamName) ?? [];
      current.push(scorecard.playerName);
      playersByTeamName.set(normalizedTeamName, current);
    }
  });

  (roundStatus.players ?? []).forEach((player) => {
    if (player.teamName) {
      const normalizedTeamName = player.teamName.trim().toLowerCase();
      const current = playersByTeamName.get(normalizedTeamName) ?? [];

      if (!current.includes(player.playerName)) {
        current.push(player.playerName);
      }

      playersByTeamName.set(normalizedTeamName, current);
    }
  });

  return teams.map((team) => {
    const sourceHoles = team.holes ?? [];
    const holes = Array.from({ length: 18 }, (_, index) => {
      const value = sourceHoles[index];
      return value == null ? "" : String(value);
    });

    const normalizedTeamName = team.teamName.trim().toLowerCase();
    const playerNames =
      playersByTeamId.get(team.roundTeamId) ??
      playersByTeamName.get(normalizedTeamName) ??
      [];

    return {
      roundTeamId: team.roundTeamId,
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      playerNames: playerNames ?? [],
      totalScore: team.totalScore == null ? "" : String(team.totalScore),
      holes,
    };
  });
}

function sumHoleRange(
  holes: string[],
  startInclusive: number,
  endExclusive: number,
): number {
  return holes
    .slice(startInclusive, endExclusive)
    .reduce((sum, value) => sum + (value === "" ? 0 : Number(value)), 0);
}

function formatTripIndex(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }

  return Number(value).toFixed(1);
}

function getDisplayTeeName(row: ScoreRow): string {
  if (row.currentTeeName) {
    return row.currentTeeName;
  }

  return row.teeName ?? "";
}

function normalizeGender(gender?: string | null): "M" | "F" {
  if (!gender || gender.trim().length === 0) {
    return "M";
  }

  const normalized = gender.trim().toUpperCase();

  if (
    normalized === "F" ||
    normalized === "FEMALE" ||
    normalized === "W" ||
    normalized === "WOMAN"
  ) {
    return "F";
  }

  return "M";
}

function getTeeRatingForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): number {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.womenCourseRating ?? -999;
  }

  return tee.menCourseRating ?? -999;
}

function getTeeDisplayForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): string {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.displayNameForWomen || tee.displayName || tee.teeName;
  }

  return tee.displayNameForMen || tee.displayName || tee.teeName;
}

function teeIsEligibleForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): boolean {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.eligibleForWomen === true;
  }

  return tee.eligibleForMen !== false;
}

function getEligibleSortedTeesForPlayer(
  teeOptions: RoundTeeOption[],
  gender?: string | null,
): RoundTeeOption[] {
  return [...teeOptions]
    .filter((tee) => teeIsEligibleForPlayer(tee, gender))
    .sort((a, b) => {
      const ratingCompare =
        getTeeRatingForPlayer(b, gender) - getTeeRatingForPlayer(a, gender);

      if (ratingCompare !== 0) {
        return ratingCompare;
      }

      return (a.teeName || "").localeCompare(b.teeName || "");
    });
}

function scrubScoreInput(value: string, maxLength: number): string {
  return value.replace(/[^0-9]/g, "").slice(0, maxLength);
}

function shouldAutoAdvanceScoreInput(value: string): boolean {
  if (value.length >= 2) {
    return true;
  }

  return ["2", "3", "4", "5", "6", "7", "8", "9"].includes(value);
}

function selectScoreInputValue(
  event: React.FocusEvent<HTMLInputElement>,
): void {
  event.currentTarget.select();
}

function keepScoreInputValueSelected(
  event: React.MouseEvent<HTMLInputElement>,
): void {
  // Browser mouseup can collapse the selection immediately after focus/select.
  // Preventing the default mouseup keeps the full score selected so the next
  // digit replaces the existing value instead of appending to it.
  event.preventDefault();
}

function hasAnyScrambleHoleScore(team: ScrambleTeamRow): boolean {
  return team.holes.some((hole) => hole !== "");
}

function formatEventRoundLabel(roundNumber?: number | null, fallbackRoundId?: number | null): string {
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) {
    return `Round ${roundNumber}`;
  }

  if (typeof fallbackRoundId === "number" && Number.isFinite(fallbackRoundId)) {
    return `Round ${fallbackRoundId}`;
  }

  return "Round";
}

async function loadEventRoundNumber(status: RoundStatus): Promise<number | null> {
  if (typeof status.roundNumber === "number" && Number.isFinite(status.roundNumber)) {
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

export default function RoundScoringPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roundId } = useParams();
  const numericRoundId = Number(roundId);

  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [eventRoundNumber, setEventRoundNumber] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<RoundReadinessResponse | null>(
    null,
  );
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [scrambleRows, setScrambleRows] = useState<ScrambleTeamRow[]>([]);
  const [scrambleEntryMode, setScrambleEntryMode] =
    useState<ScrambleScoreEntryMode>("TOTAL");
  const [teeOptions, setTeeOptions] = useState<RoundTeeOption[]>([]);
  const [defaultRoundTeeId, setDefaultRoundTeeId] = useState<number | null>(
    null,
  );
  const [initialRowsSnapshot, setInitialRowsSnapshot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [refreshingHandicaps, setRefreshingHandicaps] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusRequestId, setFocusRequestId] = useState(0);
  const handledFocusRequestIdRef = useRef(0);

  const isScramble = roundHasScrambleEvent(readiness, status?.format);

  const comparableRowsSnapshot = useMemo(() => {
    if (isScramble) {
      return JSON.stringify({
        entryMode: scrambleEntryMode,
        teams: scrambleRows.map((team) => ({
          roundTeamId: team.roundTeamId,
          totalScore: team.totalScore.trim(),
          holes: team.holes.map((value) => value.trim()),
        })),
      });
    }

    return JSON.stringify(
      rows.map((row) => ({
        scorecardId: row.scorecardId,
        roundTeeId: row.roundTeeId ?? null,
        participationStatus: normalizeParticipationStatus(
          row.participationStatus,
        ),
        withdrawalHoleNumber: row.withdrawalHoleNumber ?? null,
        holes: row.holes.map((value) => value.trim()),
      })),
    );
  }, [isScramble, rows, scrambleEntryMode, scrambleRows]);

  const hasChanges =
    !loading &&
    initialRowsSnapshot.length > 0 &&
    comparableRowsSnapshot !== initialRowsSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(
    hasChanges && !saving && !finalizing,
  );

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }

  useEffect(() => {
    if (!Number.isFinite(numericRoundId) || numericRoundId <= 0) {
      setError("Invalid round id.");
      setLoading(false);
      return;
    }

    void loadPage(numericRoundId);
  }, [numericRoundId]);

  async function loadPage(id: number): Promise<void> {
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
        const inferredMode: ScrambleScoreEntryMode = loadedScrambleRows.some(
          hasAnyScrambleHoleScore,
        )
          ? "HOLES"
          : "TOTAL";
        const loadedMode: ScrambleScoreEntryMode =
          scrambleScores.entryMode === "HOLES" ||
          scrambleScores.entryMode === "TOTAL"
            ? scrambleScores.entryMode
            : roundStatus.scrambleScoreEntryMode === "HOLES" ||
                roundStatus.scrambleScoreEntryMode === "TOTAL"
              ? roundStatus.scrambleScoreEntryMode
              : inferredMode;
        const loadedSnapshot = JSON.stringify({
          entryMode: loadedMode,
          teams: loadedScrambleRows.map((team) => ({
            roundTeamId: team.roundTeamId,
            totalScore: team.totalScore.trim(),
            holes: team.holes.map((value) => value.trim()),
          })),
        });

        setRows([]);
        setScrambleRows(loadedScrambleRows);
        setScrambleEntryMode(loadedMode);
        setInitialRowsSnapshot(loadedSnapshot);
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
      setInitialRowsSnapshot(
        JSON.stringify(
          loadedRows.map((row) => ({
            scorecardId: row.scorecardId,
            roundTeeId: row.roundTeeId ?? null,
            participationStatus: normalizeParticipationStatus(
              row.participationStatus,
            ),
            withdrawalHoleNumber: row.withdrawalHoleNumber ?? null,
            holes: row.holes.map((value) => value.trim()),
          })),
        ),
      );
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

    setMessage(null);
    setError(null);
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

    setMessage(null);
    setError(null);
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

    setMessage(null);
    setError(null);
  }

  function updateScrambleMode(mode: ScrambleScoreEntryMode): void {
    setScrambleEntryMode(mode);
    setMessage(null);
    setError(null);
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

    setMessage(null);
    setError(null);
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

    setMessage(null);
    setError(null);
  }

  function markRowWithdrawn(scorecardId: number): void {
    const row = rows.find((item) => item.scorecardId === scorecardId);
    const filledHoleCount = row
      ? row.holes.filter((hole) => hole !== "").length
      : 0;
    updateWithdrawalStatus(scorecardId, Math.max(1, filledHoleCount));
  }

  function renderTeeSelector(row: ScoreRow): React.ReactNode {
    const eligibleTees = getEligibleSortedTeesForPlayer(teeOptions, row.gender);

    if (eligibleTees.length === 0) {
      return <span>{getDisplayTeeName(row)}</span>;
    }

    const selectedRoundTeeId = row.roundTeeId ?? defaultRoundTeeId;
    const selectedTeeIsEligible =
      selectedRoundTeeId == null ||
      eligibleTees.some((tee) => tee.roundTeeId === selectedRoundTeeId);

    return (
      <select
        value={selectedTeeIsEligible ? (selectedRoundTeeId ?? "") : ""}
        onChange={(e) => updateTee(row.scorecardId, Number(e.target.value))}
        disabled={saving || finalizing || scoringReadOnly}
        style={teeSelectStyle}
      >
        {!selectedTeeIsEligible ? <option value="">Select tee</option> : null}
        {eligibleTees.map((tee) => (
          <option key={tee.roundTeeId} value={tee.roundTeeId}>
            {getTeeDisplayForPlayer(tee, row.gender)}
          </option>
        ))}
      </select>
    );
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

    // In correction mode, clicking an existing score selects the full value.
    // Handle a single-digit replacement here so focus advances reliably after
    // replacing scores 2-9. preventDefault keeps onChange from firing a second
    // time and avoids the historical two-hole jump. A replacement value of 1
    // remains in the current cell because it may be the first digit of 10-19.
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

  async function handleSaveScores(): Promise<void> {
    if (!status) {
      return;
    }

    if (roundLockedByCompleteTrip) {
      setError(
        "Event is complete and locked. Enter Correction Mode from Event Detail before changing scores or tees.",
      );
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (roundHasScrambleEvent(readiness, status.format)) {
        await saveRoundScrambleScores(status.roundId, {
          entryMode: scrambleEntryMode,
          teams: scrambleRows.map((team) => ({
            roundTeamId: team.roundTeamId,
            totalScore: team.totalScore === "" ? null : Number(team.totalScore),
            holes:
              scrambleEntryMode === "HOLES"
                ? team.holes.map((value) =>
                    value === "" ? null : Number(value),
                  )
                : [],
          })),
        });

        await loadPage(status.roundId);
        setMessage(
          status.finalized
            ? "Scramble corrections saved."
            : "Scramble scores saved.",
        );
        return;
      }

      const initialSnapshotRows = JSON.parse(initialRowsSnapshot);

      const initialTeeByScorecard = new Map(
        initialSnapshotRows.map((row: any) => [
          row.scorecardId,
          row.roundTeeId ?? null,
        ]),
      );

      const initialParticipationByScorecard = new Map(
        initialSnapshotRows.map((row: any) => [
          row.scorecardId,
          {
            participationStatus: normalizeParticipationStatus(
              row.participationStatus,
            ),
            withdrawalHoleNumber: row.withdrawalHoleNumber ?? null,
          },
        ]),
      );

      const teeChanges = rows.filter(
        (row) =>
          (initialTeeByScorecard.get(row.scorecardId) ?? null) !==
          (row.roundTeeId ?? null),
      );

      const participationChanges = rows.filter((row) => {
        const before = initialParticipationByScorecard.get(
          row.scorecardId,
        ) as any;
        const nextStatus = normalizeParticipationStatus(
          row.participationStatus,
        );
        const nextWithdrawalHoleNumber =
          nextStatus === "WITHDRAWN"
            ? (row.withdrawalHoleNumber ?? null)
            : null;
        return (
          !before ||
          before.participationStatus !== nextStatus ||
          (before.withdrawalHoleNumber ?? null) !== nextWithdrawalHoleNumber
        );
      });

      const scoreRows = rows.map((row) => ({
        playerId: row.playerId,
        holes: row.holes.map((value, index) =>
          isHoleOpenForRow(row, index) && value !== "" ? Number(value) : null,
        ),
      }));

      if (status.finalized) {
        await saveRoundCorrections(status.roundId, {
          playerCorrections: scoreRows,
          teeCorrections: teeChanges
            .filter((row) => row.roundTeeId != null)
            .map((row) => ({
              scorecardId: row.scorecardId,
              roundTeeId: row.roundTeeId,
            })),
          participationCorrections: participationChanges.map((row) => {
            const nextStatus = normalizeParticipationStatus(
              row.participationStatus,
            );
            return {
              scorecardId: row.scorecardId,
              participationStatus: nextStatus,
              withdrawalHoleNumber:
                nextStatus === "WITHDRAWN"
                  ? (row.withdrawalHoleNumber ?? null)
                  : null,
            };
          }),
          refreshHandicaps: false,
        });
      } else {
        for (const row of participationChanges) {
          const nextStatus = normalizeParticipationStatus(
            row.participationStatus,
          );
          await setScorecardParticipation(
            row.scorecardId,
            nextStatus,
            nextStatus === "WITHDRAWN"
              ? (row.withdrawalHoleNumber ?? null)
              : null,
          );
        }

        await Promise.all(
          teeChanges
            .filter((row) => row.roundTeeId != null)
            .map((row) =>
              setScorecardTee(row.scorecardId, Number(row.roundTeeId)),
            ),
        );

        const request: BulkScoreEntryRequest = {
          scorecards: scoreRows,
        };

        await saveBulkScores(status.roundId, request);
      }

      await loadPage(status.roundId);
      setMessage(status.finalized ? "Corrections saved." : "Scores saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save score changes."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshHandicaps(): Promise<void> {
    if (!status) {
      return;
    }

    if (hasChanges) {
      setError("Save or discard score changes before refreshing handicaps.");
      setMessage(null);
      return;
    }

    try {
      setRefreshingHandicaps(true);
      setError(null);
      setMessage(null);

      await refreshRoundHandicaps(status.roundId);
      await loadPage(status.roundId);
      setMessage("Course handicaps refreshed from the frozen round tee data.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to refresh course handicaps."));
    } finally {
      setRefreshingHandicaps(false);
    }
  }

  async function handleFinalizeRound(): Promise<void> {
    if (!status) {
      return;
    }

    if (!canFinalize) {
      if (!readinessReadyForScoring) {
        setError(
          "Round is not ready to finalize. Fix the blocking readiness issues first.",
        );
        setMessage(null);
        return;
      }

      setError(
        isScramble
          ? "Every scramble team must have a complete score before finalizing."
          : "Every active player must have required holes entered before finalizing. For a mid-round withdrawal, mark WD after the player's last completed hole.",
      );
      setMessage(null);
      return;
    }

    try {
      setFinalizing(true);
      setError(null);
      setMessage(null);

      await finalizeRound(status.roundId);
      await loadPage(status.roundId);
      setMessage("Round finalized.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to finalize round."));
    } finally {
      setFinalizing(false);
    }
  }

  const summary = useMemo(() => {
    if (isScramble) {
      const completedTeams = scrambleRows.filter((team) => {
        if (scrambleEntryMode === "TOTAL") {
          return team.totalScore !== "";
        }

        return team.holes.every((hole) => hole !== "");
      });

      return {
        playerCount: scrambleRows.length,
        completedCount: completedTeams.length,
        incompleteCount: scrambleRows.length - completedTeams.length,
        unassignedCount: 0,
        unassignedPlayers: [] as ScoreRow[],
      };
    }

    const completedPlayers = rows.filter(rowHasRequiredScores);
    const incompletePlayers = rows.filter((row) => !rowHasRequiredScores(row));
    const unassignedPlayers = rows.filter((row) => !row.teamId);

    return {
      playerCount: rows.length,
      completedCount: completedPlayers.length,
      incompleteCount: incompletePlayers.length,
      unassignedCount: unassignedPlayers.length,
      unassignedPlayers,
    };
  }, [isScramble, rows, scrambleEntryMode, scrambleRows]);

  const headerHoles = useMemo(() => {
    if (rows.length > 0 && rows[0].holeMeta.length === 18) {
      return rows[0].holeMeta;
    }

    return Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: null,
      handicap: null,
      strokes: null,
    }));
  }, [rows]);

  const frontNineParTotal = useMemo(() => {
    return headerHoles
      .slice(0, 9)
      .reduce((sum, hole) => sum + (hole.par ?? 0), 0);
  }, [headerHoles]);

  const backNineParTotal = useMemo(() => {
    return headerHoles
      .slice(9, 18)
      .reduce((sum, hole) => sum + (hole.par ?? 0), 0);
  }, [headerHoles]);

  const totalParTotal = frontNineParTotal + backNineParTotal;

  const hasUnassignedPlayers = !isScramble && summary.unassignedCount > 0;
  const hasIncompleteScorecards = summary.incompleteCount > 0;
  const roundLockedByCompleteTrip = Boolean(status?.tripLocked);
  const viewOnlyMode = searchParams.get("mode") === "view";
  const tripCorrectionMode = Boolean(status?.tripCorrectionMode);
  const scoringReadOnly = roundLockedByCompleteTrip || viewOnlyMode;
  const readinessReadyForScoring =
    readiness?.ready ?? readiness?.readyForScoring ?? false;
  const readinessReadyForFinalization =
    readiness?.readyForFinalization ??
    (readinessReadyForScoring && !hasIncompleteScorecards);
  const readinessBlocksScoring = Boolean(
    status && !status.finalized && !readinessReadyForScoring,
  );
  const canFinalize =
    !status?.finalized &&
    readinessReadyForFinalization &&
    !hasIncompleteScorecards &&
    summary.playerCount > 0;
  const saveDisabled =
    saving ||
    finalizing ||
    refreshingHandicaps ||
    scoringReadOnly ||
    !hasChanges;
  const finalizeDisabled =
    !!status?.finalized ||
    finalizing ||
    saving ||
    refreshingHandicaps ||
    scoringReadOnly ||
    !canFinalize;
  const refreshHandicapsDisabled =
    !status ||
    status.finalized ||
    saving ||
    finalizing ||
    refreshingHandicaps ||
    scoringReadOnly ||
    hasChanges;
  const showSaveButton = !scoringReadOnly;
  const saveButtonLabel = status?.finalized
    ? "Save Corrections"
    : "Save Scores";
  const scrambleTeamSize =
    status?.scrambleTeamSize === 2 ||
    status?.scrambleTeamSize === 3 ||
    status?.scrambleTeamSize === 4
      ? status.scrambleTeamSize
      : 4;
  const scrambleGameLabel = `${scrambleTeamSize}-Person Scramble`;
  const scrambleModeLabel =
    scrambleEntryMode === "TOTAL"
      ? "Scoring Mode: Total Team Score"
      : "Scoring Mode: Hole-by-Hole";

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

  function renderScoreActionPanel(location: "top" | "bottom") {
    return (
      <section
        style={{
          ...(location === "top"
            ? stickyTopActionPanelStyle
            : scoreActionPanelStyle),
          marginTop: location === "top" ? "0" : undefined,
          marginBottom: location === "top" ? "12px" : undefined,
        }}
      >
        <div style={actionHintStyle}>
          {scoringReadOnly
            ? "Scores are being shown in view-only mode."
            : status.finalized
              ? "This round is finalized. Saved changes will be treated as score corrections."
              : canFinalize
                ? "All required scores are entered. This round is ready to finalize."
                : hasIncompleteScorecards
                  ? isScramble
                    ? "Enter a score for every scramble team before finalizing."
                    : "Enter all required holes for every active player before finalizing. Mark mid-round withdrawals as WD after their last completed hole. The Total column shows partial scores for mid-round withdrawals, such as 58 (13h). For 4-Man 2-Low Net, holes after a WD use the lowest 2 net scores from the remaining eligible players."
                  : readinessBlocksScoring
                    ? "Resolve the readiness items before finalizing this round."
                    : "Save score changes before finalizing."}
        </div>

        <div style={topButtonRowStyle}>
          {showSaveButton ? (
            <button
              type="button"
              style={
                saveDisabled
                  ? { ...primaryButtonStyle, ...disabledButtonStyle }
                  : primaryButtonStyle
              }
              onClick={() => void handleSaveScores()}
              disabled={saveDisabled}
            >
              {saving ? "Saving..." : saveButtonLabel}
            </button>
          ) : null}

          {!status.finalized && !isScramble ? (
            <button
              type="button"
              style={
                refreshHandicapsDisabled
                  ? { ...buttonStyle, ...disabledButtonStyle }
                  : buttonStyle
              }
              onClick={() => void handleRefreshHandicaps()}
              disabled={refreshHandicapsDisabled}
              title={
                hasChanges
                  ? "Save or discard score changes before refreshing handicaps."
                  : undefined
              }
            >
              {refreshingHandicaps ? "Refreshing..." : "Refresh Handicaps"}
            </button>
          ) : null}

          {!status.finalized ? (
            <button
              type="button"
              style={
                finalizeDisabled
                  ? { ...buttonStyle, ...disabledButtonStyle }
                  : buttonStyle
              }
              onClick={() => void handleFinalizeRound()}
              disabled={finalizeDisabled}
            >
              {finalizing ? "Finalizing..." : "Finalize Round"}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Scoring</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Scoring</h1>
        <div style={errorBoxStyle}>{error ?? "Round not found."}</div>
      </div>
    );
  }

  const eventRoundLabel = formatEventRoundLabel(eventRoundNumber, status.roundId);

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Round Scoring"
        subtitle={`${eventRoundLabel}${status.courseName ? ` • ${status.courseName}` : ""}${status.teeName ? ` • ${status.teeName}` : ""}${status.roundDate ? ` • ${status.roundDate}` : ""}`}
        actions={
          <>
            <TripDetailButton
              tripId={status.tripId}
              onBeforeNavigate={confirmIfNeeded}
            />
            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                void navigateIfConfirmed(`/rounds/${status.roundId}/results`)
              }
            >
              Results
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void loadPage(status.roundId)}
            >
              Refresh
            </button>
          </>
        }
      />

      <RoundProgressBar
        roundId={status.roundId}
        currentStep="scoring"
        format={status.format}
        finalized={status.finalized}
      />

      {viewOnlyMode ? (
        <div style={warningBoxStyle}>
          Scores are shown in read-only mode. Use Edit Corrections from Round
          Results if you need to make post-finalization changes.
        </div>
      ) : roundLockedByCompleteTrip ? (
        <div style={warningBoxStyle}>
          Event is complete and locked. Enter Correction Mode from Event Detail
          before changing scores or tees.
        </div>
      ) : status.finalized ? (
        <div style={warningBoxStyle}>
          {tripCorrectionMode
            ? "Correction Mode is enabled. Changes will recalculate round results, standings, and payouts."
            : "This round is finalized. Saved changes will be treated as score corrections."}
        </div>
      ) : null}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {renderScoreActionPanel("top")}

      {isScramble ? (
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                {scrambleGameLabel} Scores
              </h2>
              <div
                style={{ fontSize: "0.86rem", color: "#666", marginTop: "4px" }}
              >
                Enter either one final score per team or one shared 18-hole
                scorecard per team.
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={scoringModeBadgeStyle}>{scrambleModeLabel}</span>
              </div>
            </div>
            <div style={topButtonRowStyle}>
              <button
                type="button"
                style={
                  scrambleEntryMode === "TOTAL"
                    ? selectedModeButtonStyle
                    : modeButtonStyle
                }
                onClick={() => updateScrambleMode("TOTAL")}
                disabled={
                  saving || finalizing || scoringReadOnly || status?.finalized
                }
              >
                Final Score
              </button>
              <button
                type="button"
                style={
                  scrambleEntryMode === "HOLES"
                    ? selectedModeButtonStyle
                    : modeButtonStyle
                }
                onClick={() => updateScrambleMode("HOLES")}
                disabled={
                  saving || finalizing || scoringReadOnly || status?.finalized
                }
              >
                Hole-by-Hole
              </button>
            </div>
          </div>

          {scrambleEntryMode === "TOTAL" ? (
            <div style={tableWrapStyle}>
              <table style={{ ...tableStyle, maxWidth: "720px" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Team</th>
                    <th style={centeredThStyle}>Final Score</th>
                    <th style={centeredThStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scrambleRows.map((team) => (
                    <tr key={team.roundTeamId}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{team.teamName}</div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#6b7280",
                            marginTop: "2px",
                          }}
                        >
                          {(team.playerNames ?? []).length > 0
                            ? (team.playerNames ?? []).join(" / ")
                            : "No team members assigned"}
                        </div>
                      </td>
                      <td style={centeredTdStyle}>
                        <input
                          ref={(element) =>
                            setInputRef(
                              team.roundTeamId,
                              0,
                              element,
                              "scramble-total",
                            )
                          }
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={team.totalScore}
                          disabled={saving || finalizing || scoringReadOnly}
                          onFocus={selectScoreInputValue}
                          onMouseUp={keepScoreInputValueSelected}
                          onChange={(e) =>
                            updateScrambleTotal(
                              team.roundTeamId,
                              e.target.value,
                            )
                          }
                          style={totalInputStyle}
                        />
                      </td>
                      <td style={centeredTdStyle}>
                        {team.totalScore === "" ? "Incomplete" : "Complete"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="scorecard-grid-wrap" style={tableWrapStyle}>
              <table className="scorecard-grid scorecard-grid--scramble" style={tableStyle}>
                <thead>
                  <tr className="scorecard-hole-header">
                    <th
                      className="scorecard-player-header"
                      style={{
                        ...centeredThStyle,
                        ...stickyHeaderStyle,
                        ...stickyColumnStyle,
                        width: "128px",
                        minWidth: "128px",
                        maxWidth: "128px",
                      }}
                    >
                      Team
                    </th>
                    {headerHoles.slice(0, 9).map((hole) => (
                      <th
                        key={`scramble-hole-front-${hole.holeNumber}`}
                        style={{
                          ...centeredThStyle,
                          ...stickyHeaderStyle,
                          minWidth: "30px",
                        }}
                      >
                        {hole.holeNumber}
                      </th>
                    ))}
                    <th style={{ ...centeredThStyle, ...stickyHeaderStyle }}>
                      OUT
                    </th>
                    {headerHoles.slice(9, 18).map((hole) => (
                      <th
                        key={`scramble-hole-back-${hole.holeNumber}`}
                        style={{
                          ...centeredThStyle,
                          ...stickyHeaderStyle,
                          minWidth: "30px",
                        }}
                      >
                        {hole.holeNumber}
                      </th>
                    ))}
                    <th style={{ ...centeredThStyle, ...stickyHeaderStyle }}>
                      IN
                    </th>
                    <th style={{ ...centeredThStyle, ...stickyHeaderStyle }}>
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scrambleRows.map((team) => {
                    const outTotal = sumHoleRange(team.holes, 0, 9);
                    const inTotal = sumHoleRange(team.holes, 9, 18);
                    const total = outTotal + inTotal;
                    const rowIsComplete = team.holes.every(
                      (hole) => hole !== "",
                    );

                    return (
                      <tr key={team.roundTeamId} className="scorecard-player-row">
                        <td
                          className="scorecard-player-cell"
                          style={{
                            ...tdStyle,
                            ...stickyColumnStyle,
                            width: "128px",
                            minWidth: "128px",
                            maxWidth: "128px",
                            boxShadow: "1px 0 0 #e5e7eb",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{team.teamName}</div>
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            {(team.playerNames ?? []).length > 0
                              ? (team.playerNames ?? []).join(" / ")
                              : "No team members assigned"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.74rem",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            {rowIsComplete
                              ? "Complete"
                              : `${team.holes.filter((hole) => hole !== "").length}/18 entered`}
                          </div>
                        </td>
                        {team.holes.slice(0, 9).map((hole, index) => (
                          <td
                            key={`scramble-front-${team.roundTeamId}-${index}`}
                            className="scorecard-score-cell"
                            style={holeCellStyle}
                          >
                            <input
                              ref={(element) =>
                                setInputRef(
                                  team.roundTeamId,
                                  index,
                                  element,
                                  "scramble",
                                )
                              }
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={hole}
                              disabled={saving || finalizing || scoringReadOnly}
                              onFocus={selectScoreInputValue}
                              onMouseUp={keepScoreInputValueSelected}
                              onChange={(e) =>
                                handleScrambleHoleChange(
                                  team.roundTeamId,
                                  index,
                                  e.target.value,
                                )
                              }
                              onKeyDown={(e) =>
                                handleHoleKeyDown(
                                  e,
                                  team.roundTeamId,
                                  index,
                                  hole,
                                  "scramble",
                                )
                              }
                              className="scorecard-score-input"
                              style={holeInputStyle}
                            />
                          </td>
                        ))}
                        <td className="scorecard-summary-cell" style={subtotalCellStyle}>
                          {outTotal > 0 ||
                          team.holes.slice(0, 9).some((hole) => hole !== "")
                            ? outTotal
                            : ""}
                        </td>
                        {team.holes.slice(9, 18).map((hole, index) => (
                          <td
                            key={`scramble-back-${team.roundTeamId}-${index}`}
                            className="scorecard-score-cell"
                            style={holeCellStyle}
                          >
                            <input
                              ref={(element) =>
                                setInputRef(
                                  team.roundTeamId,
                                  index + 9,
                                  element,
                                  "scramble",
                                )
                              }
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={hole}
                              disabled={saving || finalizing || scoringReadOnly}
                              onFocus={selectScoreInputValue}
                              onMouseUp={keepScoreInputValueSelected}
                              onChange={(e) =>
                                handleScrambleHoleChange(
                                  team.roundTeamId,
                                  index + 9,
                                  e.target.value,
                                )
                              }
                              onKeyDown={(e) =>
                                handleHoleKeyDown(
                                  e,
                                  team.roundTeamId,
                                  index + 9,
                                  hole,
                                  "scramble",
                                )
                              }
                              className="scorecard-score-input"
                              style={holeInputStyle}
                            />
                          </td>
                        ))}
                        <td className="scorecard-summary-cell" style={subtotalCellStyle}>
                          {inTotal > 0 ||
                          team.holes.slice(9, 18).some((hole) => hole !== "")
                            ? inTotal
                            : ""}
                        </td>
                        <td className="scorecard-summary-cell" style={subtotalCellStyle}>
                          {total > 0 || team.holes.some((hole) => hole !== "")
                            ? total
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section style={sectionStyle}>
          <div className="scorecard-grid-wrap" style={scoringTableWrapStyle}>
            <table className="scorecard-grid" style={tableStyle}>
              <thead>
                <tr className="scorecard-hole-header">
                  <th
                    className="scorecard-player-header"
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowOneStyle,
                      ...stickyColumnStyle,
                      width: "230px",
                      minWidth: "230px",
                      maxWidth: "230px",
                      zIndex: 8,
                    }}
                  >
                    Player
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
                    Team
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
                    Tee
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
                    Index
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
                    CH
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowOneStyle }}>
                    PH
                  </th>

                  {headerHoles.slice(0, 9).map((hole) => (
                    <th
                      key={`hole-front-${hole.holeNumber}`}
                      style={{
                        ...centeredThStyle,
                        ...stickyScoringHeaderRowOneStyle,
                        minWidth: "30px",
                      }}
                    >
                      {hole.holeNumber}
                    </th>
                  ))}

                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowOneStyle,
                      width: "34px",
                      minWidth: "34px",
                      maxWidth: "34px",
                    }}
                  >
                    OUT
                  </th>

                  {headerHoles.slice(9, 18).map((hole) => (
                    <th
                      key={`hole-back-${hole.holeNumber}`}
                      style={{
                        ...centeredThStyle,
                        ...stickyScoringHeaderRowOneStyle,
                        minWidth: "30px",
                      }}
                    >
                      {hole.holeNumber}
                    </th>
                  ))}

                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowOneStyle,
                      width: "34px",
                      minWidth: "34px",
                      maxWidth: "34px",
                    }}
                  >
                    IN
                  </th>
                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowOneStyle,
                      width: "40px",
                      minWidth: "40px",
                      maxWidth: "40px",
                    }}
                  >
                    TOTAL
                  </th>
                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowOneStyle,
                      width: "42px",
                      minWidth: "42px",
                      maxWidth: "42px",
                    }}
                    title="Adjusted gross for completed active 18-hole scorecards. Mid-round withdrawals are shown as partial totals in the Total column."
                  >
                    Post
                  </th>
                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowOneStyle,
                      width: "34px",
                      minWidth: "34px",
                      maxWidth: "34px",
                    }}
                  >
                    Net
                  </th>
                </tr>

                <tr className="scorecard-info-header scorecard-par-header">
                  <th
                    className="scorecard-row-label"
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowTwoStyle,
                      ...stickyColumnStyle,
                      width: "230px",
                      minWidth: "230px",
                      maxWidth: "230px",
                      zIndex: 7,
                      fontWeight: 500,
                      color: "#555",
                    }}
                  >
                    PAR
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />

                  {headerHoles.slice(0, 9).map((hole) => (
                    <th
                      key={`par-front-${hole.holeNumber}`}
                      style={{
                        ...centeredThStyle,
                        ...stickyScoringHeaderRowTwoStyle,
                        color: "#555",
                        fontWeight: 500,
                      }}
                    >
                      {hole.par ?? ""}
                    </th>
                  ))}

                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowTwoStyle,
                      width: "34px",
                      minWidth: "34px",
                      maxWidth: "34px",
                      fontWeight: 700,
                      color: "#555",
                    }}
                  >
                    {frontNineParTotal || ""}
                  </th>

                  {headerHoles.slice(9, 18).map((hole) => (
                    <th
                      key={`par-back-${hole.holeNumber}`}
                      style={{
                        ...centeredThStyle,
                        ...stickyScoringHeaderRowTwoStyle,
                        color: "#555",
                        fontWeight: 500,
                      }}
                    >
                      {hole.par ?? ""}
                    </th>
                  ))}

                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowTwoStyle,
                      width: "34px",
                      minWidth: "34px",
                      maxWidth: "34px",
                      fontWeight: 700,
                      color: "#555",
                    }}
                  >
                    {backNineParTotal || ""}
                  </th>

                  <th
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowTwoStyle,
                      width: "40px",
                      minWidth: "40px",
                      maxWidth: "40px",
                      fontWeight: 700,
                      color: "#555",
                    }}
                  >
                    {totalParTotal || ""}
                  </th>

                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowTwoStyle }} />
                </tr>

                <tr className="scorecard-info-header scorecard-handicap-header">
                  <th
                    className="scorecard-row-label"
                    style={{
                      ...centeredThStyle,
                      ...stickyScoringHeaderRowThreeStyle,
                      ...stickyColumnStyle,
                      width: "230px",
                      minWidth: "230px",
                      maxWidth: "230px",
                      zIndex: 7,
                      fontWeight: 500,
                      color: "#555",
                    }}
                  >
                    HDCP
                  </th>
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />

                  {headerHoles.slice(0, 9).map((hole) => (
                    <th
                      key={`hcp-front-${hole.holeNumber}`}
                      style={{
                        ...centeredThStyle,
                        ...stickyScoringHeaderRowThreeStyle,
                        color: "#555",
                        fontWeight: 500,
                      }}
                    >
                      {hole.handicap ?? ""}
                    </th>
                  ))}

                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />

                  {headerHoles.slice(9, 18).map((hole) => (
                    <th
                      key={`hcp-back-${hole.holeNumber}`}
                      style={{
                        ...centeredThStyle,
                        ...stickyScoringHeaderRowThreeStyle,
                        color: "#555",
                        fontWeight: 500,
                      }}
                    >
                      {hole.handicap ?? ""}
                    </th>
                  ))}

                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                  <th style={{ ...centeredThStyle, ...stickyScoringHeaderRowThreeStyle }} />
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIndex) => {
                  const rowStatus = normalizeParticipationStatus(
                    row.participationStatus,
                  );
                  const postingAdjustedScore = formatPostingAdjustedScore(row);

                  const outTotal = sumHoleRange(row.holes, 0, 9);
                  const inTotal = sumHoleRange(row.holes, 9, 18);
                  const total = outTotal + inTotal;
                  const totalDisplay = formatRoundTotal(row, total);
                  const netDisplay = formatNetTotal(row);

                  const previousRow = rowIndex > 0 ? rows[rowIndex - 1] : null;
                  const startsNewTeam =
                    rowIndex > 0 &&
                    (previousRow?.teamId ?? previousRow?.teamName) !==
                      (row.teamId ?? row.teamName);

                  return (
                    <tr
                      key={row.scorecardId}
                      className={[
                        "scorecard-player-row",
                        startsNewTeam ? "scorecard-team-start" : "",
                        rowStatus === "WITHDRAWN" ? "scorecard-row-withdrawn" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td
                        className="scorecard-player-cell"
                        style={{
                          ...tdStyle,
                          ...stickyColumnStyle,
                          width: "230px",
                          minWidth: "230px",
                          maxWidth: "230px",
                          boxShadow: "1px 0 0 #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                        >
                          <div className="scorecard-player-identity">
                            <span className="scorecard-player-name" title={row.playerName}>
                              {row.playerName}
                            </span>
                            <span
                              className={`scorecard-player-status${rowStatus === "WITHDRAWN" ? " scorecard-player-status--withdrawn" : ""}`}
                            >
                              {getPlayerRowStatusText(row)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              marginLeft: "auto",
                              flex: "0 0 auto",
                            }}
                          >
                          {!scoringReadOnly ? (
                            rowStatus === "WITHDRAWN" ? (
                              <>
                                <select
                                  aria-label={`Withdrawal hole for ${row.playerName}`}
                                  value={row.withdrawalHoleNumber ?? ""}
                                  onChange={(e) =>
                                    updateWithdrawalStatus(
                                      row.scorecardId,
                                      Number(e.target.value),
                                    )
                                  }
                                  disabled={
                                    saving || finalizing || scoringReadOnly
                                  }
                                  style={{
                                    ...compactSelectStyle,
                                    width: "44px",
                                    minWidth: "44px",
                                    height: "22px",
                                    fontSize: "0.72rem",
                                    padding: "1px 2px",
                                  }}
                                >
                                  {Array.from(
                                    { length: 18 },
                                    (_, index) => index + 1,
                                  ).map((holeNumber) => (
                                    <option key={holeNumber} value={holeNumber}>
                                      {holeNumber}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  style={activeStatusButtonStyle}
                                  onClick={() =>
                                    updateWithdrawalStatus(
                                      row.scorecardId,
                                      null,
                                    )
                                  }
                                  disabled={
                                    saving || finalizing || scoringReadOnly
                                  }
                                >
                                  Active
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                style={wdButtonStyle}
                                onClick={() =>
                                  markRowWithdrawn(row.scorecardId)
                                }
                                disabled={
                                  saving || finalizing || scoringReadOnly
                                }
                              >
                                WD
                              </button>
                            )
                          ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="scorecard-meta-cell">{row.teamName ?? ""}</td>
                      <td className="scorecard-meta-cell scorecard-tee-cell">{renderTeeSelector(row)}</td>
                      <td
                        className="scorecard-meta-cell"
                        title={row.handicapLabel ?? undefined}
                      >
                        {formatTripIndex(row.tripIndex)}
                      </td>
                      <td className="scorecard-meta-cell">{row.courseHandicap ?? ""}</td>
                      <td className="scorecard-meta-cell">{row.playingHandicap ?? ""}</td>

                      {row.holes.slice(0, 9).map((hole, index) => (
                        <td key={`front-${index}`} className="scorecard-score-cell" style={holeCellStyle}>
                          <input
                            ref={(element) =>
                              setInputRef(row.scorecardId, index, element)
                            }
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={hole}
                            disabled={
                              saving ||
                              finalizing ||
                              scoringReadOnly ||
                              !isHoleOpenForRow(row, index)
                            }
                            placeholder={
                              !isHoleOpenForRow(row, index) ? "WD" : undefined
                            }
                            onFocus={selectScoreInputValue}
                            onMouseUp={keepScoreInputValueSelected}
                            onChange={(e) =>
                              handlePlayerHoleChange(
                                row.scorecardId,
                                index,
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) =>
                              handleHoleKeyDown(e, row.scorecardId, index, hole)
                            }
                            className="scorecard-score-input"
                            style={
                              !isHoleOpenForRow(row, index)
                                ? {
                                    ...holeInputStyle,
                                    background: "#f3f4f6",
                                    color: "#9ca3af",
                                  }
                                : holeInputStyle
                            }
                          />
                        </td>
                      ))}

                      <td className="scorecard-summary-cell" style={compactSubtotalCellStyle}>
                        {outTotal > 0 ||
                        row.holes.slice(0, 9).some((hole) => hole !== "")
                          ? outTotal
                          : ""}
                      </td>

                      {row.holes.slice(9, 18).map((hole, index) => (
                        <td key={`back-${index}`} className="scorecard-score-cell" style={holeCellStyle}>
                          <input
                            ref={(element) =>
                              setInputRef(row.scorecardId, index + 9, element)
                            }
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={hole}
                            disabled={
                              saving ||
                              finalizing ||
                              scoringReadOnly ||
                              !isHoleOpenForRow(row, index + 9)
                            }
                            placeholder={
                              !isHoleOpenForRow(row, index + 9)
                                ? "WD"
                                : undefined
                            }
                            onFocus={selectScoreInputValue}
                            onMouseUp={keepScoreInputValueSelected}
                            onChange={(e) =>
                              handlePlayerHoleChange(
                                row.scorecardId,
                                index + 9,
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) =>
                              handleHoleKeyDown(
                                e,
                                row.scorecardId,
                                index + 9,
                                hole,
                              )
                            }
                            className="scorecard-score-input"
                            style={
                              !isHoleOpenForRow(row, index + 9)
                                ? {
                                    ...holeInputStyle,
                                    background: "#f3f4f6",
                                    color: "#9ca3af",
                                  }
                                : holeInputStyle
                            }
                          />
                        </td>
                      ))}

                      <td className="scorecard-summary-cell" style={compactSubtotalCellStyle}>
                        {inTotal > 0 ||
                        row.holes.slice(9, 18).some((hole) => hole !== "")
                          ? inTotal
                          : ""}
                      </td>

                      <td
                        className="scorecard-summary-cell scorecard-total-cell"
                        style={{
                          ...compactTotalCellStyle,
                          fontSize: totalDisplay.includes("(") ? "0.72rem" : undefined,
                          lineHeight: totalDisplay.includes("(") ? 1.05 : undefined,
                        }}
                        title={
                          totalDisplay.includes("(")
                            ? "Partial total for a mid-round withdrawal. Team holes after the WD use the remaining eligible players."
                            : undefined
                        }
                      >
                        {totalDisplay}
                      </td>
                      <td
                        className="scorecard-summary-cell scorecard-post-cell"
                        style={{
                          ...compactPostCellStyle,
                          fontSize: postingAdjustedScore.startsWith("No")
                            ? "0.72rem"
                            : undefined,
                          color: postingAdjustedScore.startsWith("No")
                            ? "#92400e"
                            : undefined,
                        }}
                        title={
                          postingAdjustedScore.includes("(")
                            ? "Posting adjusted gross for holes played. For 10-17 holes, post hole-by-hole in GHIN; GHIN applies expected score to unplayed holes."
                            : undefined
                        }
                      >
                        {postingAdjustedScore}
                      </td>
                      <td className="scorecard-summary-cell" style={compactSubtotalCellStyle}>{netDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {renderScoreActionPanel("bottom")}
      {status?.finalized && (
        <RoundCorrectionHistoryPanel roundId={status.roundId} />
      )}
    </div>
  );
}
