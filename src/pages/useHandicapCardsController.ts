import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getHandicapCardDetail, getHandicapCards } from "../api/handicapCardApi";
import { buildReportFileTitle, printWithReportTitle } from "../utils/printUtils";
import type {
  HandicapCardDetailResponse,
  HandicapCardsResponse,
  HandicapCardPlayerSummary,
} from "../types/handicapCard";
import {
  buildDetailedHandicapCardsCsv,
  csvEscape,
  sanitizeFilePart,
  sortHandicapCardPlayers,
} from "./handicapCardsLogic";

function downloadCsv(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
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

export function useHandicapCardsController() {
  const params = useParams();
  const navigate = useNavigate();
  const tripId = Number(params.tripId);

  const [data, setData] = useState<HandicapCardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailCards, setDetailCards] = useState<HandicapCardDetailResponse[]>(
    [],
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  const sortedPlayers = useMemo(() => sortHandicapCardPlayers(data?.players ?? []), [data]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!Number.isFinite(tripId)) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getHandicapCards(tripId);
        if (!cancelled) {
          setData(response);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ??
              err?.message ??
              "Unable to load handicap cards.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function loadAllDetails(): Promise<HandicapCardDetailResponse[]> {
    if (!data) {
      return [];
    }

    if (
      detailCards.length === sortedPlayers.length &&
      sortedPlayers.length > 0
    ) {
      return detailCards;
    }

    setDetailsLoading(true);
    try {
      const details: HandicapCardDetailResponse[] = [];
      for (const player of sortedPlayers) {
        const detail = await getHandicapCardDetail(
          tripId,
          player.playerId,
          data.asOfDate,
        );
        details.push(detail);
      }
      setDetailCards(details);
      return details;
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handlePrint(): Promise<void> {
    await loadAllDetails();
    printWithReportTitle(buildReportFileTitle(data?.tripName || "Event", "Handicap Cards"));
  }

  async function handleExportCsv(): Promise<void> {
    if (!data) {
      return;
    }
    const details = await loadAllDetails();
    downloadCsv(
      `${sanitizeFilePart(data.tripName)}-handicap-cards.csv`,
      buildDetailedHandicapCardsCsv(data, details),
    );
  }

  function openPlayer(player: HandicapCardPlayerSummary): void {
    navigate(`/trips/${tripId}/handicap-cards/players/${player.playerId}`);
  }


  return {
    tripId,
    data,
    loading,
    error,
    detailCards,
    detailsLoading,
    sortedPlayers,
    handlePrint,
    handleExportCsv,
    openPlayer,
  };
}
