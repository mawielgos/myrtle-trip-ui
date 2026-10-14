import { useEffect } from "react";
import type { TournamentStandingRow, TournamentStandings } from "../types/trip";
import {
  buildReportFileTitle,
  printWithReportTitle,
} from "../utils/printUtils";
import {
  buildTournamentStandingsCsv,
  sanitizeFileName,
} from "./tournamentStandingsLogic";

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

type Params = {
  standings: TournamentStandings | null;
  sortedRows: TournamentStandingRow[];
  tournamentName: string;
  configuredPurse: number;
};

type TournamentStandingsReport = {
  handlePrint: () => void;
  handleExportCsv: () => void;
};

export function useTournamentStandingsReport({
  standings,
  sortedRows,
  tournamentName,
  configuredPurse,
}: Params): TournamentStandingsReport {
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

  return { handlePrint, handleExportCsv };
}
