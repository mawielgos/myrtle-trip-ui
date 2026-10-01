import { Fragment, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getTournamentStandings,
  getTripPrizeSchedules,
  getTripRounds,
  getTripTournamentSetup,
} from "../api/tripApi";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import type {
  TournamentStandingRound,
  TournamentStandingRow,
  TournamentStandings,
  PrizeSchedule,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../styles/uiStyles";
import { formatCurrencyCents, formatMoneyAmount } from "../utils/moneyFormat";
import {
  buildReportFileTitle,
  printWithReportTitle,
} from "../utils/printUtils";

function formatToPar(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  if (value === 0) {
    return "E";
  }
  return value > 0 ? `+${value}` : `${value}`;
}

function formatMoney(
  value: number | null | undefined,
  isFinal: boolean,
): string {
  if (!isFinal || value == null) {
    return "";
  }
  return formatCurrencyCents(value);
}

function buildToParStyle(value: number | null | undefined): CSSProperties {
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

function buildNetScoreStyle(
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

function formatGeneratedTimestamp(): string {
  return new Date().toLocaleString();
}

function formatDisplayDate(value: string | null | undefined): string {
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

function getTripDateRange(rounds: TripRoundListItem[]): string {
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

function sanitizeFileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "event";
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }

  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

function normalizeReportText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00e2\u20ac\u00a2/g, " - ")
    .replace(/[•–—]/g, " - ")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDisplayRoundLabel(label: string | null | undefined): string {
  return normalizeReportText(label);
}

function getRoundHeaderParts(label: string | null | undefined): {
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

function buildTournamentStandingsCsv(
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

function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob(["\ufeff" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getRoundForLabel(
  row: TournamentStandingRow,
  label: string,
): TournamentStandingRound | null {
  const match = row.rounds.find((round) => round.label === label);
  return match ?? null;
}

function renderStatusText(standings: TournamentStandings): string {
  if (standings.leaderboardFinal) {
    return "Final leaderboard";
  }

  return `Through ${standings.completedRounds} of ${standings.requiredRounds} rounds`;
}

function getTournamentPrizeSchedule(
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

function getTournamentName(
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

function getConfiguredCompetitionName(
  setup: TripTournamentSetup | null,
  competition: "LOW_NET" | "LOW_GROSS",
): string {
  const configured =
    competition === "LOW_GROSS" ? setup?.lowGrossName : setup?.lowNetName;
  const fallback = competition === "LOW_GROSS" ? "Low Gross" : "Low Net";
  const trimmed = configured?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function isCompetitionEnabled(
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

function getConfiguredPurse(
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

function getPaidPlaces(
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

function getShownWinningsTotal(
  rows: TournamentStandingRow[],
  isFinal: boolean,
): number {
  if (!isFinal) {
    return 0;
  }

  return rows.reduce((total, row) => total + (Number(row.money) || 0), 0);
}

function isTiedPosition(
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

function formatPosition(
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

const STICKY_POS_WIDTH = 64;
const STICKY_PLAYER_WIDTH = 240;
const STICKY_HEADER_TOP = 0;

const pageHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const titleMetaStyle: CSSProperties = {
  marginTop: "8px",
  color: "#555",
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  fontSize: "14px",
};

const leaderboardShellStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
};

const titleBandStyle: CSSProperties = {
  borderBottom: "1px solid #d5d9de",
  padding: "16px",
  background: "#fafafa",
  borderTopLeftRadius: "8px",
  borderTopRightRadius: "8px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 700,
  color: "#222",
};

const subtitleRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const metaBlockStyle: CSSProperties = {
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  fontSize: "14px",
  color: "#555",
};

const statusStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};
const payoutSummaryStyle: CSSProperties = {
  display: "flex",
  gap: "8px 14px",
  flexWrap: "wrap",
  marginTop: "8px",
  fontSize: "13px",
  color: "#333",
};

const payoutSummaryItemStyle: CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "6px",
  padding: "6px 8px",
  background: "#fff",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  overflowY: "auto",
  width: "100%",
  maxWidth: "100%",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed",
  minWidth: "980px",
};

const topHeaderCellStyle: CSSProperties = {
  borderRight: "1px solid #d5d9de",
  borderBottom: "1px solid #c7ccd1",
  padding: "8px",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: 600,
  background: "#f7f7f7",
  color: "#222",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 6,
};

const subHeaderCellStyle: CSSProperties = {
  borderRight: "1px solid #eee",
  borderBottom: "1px solid #d5d9de",
  padding: "6px 4px",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: 600,
  background: "#fcfcfc",
  color: "#666",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 33,
  zIndex: 5,
};

const bodyCellStyle: CSSProperties = {
  borderRight: "1px solid #eee",
  borderBottom: "1px solid #eee",
  padding: "8px",
  fontSize: "14px",
  textAlign: "center",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  color: "#222",
  backgroundClip: "padding-box",
  position: "relative",
  zIndex: 1,
};

const rankCellStyle: CSSProperties = {
  ...bodyCellStyle,
  fontWeight: 600,
  width: `${STICKY_POS_WIDTH}px`,
};

const playerCellStyle: CSSProperties = {
  ...bodyCellStyle,
  textAlign: "left",
  fontWeight: 600,
  width: `${STICKY_PLAYER_WIDTH}px`,
  paddingLeft: "10px",
};

const roundScoreCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "54px",
  fontWeight: 700,
};

const roundToParCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "54px",
  fontSize: "14px",
};

const totalScoreCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "72px",
  fontWeight: 700,
  background: "#fafafa",
};

const totalToParCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "76px",
  fontWeight: 700,
  background: "#fafafa",
};

const moneyCellStyle: CSSProperties = {
  ...bodyCellStyle,
  width: "96px",
  fontWeight: 700,
  background: "#fcfcfc",
};

const dividerAfterPlayerStyle: CSSProperties = {
  borderRight: "2px solid #d0d0d0",
};

const dividerBeforeTotalsStyle: CSSProperties = {
  borderLeft: "2px solid #d0d0d0",
};

const rowEvenStyle: CSSProperties = {
  background: "#fcfcfc",
};

const rowOddStyle: CSSProperties = {
  background: "#fff",
};

const footerNoteStyle: CSSProperties = {
  padding: "10px 16px 14px 16px",
  fontSize: "12px",
  color: "#666",
};

const stickyPosHeaderStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 7,
  background: "#f7f7f7",
};

const stickyPlayerHeaderStyle: CSSProperties = {
  position: "sticky",
  left: `${STICKY_POS_WIDTH}px`,
  zIndex: 7,
  background: "#f7f7f7",
};

const stickyPosSubHeaderSpacerStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 5,
};

const stickyPlayerSubHeaderSpacerStyle: CSSProperties = {
  position: "sticky",
  left: `${STICKY_POS_WIDTH}px`,
  zIndex: 5,
};

const stickyPosBodyStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 3,
};

const stickyPlayerBodyStyle: CSSProperties = {
  position: "sticky",
  left: `${STICKY_POS_WIDTH}px`,
  zIndex: 3,
};

export default function TournamentStandingsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [standings, setStandings] = useState<TournamentStandings | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCompetition =
    searchParams.get("competition") === "LOW_GROSS" ? "LOW_GROSS" : "LOW_NET";
  const [competition, setCompetitionState] = useState<"LOW_NET" | "LOW_GROSS">(
    requestedCompetition,
  );
  const [prizeSchedules, setPrizeSchedules] = useState<PrizeSchedule[]>([]);
  const [tripRounds, setTripRounds] = useState<TripRoundListItem[]>([]);
  const [tournamentSetup, setTournamentSetup] =
    useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompetitionState(requestedCompetition);
  }, [requestedCompetition]);

  function setCompetition(nextCompetition: "LOW_NET" | "LOW_GROSS"): void {
    setCompetitionState(nextCompetition);
    setSearchParams({ competition: nextCompetition });
  }

  useEffect(() => {
    async function load(): Promise<void> {
      if (!tripId) {
        setError("Event id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getTournamentStandings(
          Number(tripId),
          competition,
        );
        setStandings(response);

        try {
          const schedules = await getTripPrizeSchedules(Number(tripId));
          setPrizeSchedules(schedules ?? []);
        } catch (prizeErr) {
          console.error(
            "Failed to load prize schedules for tournament standings title",
            prizeErr,
          );
          setPrizeSchedules([]);
        }

        try {
          const [rounds, setup] = await Promise.all([
            getTripRounds(Number(tripId)),
            getTripTournamentSetup(Number(tripId)),
          ]);
          setTripRounds(rounds ?? []);
          setTournamentSetup(setup);
        } catch (roundErr) {
          console.error(
            "Failed to load event rounds/tournament setup for print date range",
            roundErr,
          );
          setTripRounds([]);
          setTournamentSetup(null);
        }
      } catch (err) {
        console.error("Failed to load tournament standings", err);
        setError("Unable to load tournament standings.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [tripId, competition]);

  useEffect(() => {
    const styleId = "tournament-standings-print-style";

    let styleElement = document.getElementById(
      styleId,
    ) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.innerHTML = `
      @page {
        size: landscape;
        margin: 0.4in;
      }

      @media print {
        html, body {
          background: #fff !important;
        }

        .no-print,
        .app-shell-no-print,
        .tournament-standings-no-print {
          display: none !important;
        }

        body * {
          visibility: hidden;
        }

        .tournament-standings-print-root,
        .tournament-standings-print-root * {
          visibility: visible;
        }

        .tournament-standings-print-root {
          position: static !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #fff !important;
          box-sizing: border-box !important;
        }
        .tournament-standings-print-header {
          display: block !important;
          visibility: visible !important;
          margin-bottom: 10px !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid #bbb !important;
        }

        .tournament-standings-print-shell {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          overflow: visible !important;
        }

        .tournament-standings-print-titleband {
          padding: 0 0 8px 0 !important;
          border-bottom: 1px solid #bbb !important;
          background: #fff !important;
        }

        .tournament-standings-screen-title,
        .tournament-standings-screen-payout-summary,
        .tournament-standings-print-root button {
          display: none !important;
        }
        .tournament-standings-print-wrap {
          overflow: visible !important;
        }

        .tournament-standings-print-table {
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          font-size: 10px !important;
        }

        .tournament-standings-print-table thead {
          display: table-header-group;
        }

        .tournament-standings-print-table tr,
        .tournament-standings-print-table td,
        .tournament-standings-print-table th {
          page-break-inside: avoid !important;
        }

        .tournament-standings-print-table th,
        .tournament-standings-print-table td {
          position: static !important;
          left: auto !important;
          top: auto !important;
          box-shadow: none !important;
        }

        .tournament-standings-print-table th {
          background: #f3f3f3 !important;
          color: #111 !important;
          padding: 4px 3px !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          line-height: 1.12 !important;
          font-size: 9px !important;
        }

        .tournament-standings-print-table td {
          background: #fff !important;
          padding: 4px 3px !important;
        }

        .tournament-standings-print-generated {
          display: inline !important;
        }

        .tournament-standings-print-footer {
          padding: 8px 0 0 0 !important;
          font-size: 10px !important;
        }

        .tournament-standings-print-note {
          margin-top: 10px !important;
          border: 1px solid #ddd !important;
          background: #fff !important;
        }

        a[href]:after {
          content: "" !important;
        }
      }
    `;

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) {
        existing.remove();
      }
    };
  }, []);

  const generatedTimestamp = useMemo(() => formatGeneratedTimestamp(), []);

  const tripDateRange = useMemo(
    () => getTripDateRange(tripRounds),
    [tripRounds],
  );

  const tournamentName = useMemo(() => {
    const configuredName = getConfiguredCompetitionName(
      tournamentSetup,
      competition,
    );
    if (configuredName) {
      return configuredName;
    }

    const baseName = getTournamentName(standings, prizeSchedules, competition);
    const label =
      standings?.competitionLabel ||
      (competition === "LOW_GROSS" ? "Low Gross" : "Low Net");
    return baseName.includes(label) ? baseName : `${baseName} - ${label}`;
  }, [standings, prizeSchedules, competition, tournamentSetup]);

  const lowNetButtonLabel = getConfiguredCompetitionName(
    tournamentSetup,
    "LOW_NET",
  );
  const lowGrossButtonLabel = getConfiguredCompetitionName(
    tournamentSetup,
    "LOW_GROSS",
  );
  const showLowNetButton = isCompetitionEnabled(tournamentSetup, "LOW_NET");
  const showLowGrossButton = isCompetitionEnabled(tournamentSetup, "LOW_GROSS");

  const configuredPurse = useMemo(() => {
    return getConfiguredPurse(prizeSchedules, competition);
  }, [prizeSchedules, competition]);

  const paidPlaces = useMemo(() => {
    return getPaidPlaces(prizeSchedules, competition);
  }, [prizeSchedules, competition]);

  const sortedRows = useMemo(() => {
    if (!standings) {
      return [];
    }

    return [...standings.rows].sort((a, b) => {
      const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
      const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
      if (aPosition !== bPosition) {
        return aPosition - bPosition;
      }
      if (a.totalScore !== b.totalScore) {
        return a.totalScore - b.totalScore;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [standings]);

  const shownWinningsTotal = useMemo(() => {
    if (!standings) {
      return 0;
    }
    return getShownWinningsTotal(sortedRows, standings.leaderboardFinal);
  }, [standings, sortedRows]);

  function handlePrint(): void {
    printWithReportTitle(
      buildReportFileTitle(
        standings?.tripName || "Event",
        tournamentName || "Tournament Standings",
      ),
    );
  }

  function handleExportCsv(): void {
    if (!standings) {
      return;
    }

    const csv = buildTournamentStandingsCsv(
      standings,
      sortedRows,
      tournamentName,
      configuredPurse,
    );
    const fileName = `${sanitizeFileName(tournamentName)}-leaderboard.csv`;
    downloadTextFile(fileName, csv, "text/csv;charset=utf-8");
  }

  if (loading) {
    return (
      <div style={pageContainerWideStyle}>Loading tournament standings...</div>
    );
  }

  if (error || !standings) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>
          {error ?? "Tournament standings not found."}
        </div>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => navigate("/trips")}
        >
          Events
        </button>
      </div>
    );
  }

  return (
    <div
      style={pageContainerWideStyle}
      className="tournament-standings-print-root"
    >
      <PageHeader
        title={tournamentName}
        className="tournament-standings-no-print"
        subtitle={
          <div style={titleMetaStyle}>
            <span>
              <strong>Event:</strong> {standings.tripName}
            </span>
            <span>
              <strong>Rounds Completed:</strong> {standings.completedRounds} /{" "}
              {standings.requiredRounds}
            </span>
            <span>
              <strong>Leaderboard Par:</strong> {standings.leaderboardParTotal}
            </span>
          </div>
        }
        actions={
          <>
            <TripDetailButton tripId={standings.tripId} />
            <ReportsButton tripId={standings.tripId} />
            <button type="button" style={buttonStyle} onClick={handlePrint}>
              Print
            </button>
            <button type="button" style={buttonStyle} onClick={handleExportCsv}>
              Export CSV
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </>
        }
      />

      <div
        className="tournament-standings-no-print"
        style={{ ...sectionStyle, marginTop: 0 }}
      >
        <strong style={{ marginRight: "12px" }}>Competition:</strong>
        {showLowNetButton ? (
          <button
            type="button"
            style={competition === "LOW_NET" ? primaryButtonStyle : buttonStyle}
            onClick={() => setCompetition("LOW_NET")}
          >
            {lowNetButtonLabel}
          </button>
        ) : null}
        {showLowGrossButton ? (
          <button
            type="button"
            style={{
              ...(competition === "LOW_GROSS"
                ? primaryButtonStyle
                : buttonStyle),
              marginLeft: showLowNetButton ? "8px" : 0,
            }}
            onClick={() => setCompetition("LOW_GROSS")}
          >
            {lowGrossButtonLabel}
          </button>
        ) : null}
      </div>

      <div
        className="tournament-standings-print-header print-only"
        style={{ display: "none", marginBottom: "12px" }}
      >
        <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.2 }}>
          {standings.tripName}
        </div>
        {tripDateRange ? (
          <div style={{ fontSize: "13px", color: "#555", marginTop: "3px" }}>
            {tripDateRange}
          </div>
        ) : null}
        <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "10px" }}>
          {tournamentName}
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
          Final Leaderboard
        </div>
      </div>

      <div
        style={leaderboardShellStyle}
        className="tournament-standings-print-shell"
      >
        <div
          style={titleBandStyle}
          className="tournament-standings-print-titleband"
        >
          <div className="tournament-standings-screen-title">
            <h2 style={titleStyle}>{tournamentName}</h2>
            <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
              Final Leaderboard
            </div>
          </div>

          <div style={subtitleRowStyle}>
            <div style={metaBlockStyle}>
              <span>
                <strong>Status:</strong> {renderStatusText(standings)}
              </span>
              <span>
                <strong>Event:</strong> {standings.tripName}
              </span>
              <span>
                <strong>Leaderboard Par:</strong>{" "}
                {standings.leaderboardParTotal}
              </span>
              {configuredPurse > 0 ? (
                <span>
                  <strong>Total Purse:</strong>{" "}
                  {formatMoney(configuredPurse, true)}
                </span>
              ) : null}
              <span
                className="tournament-standings-print-generated"
                style={{ display: "none" }}
              >
                <strong>Generated:</strong> {generatedTimestamp}
              </span>
            </div>

            <div
              style={{
                ...statusStyle,
                color: standings.leaderboardFinal ? "#1f6b2a" : "#8a5a00",
              }}
            >
              {standings.leaderboardFinal
                ? "Winnings finalized"
                : "Winnings hidden until all tournament rounds are complete"}
            </div>
          </div>

          <div
            style={payoutSummaryStyle}
            className="tournament-standings-screen-payout-summary"
          >
            {configuredPurse > 0 ? (
              <div style={payoutSummaryItemStyle}>
                <strong>Total Purse:</strong>{" "}
                {formatMoney(configuredPurse, true)}
              </div>
            ) : null}
            {paidPlaces > 0 ? (
              <div style={payoutSummaryItemStyle}>
                <strong>Paid Places:</strong> {paidPlaces}
              </div>
            ) : null}
            {standings.leaderboardFinal && shownWinningsTotal > 0 ? (
              <div style={payoutSummaryItemStyle}>
                <strong>Final Winnings:</strong>{" "}
                {formatMoney(shownWinningsTotal, true)}
              </div>
            ) : null}
          </div>
        </div>

        <div style={tableWrapStyle} className="tournament-standings-print-wrap">
          <table
            style={tableStyle}
            className="tournament-standings-print-table"
          >
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  style={{
                    ...topHeaderCellStyle,
                    ...stickyPosHeaderStyle,
                    width: `${STICKY_POS_WIDTH}px`,
                  }}
                >
                  Pos
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...topHeaderCellStyle,
                    ...stickyPlayerHeaderStyle,
                    ...dividerAfterPlayerStyle,
                    width: `${STICKY_PLAYER_WIDTH}px`,
                    textAlign: "left",
                    paddingLeft: "10px",
                  }}
                >
                  Player
                </th>

                {standings.roundLabels.map((label) => {
                  const header = getRoundHeaderParts(label);

                  return (
                    <th
                      key={label}
                      colSpan={2}
                      style={{
                        ...topHeaderCellStyle,
                        width: "108px",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        lineHeight: 1.15,
                        padding: "6px 4px",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{header.round}</div>
                      {header.date ? (
                        <div style={{ fontSize: "11px", fontWeight: 600 }}>
                          {header.date}
                        </div>
                      ) : null}
                      {header.course ? (
                        <div style={{ fontSize: "11px", fontWeight: 600 }}>
                          {header.course}
                        </div>
                      ) : null}
                    </th>
                  );
                })}

                <th
                  rowSpan={2}
                  style={{
                    ...topHeaderCellStyle,
                    ...dividerBeforeTotalsStyle,
                    width: "72px",
                  }}
                >
                  Total
                </th>
                <th
                  rowSpan={2}
                  style={{ ...topHeaderCellStyle, width: "76px" }}
                >
                  To Par
                </th>
                <th
                  rowSpan={2}
                  style={{ ...topHeaderCellStyle, width: "96px" }}
                >
                  Winnings
                </th>
              </tr>

              <tr>
                {standings.roundLabels.map((label) => (
                  <Fragment key={label}>
                    <th
                      style={{ ...subHeaderCellStyle, background: "#fcfcfc" }}
                    >
                      {competition === "LOW_GROSS" ? "Gross" : "Net"}
                    </th>
                    <th
                      style={{ ...subHeaderCellStyle, background: "#fcfcfc" }}
                    >
                      Par
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + standings.roundLabels.length * 2 + 3}
                    style={{
                      ...bodyCellStyle,
                      padding: "18px 12px",
                      textAlign: "center",
                      borderRight: "none",
                    }}
                  >
                    No completed non-scramble rounds yet.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, index) => {
                  const rowStyle = index % 2 === 0 ? rowOddStyle : rowEvenStyle;

                  return (
                    <tr key={row.playerId} style={rowStyle}>
                      <td
                        style={{
                          ...rankCellStyle,
                          ...stickyPosBodyStyle,
                          background: rowStyle.background,
                        }}
                      >
                        {formatPosition(row, sortedRows)}
                      </td>
                      <td
                        style={{
                          ...playerCellStyle,
                          ...stickyPlayerBodyStyle,
                          ...dividerAfterPlayerStyle,
                          background: rowStyle.background,
                        }}
                      >
                        {row.playerName}
                      </td>

                      {standings.roundLabels.map((label) => {
                        const round = getRoundForLabel(row, label);

                        return (
                          <Fragment key={`${row.playerId}-${label}`}>
                            <td
                              style={{
                                ...roundScoreCellStyle,
                                ...buildNetScoreStyle(round),
                              }}
                            >
                              {round?.score ?? ""}
                            </td>
                            <td
                              style={{
                                ...roundToParCellStyle,
                                ...buildToParStyle(round?.toPar),
                              }}
                            >
                              {round ? formatToPar(round.toPar) : ""}
                            </td>
                          </Fragment>
                        );
                      })}

                      <td
                        style={{
                          ...totalScoreCellStyle,
                          ...dividerBeforeTotalsStyle,
                        }}
                      >
                        {row.totalScore}
                      </td>
                      <td
                        style={{
                          ...totalToParCellStyle,
                          ...buildToParStyle(row.totalToPar),
                        }}
                      >
                        {formatToPar(row.totalToPar)}
                      </td>
                      <td style={moneyCellStyle}>
                        {formatMoney(row.money, standings.leaderboardFinal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={footerNoteStyle}
          className="tournament-standings-print-footer"
        >
          {!standings.leaderboardFinal
            ? "Winnings remain blank until all tournament rounds are complete."
            : "Winnings shown only after the full tournament is complete."}
        </div>
      </div>

      <div
        style={{ ...sectionStyle, marginTop: "16px", marginBottom: 0 }}
        className="tournament-standings-no-print tournament-standings-print-note"
      >
        <div style={{ fontSize: "12px", color: "#666" }}>
          Tied positions are shown as T1, T2, T3, etc.
        </div>
      </div>
    </div>
  );
}
