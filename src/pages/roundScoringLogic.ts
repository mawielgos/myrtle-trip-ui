import type {
  HoleScoreDto,
  RoundScorecardSummary,
  RoundStatus,
  RoundTeeOption,
  ScorecardDetail,
} from "../types/round";

export type ScoreRow = {
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

export function isVisibleOnScoringPage(
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

export function normalizeParticipationStatus(
  status?: string | null,
): "ACTIVE" | "NO_SHOW" | "WITHDRAWN" {
  const normalized = String(status ?? "ACTIVE")
    .trim()
    .toUpperCase();
  return normalized === "NO_SHOW" || normalized === "WITHDRAWN"
    ? normalized
    : "ACTIVE";
}

export function isHoleOpenForRow(row: ScoreRow, holeIndex: number): boolean {
  const status = normalizeParticipationStatus(row.participationStatus);
  if (status !== "WITHDRAWN") {
    return status === "ACTIVE";
  }
  const wdAfter = Number(row.withdrawalHoleNumber ?? 0);
  return wdAfter > 0 && holeIndex + 1 <= wdAfter;
}

export function getRequiredHoleCount(row: ScoreRow): number {
  return normalizeParticipationStatus(row.participationStatus) === "WITHDRAWN"
    ? Math.max(0, Math.min(18, Number(row.withdrawalHoleNumber ?? 0)))
    : 18;
}

export function getFilledRequiredHoleCount(row: ScoreRow): number {
  return row.holes.filter(
    (hole, index) => isHoleOpenForRow(row, index) && hole !== "",
  ).length;
}

export function rowHasRequiredScores(row: ScoreRow): boolean {
  const requiredHoleCount = getRequiredHoleCount(row);
  if (requiredHoleCount <= 0) {
    return false;
  }
  return row.holes.every(
    (hole, index) => !isHoleOpenForRow(row, index) || hole !== "",
  );
}

export function getHandicapStrokesForHole(
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

export function getPostingAdjustedScore(row: ScoreRow): {
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

export function formatPostingAdjustedScore(row: ScoreRow): string {
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

export function compareScoreRowsByGroupOrder(a: ScoreRow, b: ScoreRow): number {
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

export function buildRows(
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

export function normalizeGender(gender?: string | null): "M" | "F" {
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

export function getTeeRatingForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): number {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.womenCourseRating ?? -999;
  }

  return tee.menCourseRating ?? -999;
}

export function getTeeDisplayForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): string {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.displayNameForWomen || tee.displayName || tee.teeName;
  }

  return tee.displayNameForMen || tee.displayName || tee.teeName;
}

export function teeIsEligibleForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): boolean {
  const normalizedGender = normalizeGender(gender);

  if (normalizedGender === "F") {
    return tee.eligibleForWomen === true;
  }

  return tee.eligibleForMen !== false;
}

export function getEligibleSortedTeesForPlayer(
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

export function scrubScoreInput(value: string, maxLength: number): string {
  return value.replace(/[^0-9]/g, "").slice(0, maxLength);
}

export function shouldAutoAdvanceScoreInput(value: string): boolean {
  if (value.length >= 2) {
    return true;
  }

  return ["2", "3", "4", "5", "6", "7", "8", "9"].includes(value);
}
