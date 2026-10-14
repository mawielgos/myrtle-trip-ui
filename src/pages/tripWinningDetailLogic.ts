import type {
  TournamentStandings,
  PrizeRecalculationResponse,
  PrizeSchedule,
  PrizeWinningResponse,
  TripPlayer,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";
import { formatRoundEventDescription } from "../utils/roundDisplay";
import { formatWholeDollarCurrency, truncateWholeDollars } from "../utils/moneyFormat";

export type RoundPrizeColumn = {
  key: string;
  gameKey: string;
  roundNumber: number;
  roundId: number | null;
  dayLabel: string;
  dateLabel: string;
  roundName: string;
};

export type TournamentPositionColumn = {
  key: "LOW_NET" | "LOW_GROSS";
  label: string;
};

export type PlayerPublishRow = {
  playerKey: string;
  playerId: number | null;
  playerName: string;
  totalMoney: number;
  rank: number;
  roundCells: Record<string, string>;
  tournamentPositions: Record<string, number | null>;
  paid: boolean;
  paidAt: string | null;
};

const FOUR_DAY_GAME_KEY = "FOUR_DAY_INDIVIDUAL";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatPaidAt(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

export function formatOrdinal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }

  const absolute = Math.abs(value);
  const lastTwo = absolute % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${value}th`;
  }

  switch (absolute % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function cleanGameName(gameName: string | null | undefined): string {
  return (gameName ?? "")
    .replace(/^Round\s+\d+\s*-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRoundEventTypeFromGameKey(
  gameKey: string | null | undefined,
): string | null {
  const value = (gameKey ?? "").trim();
  const separator = "_EVENT_";
  const separatorIndex = value.indexOf(separator);
  if (separatorIndex < 0) {
    return null;
  }

  const eventType = value.substring(separatorIndex + separator.length).trim();
  return eventType || null;
}

export function resolveWinningEventType(winning: PrizeWinningResponse): string | null {
  return winning.eventType ?? parseRoundEventTypeFromGameKey(winning.gameKey);
}

export function formatRoundFormat(format?: string | null): string {
  return formatRoundEventDescription(format);
}

export function formatResultGameName(
  gameName: string | null | undefined,
  eventType?: string | null,
): string {
  if (eventType) {
    switch (eventType) {
      case "INDIVIDUAL_LOW_NET":
        return "Low Net";
      case "INDIVIDUAL_LOW_GROSS":
        return "Low Gross";
      case "TEAM_TWO_MAN_LOW_NET":
        return "Best Ball";
      case "TEAM_TWO_LOW_NET":
        return "2-Low Net";
      case "TEAM_MIDDLE_MAN":
        return "Middle Man";
      case "TEAM_ONE_TWO_THREE":
        return "1-2-3";
      case "TEAM_THREE_LOW_NET":
        return "3 Ball Total";
      case "TEAM_SCRAMBLE":
        return "Scramble";
      default:
        return formatRoundEventDescription(eventType);
    }
  }

  const value = cleanGameName(gameName);

  if (/two[-\s]*man|2[-\s]*man/i.test(value)) {
    return "Best Ball";
  }
  if (/three\s+low|3\s+low/i.test(value)) {
    return "3 Ball Total";
  }
  if (/scramble/i.test(value)) {
    return "Scramble";
  }

  return value || "Prize";
}

export function formatRoundResultLabel(winning: PrizeWinningResponse): string {
  const rank = winning.sourceRank ?? winning.finishingPlace ?? null;
  const ordinal = formatOrdinal(rank);
  const game = formatResultGameName(
    winning.gameName,
    resolveWinningEventType(winning),
  );
  return [ordinal, game].filter(Boolean).join(" ");
}

export function parseRoundDate(
  round: TripRoundListItem | null | undefined,
): Date | null {
  if (!round?.roundDate) {
    return null;
  }

  const parsed = new Date(`${round.roundDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getDayLabel(round: TripRoundListItem | null | undefined): string {
  const date = parseRoundDate(round);
  return date ? dayFormatter.format(date) : "Round";
}

export function getDateLabel(round: TripRoundListItem | null | undefined): string {
  const date = parseRoundDate(round);
  return date ? shortDateFormatter.format(date) : "";
}

export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function makePlayerKey(
  playerId: number | null | undefined,
  playerName: string | null | undefined,
): string {
  if (playerId != null && Number.isFinite(playerId)) {
    return `id-${playerId}`;
  }

  return `name-${(playerName ?? "").trim().toLowerCase()}`;
}

export function buildCsvValue(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}


export function buildRoundPrizeColumns(
  schedules: PrizeSchedule[],
  winnings: PrizeRecalculationResponse | null,
  rounds: TripRoundListItem[],
): RoundPrizeColumn[] {
  const scheduleByGameKey = new Map<string, PrizeSchedule>();
  for (const schedule of schedules) {
    scheduleByGameKey.set(schedule.gameKey, schedule);
  }

  const roundByNumber = new Map<number, TripRoundListItem>();
  for (const round of rounds) {
    if (round.roundNumber != null) {
      roundByNumber.set(round.roundNumber, round);
    }
  }

  const byKey = new Map<string, RoundPrizeColumn>();

  for (const schedule of schedules) {
    if (schedule.gameKey === FOUR_DAY_GAME_KEY || schedule.roundNumber == null) {
      continue;
    }

    const roundNumber = schedule.roundNumber;
    const key = `round-${roundNumber}-${schedule.gameKey}`;
    const round = roundByNumber.get(roundNumber);
    byKey.set(key, {
      key,
      gameKey: schedule.gameKey,
      roundNumber,
      roundId: schedule.roundId ?? null,
      dayLabel: getDayLabel(round),
      dateLabel: getDateLabel(round),
      roundName:
        formatRoundEventDescription(
          parseRoundEventTypeFromGameKey(schedule.gameKey),
          cleanGameName(schedule.gameName),
        ) || formatRoundFormat(round?.gameFormat),
    });
  }

  for (const winning of winnings?.winnings ?? []) {
    if (winning.gameKey === FOUR_DAY_GAME_KEY || winning.roundNumber == null) {
      continue;
    }

    const schedule = scheduleByGameKey.get(winning.gameKey);
    const roundNumber = schedule?.roundNumber ?? winning.roundNumber;
    if (roundNumber == null) {
      continue;
    }

    const key = `round-${roundNumber}-${winning.gameKey}`;
    if (byKey.has(key)) {
      continue;
    }

    const round = roundByNumber.get(roundNumber);
    byKey.set(key, {
      key,
      gameKey: winning.gameKey,
      roundNumber,
      roundId: winning.roundId ?? schedule?.roundId ?? null,
      dayLabel: getDayLabel(round),
      dateLabel: getDateLabel(round),
      roundName:
        formatRoundEventDescription(
          resolveWinningEventType(winning) ??
            parseRoundEventTypeFromGameKey(schedule?.gameKey),
          cleanGameName(schedule?.gameName ?? winning.gameName),
        ) || formatRoundFormat(round?.gameFormat),
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.roundNumber !== b.roundNumber) {
      return a.roundNumber - b.roundNumber;
    }
    return a.roundName.localeCompare(b.roundName);
  });
}

export function buildTournamentPositionColumns(
  tournamentSetup: TripTournamentSetup | null,
): TournamentPositionColumn[] {
  if (tournamentSetup?.enabled !== true) {
    return [];
  }

  const columns: TournamentPositionColumn[] = [];
  const lowNetName = tournamentSetup.lowNetName?.trim() || "Low Net";
  const lowGrossName = tournamentSetup.lowGrossName?.trim() || "Low Gross";

  if (tournamentSetup.lowNetEnabled !== false) {
    columns.push({ key: "LOW_NET", label: lowNetName });
  }
  if (tournamentSetup.lowGrossEnabled === true) {
    columns.push({ key: "LOW_GROSS", label: lowGrossName });
  }

  return columns;
}

export function buildPlayerPublishRows(
  players: TripPlayer[],
  columns: RoundPrizeColumn[],
  tournamentColumns: TournamentPositionColumn[],
  standingsByCompetition: Partial<
    Record<"LOW_NET" | "LOW_GROSS", TournamentStandings>
  >,
  winnings: PrizeRecalculationResponse | null,
  schedules: PrizeSchedule[],
): PlayerPublishRow[] {
  const scheduleByGameKey = new Map<string, PrizeSchedule>();
  for (const schedule of schedules) {
    scheduleByGameKey.set(schedule.gameKey, schedule);
  }

  const byPlayerKey = new Map<string, PlayerPublishRow>();
  const tournamentPositionByPlayerKey = new Map<
    string,
    Record<string, number | null>
  >();

  for (const column of tournamentColumns) {
    const standings = standingsByCompetition[column.key];
    for (const row of standings?.rows ?? []) {
      const playerKey = makePlayerKey(row.playerId, row.playerName);
      const current = tournamentPositionByPlayerKey.get(playerKey) ?? {};
      current[column.key] = row.position ?? null;
      tournamentPositionByPlayerKey.set(playerKey, current);
    }
  }

  const payoutStatusByPlayerKey = new Map<
    string,
    { paid: boolean; paidAt: string | null }
  >();
  const payoutTotalByPlayerKey = new Map<string, number>();
  for (const playerTotal of winnings?.playerTotals ?? []) {
    const playerKey = makePlayerKey(playerTotal.playerId, playerTotal.playerName);
    payoutStatusByPlayerKey.set(playerKey, {
      paid: Boolean(playerTotal.paid),
      paidAt: playerTotal.paidAt ?? null,
    });
    payoutTotalByPlayerKey.set(
      playerKey,
      truncateWholeDollars(playerTotal.totalAmount),
    );
  }

  for (const player of players) {
    const playerKey = makePlayerKey(player.playerId, player.displayName);
    byPlayerKey.set(playerKey, {
      playerKey,
      playerId: player.playerId,
      playerName: player.displayName,
      totalMoney: payoutTotalByPlayerKey.get(playerKey) ?? 0,
      rank: 0,
      roundCells: {},
      tournamentPositions: tournamentPositionByPlayerKey.get(playerKey) ?? {},
      paid: payoutStatusByPlayerKey.get(playerKey)?.paid ?? false,
      paidAt: payoutStatusByPlayerKey.get(playerKey)?.paidAt ?? null,
    });
  }

  const columnKeyByRoundAndGame = new Map<string, string>();
  const columnKeyByGame = new Map<string, string>();
  for (const column of columns) {
    columnKeyByRoundAndGame.set(
      `${column.roundNumber}-${column.gameKey}`,
      column.key,
    );
    columnKeyByGame.set(column.gameKey, column.key);
  }

  for (const winning of winnings?.winnings ?? []) {
    const playerName = (winning.playerName ?? "").trim();
    const playerKey = makePlayerKey(winning.playerId, playerName);
    if (!playerName && winning.playerId == null) {
      continue;
    }

    let row = byPlayerKey.get(playerKey);
    if (!row) {
      row = {
        playerKey,
        playerId: winning.playerId ?? null,
        playerName: playerName || "Unknown Player",
        totalMoney: payoutTotalByPlayerKey.get(playerKey) ?? 0,
        rank: 0,
        roundCells: {},
        tournamentPositions: tournamentPositionByPlayerKey.get(playerKey) ?? {},
        paid: payoutStatusByPlayerKey.get(playerKey)?.paid ?? false,
        paidAt: payoutStatusByPlayerKey.get(playerKey)?.paidAt ?? null,
      };
      byPlayerKey.set(playerKey, row);
    }

    if (winning.gameKey === FOUR_DAY_GAME_KEY) {
      continue;
    }

    const schedule = scheduleByGameKey.get(winning.gameKey);
    const roundNumber = winning.roundNumber ?? schedule?.roundNumber ?? null;
    const columnKey =
      roundNumber == null
        ? columnKeyByGame.get(winning.gameKey)
        : (columnKeyByRoundAndGame.get(`${roundNumber}-${winning.gameKey}`) ??
          columnKeyByGame.get(winning.gameKey));

    if (!columnKey) {
      continue;
    }

    const label = formatRoundResultLabel(winning);
    if (!label) {
      continue;
    }

    const current = row.roundCells[columnKey];
    if (!current) {
      row.roundCells[columnKey] = label;
    } else if (!current.split("; ").includes(label)) {
      row.roundCells[columnKey] = `${current}; ${label}`;
    }
  }

  const sorted = Array.from(byPlayerKey.values()).sort((a, b) => {
    if (b.totalMoney !== a.totalMoney) {
      return b.totalMoney - a.totalMoney;
    }
    return compareNames(a.playerName, b.playerName);
  });

  let previousAmount: number | null = null;
  let previousRank = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index];
    if (previousAmount != null && row.totalMoney === previousAmount) {
      row.rank = previousRank;
    } else {
      row.rank = index + 1;
      previousRank = row.rank;
      previousAmount = row.totalMoney;
    }
  }

  return sorted;
}

export function buildPayoutSummary(rows: PlayerPublishRow[]) {
  const totalPayout = rows.reduce((sum, row) => sum + row.totalMoney, 0);
  const totalPaid = rows.reduce(
    (sum, row) => sum + (row.paid ? row.totalMoney : 0),
    0,
  );
  const totalUnpaid = totalPayout - totalPaid;
  const unpaidRows = rows.filter(
    (row) => row.totalMoney > 0 && !row.paid && row.playerId != null,
  );

  return { totalPayout, totalPaid, totalUnpaid, unpaidRows };
}

export function buildWinningDetailCsvRows(
  rows: PlayerPublishRow[],
  columns: RoundPrizeColumn[],
  tournamentColumns: TournamentPositionColumn[],
  totalPayout: number,
): string[][] {
  const csvRows: string[][] = [];
  csvRows.push(["Winning Detail"]);
  csvRows.push([]);
  csvRows.push([
    "Name",
    "Money",
    "Paid",
    "Rank",
    ...columns.map((column) =>
      `${column.dayLabel} ${column.dateLabel} ${column.roundName}`.trim(),
    ),
    ...tournamentColumns.map((column) => column.label),
  ]);

  for (const row of rows) {
    csvRows.push([
      row.playerName,
      formatWholeDollarCurrency(row.totalMoney),
      row.totalMoney > 0 ? (row.paid ? "Paid" : "Unpaid") : "",
      row.totalMoney > 0 ? String(row.rank) : "",
      ...columns.map((column) => row.roundCells[column.key] ?? ""),
      ...tournamentColumns.map((column) => {
        const position = row.tournamentPositions[column.key];
        return position == null ? "" : String(position);
      }),
    ]);
  }

  csvRows.push(["Total Payout:", formatWholeDollarCurrency(totalPayout)]);
  return csvRows;
}


