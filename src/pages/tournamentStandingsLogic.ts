import type { CSSProperties } from "react";
import type {
  TournamentStandingRound,
  TournamentStandingRow,
  TournamentStandings,
  PrizeSchedule,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";
import { formatCurrencyCents, formatMoneyAmount } from "../utils/moneyFormat";

export function formatToPar(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  if (value === 0) {
    return "E";
  }
  return value > 0 ? `+${value}` : `${value}`;
}

export function formatMoney(
  value: number | null | undefined,
  isFinal: boolean,
): string {
  if (!isFinal || value == null) {
    return "";
  }
  return formatCurrencyCents(value);
}

export function buildToParStyle(value: number | null | undefined): CSSProperties {
  if (value == null) {
    return { color: "#999" };
  }

  if (value < 0) {
    return {
      color: "#c1121f",
      fontWeight: 700,
    };
  }

  if (value === 0) {
    return {
      color: "#222",
      fontWeight: 600,
    };
  }

  return {
    color: "#222",
    fontWeight: 600,
  };
}

export function buildNetScoreStyle(
  round: TournamentStandingRound | null,
): CSSProperties {
  if (!round || round.score == null) {
    return {};
  }

  if ((round.toPar ?? 0) < 0) {
    return {
      color: "#c1121f",
      fontWeight: 700,
    };
  }

  return {
    color: "#222",
    fontWeight: 700,
  };
}

export function formatGeneratedTimestamp(): string {
  return new Date().toLocaleString();
}

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parts = value.split("-").map((part) => Number(part));
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getTripDateRange(rounds: TripRoundListItem[]): string {
  const dates = rounds
    .map((round) => round.roundDate)
    .filter((value): value is string => Boolean(value))
    .sort();

  if (dates.length === 0) {
    return "";
  }

  const start = formatDisplayDate(dates[0]);
  const end = formatDisplayDate(dates[dates.length - 1]);

  if (!end || start === end) {
    return start;
  }

  return `${start} – ${end}`;
}

export function sanitizeFileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "event";
}

export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }

  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

export function normalizeReportText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00e2\u20ac\u00a2/g, " - ")
    .replace(/[•–—]/g, " - ")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDisplayRoundLabel(label: string | null | undefined): string {
  return normalizeReportText(label);
}

export function getRoundHeaderParts(label: string | null | undefined): {
  round: string;
  date: string;
  course: string;
} {
  const normalized = getDisplayRoundLabel(label);
  const parts = normalized
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    round: parts[0] ?? normalized,
    date: parts[1] ?? "",
    course: parts.slice(2).join(" - "),
  };
}

export function buildTournamentStandingsCsv(
  standings: TournamentStandings,
  rows: TournamentStandingRow[],
  tournamentName: string,
  configuredPurse: number,
): string {
  const header = ["Position", "Player"];

  for (const label of standings.roundLabels) {
    const displayLabel = getDisplayRoundLabel(label);
    header.push(displayLabel + " Net");
    header.push(displayLabel + " To Par");
  }

  header.push("Total");
  header.push("Total To Par");
  header.push("Winnings");

  const lines: string[][] = [];
  lines.push([tournamentName]);
  lines.push(["Final Leaderboard"]);
  lines.push(["Event", standings.tripName]);
  lines.push(["Status", renderStatusText(standings)]);
  if (configuredPurse > 0) {
    lines.push(["Total Purse", formatMoneyAmount(configuredPurse)]);
  }
  const shownWinningsTotal = rows.reduce(
    (total, row) => total + (Number(row.money) || 0),
    0,
  );
  if (standings.leaderboardFinal && shownWinningsTotal > 0) {
    lines.push(["Final Winnings Total", formatMoneyAmount(shownWinningsTotal)]);
  }
  lines.push(["Generated", formatGeneratedTimestamp()]);
  lines.push([]);
  lines.push(header);

  for (const row of rows) {
    const line: string[] = [formatPosition(row, rows), row.playerName];

    for (const label of standings.roundLabels) {
      const round = getRoundForLabel(row, label);
      line.push(round?.score == null ? "" : String(round.score));
      line.push(round ? formatToPar(round.toPar) : "");
    }

    line.push(String(row.totalScore));
    line.push(formatToPar(row.totalToPar));
    line.push(formatMoney(row.money, standings.leaderboardFinal));
    lines.push(line);
  }

  lines.push([]);
  lines.push([
    standings.leaderboardFinal
      ? "Winnings shown only after the full tournament is complete."
      : "Winnings remain blank until all tournament rounds are complete.",
  ]);

  return lines
    .map((line) => line.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");
}

export function getRoundForLabel(
  row: TournamentStandingRow,
  label: string,
): TournamentStandingRound | null {
  const match = row.rounds.find((round) => round.label === label);
  return match ?? null;
}

export function renderStatusText(standings: TournamentStandings): string {
  if (standings.leaderboardFinal) {
    return "Final leaderboard";
  }

  return `Through ${standings.completedRounds} of ${standings.requiredRounds} rounds`;
}

export function getTournamentPrizeSchedule(
  prizeSchedules: PrizeSchedule[],
  competition: string,
): PrizeSchedule | null {
  const desiredKey =
    competition === "LOW_GROSS" ? "TOURNAMENT_LOW_GROSS" : "TOURNAMENT_LOW_NET";
  const direct = prizeSchedules.find(
    (schedule) => (schedule.gameKey ?? "").toUpperCase() === desiredKey,
  );
  if (direct) {
    return direct;
  }
  if (competition === "LOW_NET") {
    return (
      prizeSchedules.find(
        (schedule) =>
          (schedule.gameKey ?? "").toUpperCase() === "FOUR_DAY_INDIVIDUAL",
      ) ?? null
    );
  }
  return null;
}

export function getTournamentName(
  standings: TournamentStandings | null,
  prizeSchedules: PrizeSchedule[],
  competition: string,
): string {
  const persistedName = standings?.tournamentName?.trim();
  if (persistedName) {
    return persistedName;
  }

  const tournamentSchedule = getTournamentPrizeSchedule(
    prizeSchedules,
    competition,
  );
  const configuredName = tournamentSchedule?.gameName?.trim();
  return configuredName && configuredName.length > 0
    ? configuredName
    : "Tournament Standings";
}

export function getConfiguredCompetitionName(
  setup: TripTournamentSetup | null,
  competition: "LOW_NET" | "LOW_GROSS",
): string {
  const configured =
    competition === "LOW_GROSS" ? setup?.lowGrossName : setup?.lowNetName;
  const fallback = competition === "LOW_GROSS" ? "Low Gross" : "Low Net";
  const trimmed = configured?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function isCompetitionEnabled(
  setup: TripTournamentSetup | null,
  competition: "LOW_NET" | "LOW_GROSS",
): boolean {
  if (setup?.enabled !== true) {
    return false;
  }
  return competition === "LOW_GROSS"
    ? setup.lowGrossEnabled === true
    : setup.lowNetEnabled !== false;
}

export function getConfiguredPurse(
  prizeSchedules: PrizeSchedule[],
  competition: string,
): number {
  const tournamentSchedule = getTournamentPrizeSchedule(
    prizeSchedules,
    competition,
  );
  if (!tournamentSchedule?.payouts) {
    return 0;
  }

  return tournamentSchedule.payouts.reduce((total, payout) => {
    return total + (Number(payout.amountPerPlayer) || 0);
  }, 0);
}

export function getPaidPlaces(
  prizeSchedules: PrizeSchedule[],
  competition: string,
): number {
  const tournamentSchedule = getTournamentPrizeSchedule(
    prizeSchedules,
    competition,
  );
  if (!tournamentSchedule?.payouts) {
    return 0;
  }

  return tournamentSchedule.payouts.filter(
    (payout) => Number(payout.amountPerPlayer) > 0,
  ).length;
}

export function getShownWinningsTotal(
  rows: TournamentStandingRow[],
  isFinal: boolean,
): number {
  if (!isFinal) {
    return 0;
  }

  return rows.reduce((total, row) => total + (Number(row.money) || 0), 0);
}

export function isTiedPosition(
  row: TournamentStandingRow,
  rows: TournamentStandingRow[],
): boolean {
  if (row.position == null) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].position === row.position) {
      count += 1;
    }
  }
  return count > 1;
}

export function formatPosition(
  row: TournamentStandingRow,
  rows: TournamentStandingRow[],
): string {
  if (row.position == null) {
    return "—";
  }
  if (isTiedPosition(row, rows)) {
    return `T${row.position}`;
  }
  return String(row.position);
}

