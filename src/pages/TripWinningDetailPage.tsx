import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getTournamentStandings,
  getTripDetail,
  getTripPlayers,
  getTripPrizeSchedules,
  getTripPrizeWinnings,
  getTripRounds,
  getTripTournamentSetup,
  updateTripPlayerPayoutStatus,
} from "../api/tripApi";
import type {
  TournamentStandings,
  PrizeRecalculationResponse,
  PrizeSchedule,
  PrizeWinningResponse,
  TripDetail,
  TripPlayer,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { formatRoundEventDescription } from "../utils/roundDisplay";
import {
  buildReportFileTitle,
  printWithReportTitle,
} from "../utils/printUtils";
import {
  formatWholeDollarCurrency,
  truncateWholeDollars,
} from "../utils/moneyFormat";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  sectionStyle,
} from "../styles/uiStyles";

type RoundPrizeColumn = {
  key: string;
  gameKey: string;
  roundNumber: number;
  roundId: number | null;
  dayLabel: string;
  dateLabel: string;
  roundName: string;
};

type TournamentPositionColumn = {
  key: "LOW_NET" | "LOW_GROSS";
  label: string;
};

type PlayerPublishRow = {
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

function formatPaidAt(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function formatOrdinal(value: number | null | undefined): string {
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

function cleanGameName(gameName: string | null | undefined): string {
  return (gameName ?? "")
    .replace(/^Round\s+\d+\s*-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRoundEventTypeFromGameKey(
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

function resolveWinningEventType(winning: PrizeWinningResponse): string | null {
  return winning.eventType ?? parseRoundEventTypeFromGameKey(winning.gameKey);
}

function formatRoundFormat(format?: string | null): string {
  return formatRoundEventDescription(format);
}

function formatResultGameName(
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

function formatRoundResultLabel(winning: PrizeWinningResponse): string {
  const rank = winning.sourceRank ?? winning.finishingPlace ?? null;
  const ordinal = formatOrdinal(rank);
  const game = formatResultGameName(
    winning.gameName,
    resolveWinningEventType(winning),
  );
  return [ordinal, game].filter(Boolean).join(" ");
}

function parseRoundDate(
  round: TripRoundListItem | null | undefined,
): Date | null {
  if (!round?.roundDate) {
    return null;
  }

  const parsed = new Date(`${round.roundDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDayLabel(round: TripRoundListItem | null | undefined): string {
  const date = parseRoundDate(round);
  return date ? dayFormatter.format(date) : "Round";
}

function getDateLabel(round: TripRoundListItem | null | undefined): string {
  const date = parseRoundDate(round);
  return date ? shortDateFormatter.format(date) : "";
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function makePlayerKey(
  playerId: number | null | undefined,
  playerName: string | null | undefined,
): string {
  if (playerId != null && Number.isFinite(playerId)) {
    return `id-${playerId}`;
  }

  return `name-${(playerName ?? "").trim().toLowerCase()}`;
}

function buildCsvValue(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map(buildCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const headingBlockStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  background: "#fff",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #c7ccd1",
  padding: "8px 10px",
  fontSize: "14px",
  fontWeight: 700,
  color: "#111",
  verticalAlign: "bottom",
  lineHeight: 1.2,
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px 10px",
  fontSize: "14px",
  lineHeight: 1.25,
  verticalAlign: "top",
};

const centeredTextStyle: CSSProperties = {
  textAlign: "center",
};

const numberCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const totalRowStyle: CSSProperties = {
  ...tdStyle,
  borderTop: "1px solid #c7ccd1",
  borderBottom: "none",
  fontWeight: 700,
};

const winningDetailPrintStyles = `
@media print {
  @page {
    size: landscape;
    margin: 0.35in;
  }

  html,
  body {
    background: #fff !important;
  }

  body * {
    visibility: hidden;
  }

  .winning-detail-print-root,
  .winning-detail-print-root * {
    visibility: visible;
  }

  .winning-detail-print-root {
    position: static !important;
  }

  .no-print,
  .app-shell-no-print,
  .winning-detail-no-print {
    display: none !important;
  }

  .winning-detail-print-root {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111 !important;
  }

  .winning-detail-print-header {
    display: block !important;
    margin-bottom: 8px !important;
  }

  .winning-detail-print-title {
    margin: 0 0 3px !important;
    font-size: 22px !important;
    line-height: 1.15 !important;
    font-weight: 800 !important;
  }

  .winning-detail-print-subtitle {
    margin: 0 !important;
    font-size: 12px !important;
    color: #333 !important;
  }

  .winning-detail-print-root section {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
    background: #fff !important;
  }

  .winning-detail-print-table-wrap {
    overflow: visible !important;
  }

  .winning-detail-section-title {
    display: none !important;
  }

  .winning-detail-print-root input[type="checkbox"] {
    width: 8px !important;
    height: 8px !important;
    margin: 0 2px 0 0 !important;
  }

  .winning-detail-print-root table {
    width: auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
    font-size: 9px !important;
    margin: 0 !important;
  }

  .winning-detail-print-root col:nth-child(1) { width: 1.85in !important; }
  .winning-detail-print-root col:nth-child(2) { width: 0.72in !important; }
  .winning-detail-print-root col:nth-child(3) { width: 0.76in !important; }
  .winning-detail-print-root col:nth-child(4) { width: 0.50in !important; }
  .winning-detail-print-root col:nth-child(n+5) { width: 1.25in !important; }

  .winning-detail-print-root th,
  .winning-detail-print-root td {
    border: 1px solid #999 !important;
    padding: 2px 4px !important;
    font-size: 8.5px !important;
    line-height: 1.05 !important;
    vertical-align: middle !important;
    color: #111 !important;
  }

  .winning-detail-print-root tbody tr {
    height: 15px !important;
    min-height: 15px !important;
  }

  .winning-detail-print-root tbody td {
    height: 15px !important;
    min-height: 15px !important;
    max-height: 15px !important;
    overflow: hidden !important;
  }

  .winning-detail-print-root th {
    background: #f0f0f0 !important;
    font-weight: 700 !important;
  }

  .winning-detail-print-root tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .winning-detail-paid-label {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 2px !important;
    height: 10px !important;
    max-height: 10px !important;
    font-size: 8.5px !important;
    line-height: 1 !important;
    font-weight: 400 !important;
    white-space: nowrap !important;
  }

  .winning-detail-paid-label input[type="checkbox"] {
    flex: 0 0 auto !important;
    width: 8px !important;
    height: 8px !important;
    margin: 0 2px 0 0 !important;
  }
}
`;

export default function TripWinningDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [schedules, setSchedules] = useState<PrizeSchedule[]>([]);
  const [winnings, setWinnings] = useState<PrizeRecalculationResponse | null>(
    null,
  );
  const [standingsByCompetition, setStandingsByCompetition] = useState<
    Partial<Record<"LOW_NET" | "LOW_GROSS", TournamentStandings>>
  >({});
  const [tournamentSetup, setTournamentSetup] =
    useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null);
  const [savingAllPaid, setSavingAllPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [
          tripResult,
          playerResult,
          roundResult,
          scheduleResult,
          prizeResult,
          setupResult,
        ] = await Promise.all([
          getTripDetail(numericTripId),
          getTripPlayers(numericTripId),
          getTripRounds(numericTripId),
          getTripPrizeSchedules(numericTripId),
          getTripPrizeWinnings(numericTripId),
          getTripTournamentSetup(numericTripId),
        ]);

        const standingsResults = await Promise.allSettled([
          getTournamentStandings(numericTripId, "LOW_NET"),
          getTournamentStandings(numericTripId, "LOW_GROSS"),
        ]);

        const nextStandingsByCompetition: Partial<
          Record<"LOW_NET" | "LOW_GROSS", TournamentStandings>
        > = {};
        if (standingsResults[0].status === "fulfilled") {
          nextStandingsByCompetition.LOW_NET = standingsResults[0].value;
        }
        if (standingsResults[1].status === "fulfilled") {
          nextStandingsByCompetition.LOW_GROSS = standingsResults[1].value;
        }

        if (!cancelled) {
          setTrip(tripResult);
          setPlayers(playerResult);
          setRounds(roundResult);
          setSchedules(scheduleResult);
          setWinnings(prizeResult);
          setTournamentSetup(setupResult);
          setStandingsByCompetition(nextStandingsByCompetition);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Unable to load winning detail.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [numericTripId]);

  const scheduleByGameKey = useMemo(() => {
    const map = new Map<string, PrizeSchedule>();
    for (const schedule of schedules) {
      map.set(schedule.gameKey, schedule);
    }
    return map;
  }, [schedules]);

  const roundByNumber = useMemo(() => {
    const map = new Map<number, TripRoundListItem>();
    for (const round of rounds) {
      if (round.roundNumber != null) {
        map.set(round.roundNumber, round);
      }
    }
    return map;
  }, [rounds]);

  const columns = useMemo<RoundPrizeColumn[]>(() => {
    const byKey = new Map<string, RoundPrizeColumn>();

    for (const schedule of schedules) {
      if (
        schedule.gameKey === FOUR_DAY_GAME_KEY ||
        schedule.roundNumber == null
      ) {
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
      if (
        winning.gameKey === FOUR_DAY_GAME_KEY ||
        winning.roundNumber == null
      ) {
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
  }, [roundByNumber, scheduleByGameKey, schedules, winnings]);

  const tournamentColumns = useMemo<TournamentPositionColumn[]>(() => {
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
  }, [tournamentSetup]);

  const rows = useMemo<PlayerPublishRow[]>(() => {
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
      const playerKey = makePlayerKey(
        playerTotal.playerId,
        playerTotal.playerName,
      );
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
          tournamentPositions:
            tournamentPositionByPlayerKey.get(playerKey) ?? {},
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
  }, [
    columns,
    players,
    scheduleByGameKey,
    standingsByCompetition,
    tournamentColumns,
    winnings,
  ]);

  const totalPayout = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.totalMoney, 0);
  }, [rows]);

  const totalPaid = useMemo(() => {
    return rows.reduce((sum, row) => sum + (row.paid ? row.totalMoney : 0), 0);
  }, [rows]);

  const totalUnpaid = totalPayout - totalPaid;

  const unpaidRows = useMemo(() => {
    return rows.filter(
      (row) => row.totalMoney > 0 && !row.paid && row.playerId != null,
    );
  }, [rows]);

  const tripYear = trip?.tripYear ?? new Date().getFullYear();
  const tournamentHeadings = tournamentColumns.map((column) => column.label);

  async function handleTogglePaid(playerId: number | null, paid: boolean) {
    if (playerId == null || !Number.isFinite(playerId)) {
      return;
    }

    const previousWinnings = winnings;
    const paidAt = paid ? new Date().toISOString() : null;

    try {
      setSavingPlayerId(playerId);
      setError(null);

      setWinnings((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          playerTotals: current.playerTotals.map((playerTotal) =>
            playerTotal.playerId === playerId
              ? { ...playerTotal, paid, paidAt }
              : playerTotal,
          ),
        };
      });

      const updated = await updateTripPlayerPayoutStatus(
        numericTripId,
        playerId,
        paid,
      );
      setWinnings(updated);
    } catch (saveError) {
      console.error(saveError);
      setWinnings(previousWinnings);
      setError("Unable to update payout status.");
    } finally {
      setSavingPlayerId(null);
    }
  }

  async function handleMarkAllPaid() {
    const targets = unpaidRows
      .map((row) => row.playerId)
      .filter(
        (playerId): playerId is number =>
          playerId != null && Number.isFinite(playerId),
      );

    if (targets.length === 0) {
      return;
    }

    const previousWinnings = winnings;
    const paidAt = new Date().toISOString();

    try {
      setSavingAllPaid(true);
      setError(null);

      setWinnings((current) => {
        if (!current) {
          return current;
        }

        const targetSet = new Set(targets);
        return {
          ...current,
          playerTotals: current.playerTotals.map((playerTotal) =>
            playerTotal.playerId != null && targetSet.has(playerTotal.playerId)
              ? { ...playerTotal, paid: true, paidAt }
              : playerTotal,
          ),
        };
      });

      let latest = winnings;
      for (const playerId of targets) {
        latest = await updateTripPlayerPayoutStatus(
          numericTripId,
          playerId,
          true,
        );
      }

      if (latest) {
        setWinnings(latest);
      }
    } catch (saveError) {
      console.error(saveError);
      setWinnings(previousWinnings);
      setError("Unable to mark all payouts as paid.");
    } finally {
      setSavingAllPaid(false);
    }
  }

  function handleExportCsv() {
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
      ...tournamentHeadings,
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
    downloadCsv(`winning-detail-${tripYear}.csv`, csvRows);
  }

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading winning detail...</div>;
  }

  if (error || !trip || !winnings) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Winning detail not found."}</div>
        <TripDetailButton tripId={numericTripId} />
      </div>
    );
  }

  const printTitle = buildReportFileTitle(trip.tripName, "Winning Detail");

  function handlePrint(): void {
    printWithReportTitle(printTitle);
  }

  return (
    <div style={pageContainerWideStyle} className="winning-detail-print-root">
      <style>{winningDetailPrintStyles}</style>
      <PageHeader
        title="Winning Detail"
        subtitle={`${trip.tripName} - Published payout summary`}
        className="winning-detail-no-print"
        actions={
          <>
            <TripDetailButton tripId={trip.tripId} />
            <ReportsButton tripId={trip.tripId} />
            <WorkflowBackButton
              label="Back to Event Detail"
              to={`/trips/${trip.tripId}`}
            />
            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                navigate(`/trips/${trip.tripId}/money-distribution`)
              }
            >
              Money Distribution
            </button>
            <button type="button" style={buttonStyle} onClick={handlePrint}>
              Print
            </button>
            <button type="button" style={buttonStyle} onClick={handleExportCsv}>
              Export CSV
            </button>
          </>
        }
      />

      <div className="winning-detail-print-header print-only">
        <h1 className="winning-detail-print-title">Winning Detail</h1>
        <div className="winning-detail-print-subtitle">
          {trip.tripName} - Published payout summary
        </div>
      </div>

      <section
        className="winning-detail-print-table-wrap"
        style={{ ...sectionStyle, maxWidth: "100%", overflowX: "auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <h2
            className="winning-detail-section-title"
            style={{ margin: 0, fontSize: "20px", lineHeight: 1.2 }}
          >
            Winning Detail
          </h2>
          <div
            className="winning-detail-screen-actions"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              style={buttonStyle}
              disabled={savingAllPaid || unpaidRows.length === 0}
              onClick={() => void handleMarkAllPaid()}
            >
              {savingAllPaid ? "Saving..." : "Mark All Paid"}
            </button>
            <div
              style={{
                fontSize: "13px",
                color: "#555",
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              <div>Total Payout: {formatWholeDollarCurrency(totalPayout)}</div>
              <div>Paid: {formatWholeDollarCurrency(totalPaid)}</div>
              <div>Unpaid: {formatWholeDollarCurrency(totalUnpaid)}</div>
            </div>
          </div>
        </div>

        <table
          style={{
            ...tableStyle,
            minWidth: Math.max(
              900,
              430 + columns.length * 125 + tournamentColumns.length * 110,
            ),
            maxWidth: "100%",
          }}
        >
          <colgroup>
            <col style={{ width: "190px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "82px" }} />
            <col style={{ width: "58px" }} />
            {columns.map((column) => (
              <col key={column.key} style={{ width: "125px" }} />
            ))}
            {tournamentColumns.map((column) => (
              <col key={column.key} style={{ width: "110px" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Money</th>
              <th style={{ ...thStyle, ...centeredTextStyle }}>Paid</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Rank</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ ...thStyle, ...centeredTextStyle }}
                >
                  <div>{column.roundName}</div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#555",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {[column.dayLabel, column.dateLabel]
                      .filter(Boolean)
                      .join(" - ")}
                  </div>
                </th>
              ))}
              {tournamentColumns.map((column) => (
                <th
                  key={column.key}
                  style={{ ...thStyle, ...centeredTextStyle }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isUnpaidWinner = row.totalMoney > 0 && !row.paid;
              const rowBackground = isUnpaidWinner
                ? "#fff7ed"
                : index % 2 === 0
                  ? "#fff"
                  : "#f7f7f7";

              return (
                <tr key={row.playerKey} style={{ background: rowBackground }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {row.playerName}
                  </td>
                  <td style={{ ...numberCellStyle, fontWeight: 700 }}>
                    {formatWholeDollarCurrency(row.totalMoney)}
                  </td>
                  <td style={{ ...tdStyle, ...centeredTextStyle }}>
                    {row.totalMoney > 0 ? (
                      <label
                        className="winning-detail-paid-label"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          fontSize: "13px",
                          whiteSpace: "nowrap",
                        }}
                        title={
                          row.paidAt
                            ? `Paid ${formatPaidAt(row.paidAt)}`
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          checked={row.paid}
                          disabled={savingPlayerId === row.playerId}
                          onChange={(event) =>
                            void handleTogglePaid(
                              row.playerId,
                              event.target.checked,
                            )
                          }
                        />
                        {row.paid ? "Paid" : "Open"}
                      </label>
                    ) : (
                      ""
                    )}
                  </td>
                  <td style={numberCellStyle}>{row.totalMoney > 0 ? row.rank : ""}</td>
                  {columns.map((column) => (
                    <td key={column.key} style={tdStyle}>
                      {row.roundCells[column.key] ?? ""}
                    </td>
                  ))}
                  {tournamentColumns.map((column) => (
                    <td
                      key={column.key}
                      style={{ ...tdStyle, ...centeredTextStyle }}
                    >
                      {row.tournamentPositions[column.key] ?? ""}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td style={{ ...totalRowStyle, textAlign: "right" }}>
                Total Payout:
              </td>
              <td style={{ ...totalRowStyle, textAlign: "right" }}>
                {formatWholeDollarCurrency(totalPayout)}
              </td>
              <td style={{ ...totalRowStyle, textAlign: "center" }}>
                {formatWholeDollarCurrency(totalPaid)}
              </td>
              <td style={totalRowStyle} />
              {columns.map((column) => (
                <td key={column.key} style={totalRowStyle} />
              ))}
              {tournamentColumns.map((column) => (
                <td key={column.key} style={totalRowStyle} />
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
