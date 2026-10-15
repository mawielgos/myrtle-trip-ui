import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTripDetail, getTripGhinFixes, saveTripGhinFix } from "../api/tripApi";
import type { GhinFixRow } from "../types/ghinFix";
import { buildGhinFixDrafts, ghinDraftSnapshot, rowsWithEnteredDifferentials, sortGhinFixRows } from "./tripGhinFixesLogic";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";

export function useTripGhinFixesController() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const [tripName, setTripName] = useState<string>("Event");
  const [rows, setRows] = useState<GhinFixRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [initialDraftSnapshot, setInitialDraftSnapshot] = useState<string>("");

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    void loadPage();
  }, [numericTripId]);

  const outstandingCount = rows.length;

  const comparableDraftSnapshot = useMemo(() => ghinDraftSnapshot(drafts), [drafts]);

  const hasChanges =
    !loading &&
    initialDraftSnapshot.length > 0 &&
    comparableDraftSnapshot !== initialDraftSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(
    hasChanges && savingRowId == null
  );

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }


  const sortedRows = useMemo(() => sortGhinFixRows(rows), [rows]);

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [trip, fixRows] = await Promise.all([
        getTripDetail(numericTripId),
        getTripGhinFixes(numericTripId),
      ]);

      setTripName(trip.tripName);
      setRows(fixRows);
      const loadedDrafts = buildGhinFixDrafts(fixRows);
      setDrafts(loadedDrafts);
      setInitialDraftSnapshot(ghinDraftSnapshot(loadedDrafts));
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(typeof apiMessage === "string" ? apiMessage : "Unable to load GHIN fixes.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(scoreHistoryEntryId: number, value: string): void {
    setDrafts((current) => ({
      ...current,
      [scoreHistoryEntryId]: value,
    }));
  }

  async function handleSave(row: GhinFixRow): Promise<void> {
    const rawValue = (drafts[row.scoreHistoryEntryId] ?? "").trim();

    if (!rawValue) {
      setError(`Enter a differential for ${row.playerName}.`);
      setMessage(null);
      return;
    }

    const numericValue = Number(rawValue);

    if (Number.isNaN(numericValue)) {
      setError(`Differential for ${row.playerName} must be numeric.`);
      setMessage(null);
      return;
    }

    try {
      setSavingRowId(row.scoreHistoryEntryId);
      setError(null);
      setMessage(null);

      const savedRow = await saveTripGhinFix(numericTripId, row.scoreHistoryEntryId, {
        differential: numericValue,
      });

      setRows((current) =>
        current.filter(
          (currentRow) => currentRow.scoreHistoryEntryId !== savedRow.scoreHistoryEntryId
        )
      );

      setDrafts((current) => {
        const next = { ...current };
        delete next[row.scoreHistoryEntryId];
        setInitialDraftSnapshot(ghinDraftSnapshot(next));
        return next;
      });

      const remainingCount = Math.max(rows.length - 1, 0);

      setMessage(
        `${savedRow.playerName} fix saved. ${remainingCount} outstanding GHIN fix${
          remainingCount === 1 ? "" : "es"
        } remaining.`
      );
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : `Unable to save GHIN fix for ${row.playerName}.`
      );
      setMessage(null);
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleSaveAll(): Promise<void> {
    setError(null);
    setMessage(null);

    const rowsToSave = rowsWithEnteredDifferentials(sortedRows, drafts);

    if (rowsToSave.length === 0) {
      setError("No GHIN fixes have been entered.");
      return;
    }

    try {
      setSavingRowId(-1);

      for (const row of rowsToSave) {
        const rawValue = (drafts[row.scoreHistoryEntryId] ?? "").trim();
        const numericValue = Number(rawValue);

        if (Number.isNaN(numericValue)) {
          throw new Error(`Differential for ${row.playerName} must be numeric.`);
        }

        await saveTripGhinFix(numericTripId, row.scoreHistoryEntryId, {
          differential: numericValue,
        });
      }

      setMessage(`${rowsToSave.length} GHIN fix${rowsToSave.length === 1 ? "" : "es"} saved.`);
      await loadPage();
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(typeof apiMessage === "string" ? apiMessage : err?.message ?? "Unable to save all GHIN fixes.");
      setMessage(null);
    } finally {
      setSavingRowId(null);
    }
  }

  return {
    numericTripId,
    tripName,
    drafts,
    savingRowId,
    loading,
    error,
    message,
    outstandingCount,
    sortedRows,
    confirmIfNeeded,
    navigateIfConfirmed,
    updateDraft,
    handleSave,
    handleSaveAll,
  };
}
