import { useCallback, useEffect, useMemo, useState } from "react";
import { getStrokesPerDay } from "../api/strokesApi";
import type { StrokesPerDayResponse } from "../types/strokes";
import { buildInitialSelectedTeeIds } from "./strokesPerDayLogic";

export function formatStrokesPerDayError(err: unknown, fallback: string): string {
  const anyErr = err as {
    response?: { data?: { error?: unknown; message?: unknown } | string };
    message?: unknown;
  };
  const responseData = anyErr?.response?.data;

  if (typeof responseData === "string" && responseData.trim() !== "") {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const error = responseData.error;
    if (typeof error === "string" && error.trim() !== "") {
      return error;
    }

    const message = responseData.message;
    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }

  if (typeof anyErr?.message === "string" && anyErr.message.trim() !== "") {
    return anyErr.message;
  }

  return fallback;
}

export function useStrokesPerDayPageData(tripId: string | undefined) {
  const [data, setData] = useState<StrokesPerDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialSelectedTeeIds, setInitialSelectedTeeIds] = useState<
    Record<string, number | null>
  >({});
  const [hydrationRevision, setHydrationRevision] = useState(0);

  const hydrateData = useCallback((response: StrokesPerDayResponse) => {
    setData(response);
    setInitialSelectedTeeIds(buildInitialSelectedTeeIds(response));
    setHydrationRevision((revision) => revision + 1);
  }, []);

  const reload = useCallback(async () => {
    if (!tripId) {
      setData(null);
      setError("Event id is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getStrokesPerDay(Number(tripId));
      hydrateData(response);
    } catch (err) {
      console.error("Failed to load daily handicaps", err);
      setError(formatStrokesPerDayError(err, "Unable to load daily handicaps."));
    } finally {
      setLoading(false);
    }
  }, [hydrateData, tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rounds = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  }, [data]);

  const players = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.players].sort((a, b) => {
      const aOrder = a.displayOrder ?? 9999;
      const bOrder = b.displayOrder ?? 9999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [data]);

  return {
    data,
    setData,
    loading,
    error,
    rounds,
    players,
    initialSelectedTeeIds,
    hydrationRevision,
    hydrateData,
    reload,
  };
}
