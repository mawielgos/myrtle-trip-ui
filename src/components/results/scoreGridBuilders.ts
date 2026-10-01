import { formatGameDescription } from "../../utils/gameFormat";
import type { HoleGameResult, HoleScoreDto, RoundGameResult, RoundScorecardSummary, ScorecardDetail } from "../../types/round";
import type { ScoreGridBuildContext, ScoreGridCellVariant, ScoreGridData, ScoreGridMetaRow, ScoreGridPlayerRow, ScoreGridSection } from "./scoreGridTypes";

export type TeamPlayerResult = {
  summary: RoundScorecardSummary;
  detail: ScorecardDetail | null;
};

export type TeamValidationGroup = {
  teamId: number;
  teamName: string;
  placement?: number | null;
  totalGross?: number | null;
  totalNet?: number | null;
  totalPoints?: number | null;
  holeResults: HoleGameResult[];
  players: TeamPlayerResult[];
};

function sumValues(values: Array<number | null | undefined>): number {
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i] ?? 0;
  }
  return sum;
}

export function getOutTotal(values: Array<number | null | undefined>): number {
  return sumValues(values.slice(0, 9));
}

export function getInTotal(values: Array<number | null | undefined>): number {
  return sumValues(values.slice(9, 18));
}

export function placementLabel(value?: number | null, tied?: boolean): string {
  if (value == null) {
    return "";
  }

  return tied ? `T${value}` : String(value);
}

export function isTieForPlacement(teamId: number, placement: number | null | undefined, teams: RoundGameResult["teams"]): boolean {
  if (placement == null) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < teams.length; i += 1) {
    if (teams[i].placement === placement) {
      count += 1;
    }
  }
  return count > 1;
}
function normalizeScoreGridFormat(format: string | null | undefined): string | null | undefined {
  switch (format) {
    case "TEAM_MIDDLE_MAN":
      return "MIDDLE_MAN";
    case "TEAM_ONE_TWO_THREE":
      return "ONE_TWO_THREE";
    case "TEAM_TWO_MAN_LOW_NET":
      return "TWO_MAN_LOW_NET";
    case "TEAM_THREE_LOW_NET":
      return "THREE_LOW_NET";
    default:
      return format;
  }
}

export function calculateTeamParTotal(
  format: string,
  holePars: number[]
): number {
  const normalizedFormat = normalizeScoreGridFormat(format);
  if (!holePars || holePars.length !== 18) return 0;

  let total = 0;

  for (let i = 0; i < 18; i++) {
    const par = holePars[i];

    switch (normalizedFormat) {
      case "MIDDLE_MAN":
        total += par * 2;
        break;

      case "ONE_TWO_THREE": {
        const mod = i % 3;
        const multiplier = mod === 0 ? 1 : mod === 1 ? 2 : 3;
        total += par * multiplier;
        break;
      }

      case "THREE_LOW_NET":
        total += par * 3;
        break;

      case "TEAM_TWO_LOW_NET":
        total += par * 2;
        break;

      case "TWO_MAN_LOW_NET":
      case "TEAM_SCRAMBLE":
      default:
        total += par;
        break;
    }
  }

  return total;
}
function getFormatTotalLabel(format?: string | null): string {
  const normalizedFormat = normalizeScoreGridFormat(format);
  switch (normalizedFormat) {
    case "MIDDLE_MAN":
      return "Middle-Man Total";
    case "ONE_TWO_THREE":
      return "1-2-3 Total";
    case "THREE_LOW_NET":
      return "3 Low Net Total";
    case "TEAM_TWO_LOW_NET":
      return "2 Low Net Total";
    case "TWO_MAN_LOW_NET":
      return "Net Total";
    default:
      return "Team Total";
  }
}

function getCountingTarget(format: string | null | undefined, holeNumber: number, playerCount: number): number {
  const normalizedFormat = normalizeScoreGridFormat(format);

  if (normalizedFormat === "ONE_TWO_THREE") {
    const cycle = (holeNumber - 1) % 3;
    if (cycle === 0) {
      return Math.min(1, playerCount);
    }
    if (cycle === 1) {
      return Math.min(2, playerCount);
    }
    return Math.min(3, playerCount);
  }

  if (normalizedFormat === "THREE_LOW_NET") {
    return Math.min(3, playerCount);
  }

  if (normalizedFormat === "TEAM_TWO_LOW_NET") {
    return Math.min(2, playerCount);
  }

  if (normalizedFormat === "MIDDLE_MAN") {
    if (playerCount <= 2) {
      return playerCount;
    }
    return Math.max(playerCount - 2, 1);
  }

  if (normalizedFormat === "TWO_MAN_LOW_NET") {
    return Math.min(1, playerCount);
  }

  return playerCount;
}

function getCountedPlayerIndexesForHole(
  format: string | null | undefined,
  holeNumber: number,
  netValues: Array<number | null | undefined>,
): Set<number> {
  const normalizedFormat = normalizeScoreGridFormat(format);
  const scoredPlayers: Array<{ playerIndex: number; value: number }> = [];

  for (let i = 0; i < netValues.length; i += 1) {
    const value = netValues[i];
    if (value != null) {
      scoredPlayers.push({ playerIndex: i, value });
    }
  }

  scoredPlayers.sort((a, b) => {
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    return a.playerIndex - b.playerIndex;
  });

  const countedIndexes = new Set<number>();

  if (normalizedFormat === "MIDDLE_MAN") {
    if (scoredPlayers.length <= 2) {
      for (let i = 0; i < scoredPlayers.length; i += 1) {
        countedIndexes.add(scoredPlayers[i].playerIndex);
      }
      return countedIndexes;
    }

    for (let i = 1; i < scoredPlayers.length - 1; i += 1) {
      countedIndexes.add(scoredPlayers[i].playerIndex);
    }
    return countedIndexes;
  }

  const count = getCountingTarget(format, holeNumber, scoredPlayers.length);
  for (let i = 0; i < count; i += 1) {
    countedIndexes.add(scoredPlayers[i].playerIndex);
  }

  return countedIndexes;
}


function normalizeParticipationStatus(value?: string | null): string {
  return String(value ?? "ACTIVE").trim().toUpperCase();
}

function getWithdrawalHoleNumber(summary: RoundScorecardSummary, detail: ScorecardDetail | null): number | null {
  const rawValue = detail?.withdrawalHoleNumber ?? summary.withdrawalHoleNumber ?? null;
  if (rawValue == null) {
    return null;
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(0, Math.min(18, Math.trunc(value)));
}

function isWithdrawnAfterHole(summary: RoundScorecardSummary, detail: ScorecardDetail | null, holeNumber: number): boolean {
  const status = normalizeParticipationStatus(detail?.participationStatus ?? summary.participationStatus);
  const withdrawalHoleNumber = getWithdrawalHoleNumber(summary, detail);
  return status === "WITHDRAWN" && withdrawalHoleNumber != null && holeNumber > withdrawalHoleNumber;
}

function formatPartialTotal(value: number | null | undefined, playedHoles: number | null): string | number | null {
  if (value == null) {
    return null;
  }
  if (playedHoles != null && playedHoles > 0 && playedHoles < 18) {
    return `${value} (${playedHoles}h)`;
  }
  return value;
}

function formatPartialNineTotal(value: number | null | undefined, playedHoles: number): string | number | null {
  if (value == null) {
    return null;
  }
  if (playedHoles > 0 && playedHoles < 9) {
    return `${value} (${playedHoles}h)`;
  }
  if (playedHoles === 0) {
    return "WD";
  }
  return value;
}

function findPlayerHole(detail: ScorecardDetail | null, holeNumber: number): HoleScoreDto | undefined {
  if (!detail) {
    return undefined;
  }

  for (let i = 0; i < detail.holes.length; i += 1) {
    if (detail.holes[i].holeNumber === holeNumber) {
      return detail.holes[i];
    }
  }
  return undefined;
}

function findTeamHole(team: TeamValidationGroup, holeNumber: number): HoleGameResult | undefined {
  for (let i = 0; i < team.holeResults.length; i += 1) {
    if (team.holeResults[i].holeNumber === holeNumber) {
      return team.holeResults[i];
    }
  }
  return undefined;
}

export function buildScoreGridData(
  context: ScoreGridBuildContext,
  groups: TeamValidationGroup[],
  orderedTeams: RoundGameResult["teams"],
  subtitle?: string,
): ScoreGridData {
  const parValues = context.holeMeta.length > 0
    ? context.holeMeta.map((hole) => hole.par ?? "")
    : context.holes.map((holeNumber) => holeNumber);
  const hdcpValues = context.holeMeta.length > 0
    ? context.holeMeta.map((hole) => hole.handicap ?? "")
    : context.holes.map((holeNumber) => holeNumber);

  const parNumeric = context.holeMeta.map((hole) => hole.par ?? 0);
  const metaRows: ScoreGridMetaRow[] = [
    {
      label: "Par",
      values: parValues,
      out: getOutTotal(parNumeric),
      in: getInTotal(parNumeric),
      total: sumValues(parNumeric),
    },
    {
      label: "Course Handicap",
      values: hdcpValues,
    },
  ];

  const sections: ScoreGridSection[] = groups.map((team) => {
    const playerNetMatrix: Array<Array<number | null | undefined>> = [];

    for (let i = 0; i < team.players.length; i += 1) {
      const netValues: Array<number | null | undefined> = [];
      for (let j = 0; j < context.holes.length; j += 1) {
        const holeNumber = context.holes[j];
        const player = team.players[i];
        const hole = findPlayerHole(player.detail, holeNumber);
        netValues.push(isWithdrawnAfterHole(player.summary, player.detail, holeNumber) ? null : (hole?.netStrokes ?? null));
      }
      playerNetMatrix.push(netValues);
    }

    const countedPerHole: Array<Set<number>> = [];
    for (let holeIndex = 0; holeIndex < context.holes.length; holeIndex += 1) {
      const holeNumber = context.holes[holeIndex];
      const columnValues: Array<number | null | undefined> = [];
      for (let playerIndex = 0; playerIndex < playerNetMatrix.length; playerIndex += 1) {
        columnValues.push(playerNetMatrix[playerIndex][holeIndex]);
      }
      countedPerHole.push(getCountedPlayerIndexesForHole(context.format, holeNumber, columnValues));
    }

    const players: ScoreGridPlayerRow[] = team.players.map((player, playerIndex) => {
      const grossValues: Array<number | null | undefined> = [];
      const netValues: Array<number | null | undefined> = [];
      const netCellVariants: ScoreGridCellVariant[] = [];

      for (let i = 0; i < context.holes.length; i += 1) {
        const holeNumber = context.holes[i];
        const hole = findPlayerHole(player.detail, holeNumber);
        const withdrawnAfterThisHole = isWithdrawnAfterHole(player.summary, player.detail, holeNumber);
        const grossValue = withdrawnAfterThisHole ? null : (hole?.strokes ?? null);
        const netValue = withdrawnAfterThisHole ? null : (hole?.netStrokes ?? null);
        grossValues.push(grossValue);
        netValues.push(netValue);

        if (withdrawnAfterThisHole) {
          netCellVariants.push("wd");
        } else {
          const hasValue = netValue != null;
          const isCounted = hasValue && countedPerHole[i].has(playerIndex);
          const isDropped = hasValue && !isCounted;
          netCellVariants.push(isCounted ? "counted" : isDropped ? "dropped" : "default");
        }
      }

      const status = normalizeParticipationStatus(player.detail?.participationStatus ?? player.summary.participationStatus);
      const withdrawalHoleNumber = getWithdrawalHoleNumber(player.summary, player.detail);
      const isPartialWithdrawal = status === "WITHDRAWN" && withdrawalHoleNumber != null && withdrawalHoleNumber < 18;
      const frontPlayedHoles = isPartialWithdrawal ? Math.min(withdrawalHoleNumber ?? 0, 9) : 9;
      const backPlayedHoles = isPartialWithdrawal ? Math.max(0, Math.min((withdrawalHoleNumber ?? 0) - 9, 9)) : 9;

      return {
        key: `player-${player.summary.scorecardId}`,
        playerName: player.summary.playerName,
        courseHandicap: player.summary.courseHandicap ?? null,
        grossValues,
        netValues,
        grossOut: formatPartialNineTotal(getOutTotal(grossValues), frontPlayedHoles),
        grossIn: formatPartialNineTotal(getInTotal(grossValues), backPlayedHoles),
        grossTotal: formatPartialTotal(player.summary.grossScore ?? null, isPartialWithdrawal ? withdrawalHoleNumber : null),
        netOut: isPartialWithdrawal ? null : getOutTotal(netValues),
        netIn: isPartialWithdrawal ? null : getInTotal(netValues),
        netTotal: isPartialWithdrawal ? null : (player.summary.netScore ?? null),
        participationStatus: status,
        withdrawalHoleNumber,
        netCellVariants,
      };
    });

    const aggregateValues = context.holes.map((holeNumber) => findTeamHole(team, holeNumber)?.netScore ?? null);
    const orderedMatch = orderedTeams.find((orderedTeam) => orderedTeam.teamId === team.teamId);
    const rankLabel = placementLabel(team.placement, isTieForPlacement(team.teamId, team.placement, orderedTeams));

    return {
      key: `team-${team.teamId}`,
      teamName: team.teamName,
      players,
      aggregate: {
        label: getFormatTotalLabel(context.format),
        values: aggregateValues,
        out: getOutTotal(aggregateValues),
        in: getInTotal(aggregateValues),
        total: team.totalNet ?? orderedMatch?.totalNet ?? null,
        rankLabel,
      },
    };
  });

  return {
    title: `${formatLabel(context.format)} Results`,
    subtitle,
    holes: context.holes,
    metaRows,
    sections,
  };
}

function formatLabel(value?: string | null): string {
  return formatGameDescription(value);
}
