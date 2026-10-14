import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { updateTripPlayerPayoutStatus } from "../api/tripApi";
import type { PrizeRecalculationResponse } from "../types/trip";
import {
  buildCsvValue,
  buildWinningDetailCsvRows,
} from "./tripWinningDetailLogic";
import type {
  PlayerPublishRow,
  RoundPrizeColumn,
  TournamentPositionColumn,
} from "./tripWinningDetailLogic";
import {
  buildReportFileTitle,
  printWithReportTitle,
} from "../utils/printUtils";

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

type UseTripWinningDetailCommandsArgs = {
  numericTripId: number;
  tripName: string | null | undefined;
  tripYear: number;
  winnings: PrizeRecalculationResponse | null;
  setWinnings: Dispatch<SetStateAction<PrizeRecalculationResponse | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  rows: PlayerPublishRow[];
  columns: RoundPrizeColumn[];
  tournamentColumns: TournamentPositionColumn[];
  totalPayout: number;
  unpaidRows: PlayerPublishRow[];
};

export function useTripWinningDetailCommands({
  numericTripId,
  tripName,
  tripYear,
  winnings,
  setWinnings,
  setError,
  rows,
  columns,
  tournamentColumns,
  totalPayout,
  unpaidRows,
}: UseTripWinningDetailCommandsArgs) {
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null);
  const [savingAllPaid, setSavingAllPaid] = useState(false);

  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.dataset.tripWinningDetailPrint = "true";
    styleElement.textContent = winningDetailPrintStyles;
    document.head.appendChild(styleElement);
    return () => styleElement.remove();
  }, []);

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
    downloadCsv(
      `winning-detail-${tripYear}.csv`,
      buildWinningDetailCsvRows(
        rows,
        columns,
        tournamentColumns,
        totalPayout,
      ),
    );
  }

  function handlePrint(): void {
    printWithReportTitle(buildReportFileTitle(tripName, "Winning Detail"));
  }

  return {
    savingPlayerId,
    savingAllPaid,
    handleTogglePaid,
    handleMarkAllPaid,
    handleExportCsv,
    handlePrint,
  };
}
