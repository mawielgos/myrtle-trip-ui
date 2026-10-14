import { useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import {
  createManualScoreHistoryEntries,
  deleteManualScoreHistoryEntry,
  getImportableDbScoreHistory,
  updateManualScoreHistoryEntry,
} from "../api/tripApi";
import { useAppDialog } from "../components/common/AppDialog";
import type {
  DbScoreHistoryImportCandidate,
  ManualScoreHistoryEntry,
  SaveManualScoreHistoryEntryRequest,
} from "../types/manualScoreHistory";
import type { TripPlayer } from "../types/trip";
import {
  createEmptyRows,
  formatScoreMonthYear,
  parseCsvRows,
  parseOptionalNumber,
  parseRequiredNumber,
  parseScoreMonthYear,
  roundOneDecimal,
} from "./tripManualScoreHistoryLogic";
import type { ScoreRowForm } from "./tripManualScoreHistoryLogic";

const MAX_ROWS_PER_PLAYER = 20;

function getApiMessage(error: unknown): string | null {
  const err = error as any;
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null)
  );
}

interface UseTripManualScoreHistoryCommandsArgs {
  numericTripId: number;
  activePlayers: TripPlayer[];
  existingCountsByPlayerId: Record<string, number>;
  rows: ScoreRowForm[];
  setRows: Dispatch<SetStateAction<ScoreRowForm[]>>;
  selectedDbCandidateIds: number[];
  setSelectedDbCandidateIds: Dispatch<SetStateAction<number[]>>;
  selectedEntryIds: number[];
  editRow: ScoreRowForm | null;
  setError: Dispatch<SetStateAction<string | null>>;
  refreshCommittedEntries: () => Promise<ManualScoreHistoryEntry[]>;
}

export function useTripManualScoreHistoryCommands({
  numericTripId,
  activePlayers,
  existingCountsByPlayerId,
  rows,
  setRows,
  selectedDbCandidateIds,
  setSelectedDbCandidateIds,
  selectedEntryIds,
  editRow,
  setError,
  refreshCommittedEntries,
}: UseTripManualScoreHistoryCommandsArgs) {
  const { confirmDialog } = useAppDialog();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dbCandidates, setDbCandidates] = useState<DbScoreHistoryImportCandidate[]>([]);
  const [loadingDbCandidates, setLoadingDbCandidates] = useState(false);

  function rowHasAnyValue(row: ScoreRowForm): boolean {
    return Boolean(
      row.playerId ||
        row.playerName.trim() ||
        row.scoreDate.trim() ||
        row.courseName.trim() ||
        row.score.trim() ||
        row.courseRating.trim() ||
        row.slope.trim() ||
        row.differential.trim() ||
        row.postingOrder.trim(),
    );
  }

  function buildRequestFromRow(
    row: ScoreRowForm,
    rowNumber: number,
    postingOrderFallback: number | null,
  ): SaveManualScoreHistoryEntryRequest {
    const playerId = parseRequiredNumber(row.playerId, "Player", rowNumber);
    const courseRating = roundOneDecimal(
      parseRequiredNumber(row.courseRating, "CR", rowNumber),
    );
    const slope = parseRequiredNumber(row.slope, "Slope", rowNumber);
    const score = parseRequiredNumber(row.score, "Score", rowNumber);
    const differentialRaw = parseOptionalNumber(row.differential, "Diff", rowNumber);
    const differential = differentialRaw == null ? null : roundOneDecimal(differentialRaw);
    const holesPlayed = parseRequiredNumber(row.holesPlayed, "Holes", rowNumber);
    const scoreDate = parseScoreMonthYear(row.scoreDate, rowNumber);
    const postingOrder = row.postingOrder.trim()
      ? parseRequiredNumber(row.postingOrder, "Seq", rowNumber)
      : postingOrderFallback;

    if (holesPlayed !== 9 && holesPlayed !== 18) {
      throw new Error(`Row ${rowNumber}: Holes must be 9 or 18.`);
    }
    if (postingOrder != null && postingOrder <= 0) {
      throw new Error(`Row ${rowNumber}: Seq must be greater than zero.`);
    }

    return {
      playerId,
      scoreDate,
      courseName: row.courseName.trim(),
      courseRating,
      slope,
      grossScore: score,
      adjustedGrossScore: score,
      differential,
      includedInMyrtleCalc: row.includedInMyrtleCalc,
      holesPlayed,
      postingOrder,
    };
  }

  function validateCommitCounts(payload: SaveManualScoreHistoryEntryRequest[]): void {
    const newCounts: Record<string, number> = {};
    for (const item of payload) {
      const key = String(item.playerId);
      newCounts[key] = (newCounts[key] ?? 0) + 1;
    }

    for (const key of Object.keys(newCounts)) {
      const player = activePlayers.find((candidate) => String(candidate.playerId) === key);
      const total = (existingCountsByPlayerId[key] ?? 0) + newCounts[key];
      if (total > MAX_ROWS_PER_PLAYER) {
        throw new Error(
          `${player?.displayName ?? "A player"} would have ${total} committed scores. Maximum is ${MAX_ROWS_PER_PLAYER}.`,
        );
      }
    }
  }

  function buildPayload(): SaveManualScoreHistoryEntryRequest[] {
    const payload: SaveManualScoreHistoryEntryRequest[] = [];
    let perPlayerOrder: Record<string, number> = {};

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!rowHasAnyValue(row)) continue;
      if (!row.playerId && row.playerName.trim()) {
        throw new Error(
          `Row ${i + 1}: Player "${row.playerName}" did not match an event player. Select the player before committing.`,
        );
      }

      const nextOrder = row.playerId
        ? (perPlayerOrder[row.playerId] ?? 0) + 1
        : payload.length + 1;
      if (row.playerId) {
        perPlayerOrder = { ...perPlayerOrder, [row.playerId]: nextOrder };
      }
      payload.push(buildRequestFromRow(row, i + 1, nextOrder));
    }

    if (payload.length === 0) {
      throw new Error("At least one completed score row is required.");
    }
    validateCommitCounts(payload);
    return payload;
  }

  async function handleSaveAll(): Promise<void> {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const payload = buildPayload();
      const saved = await createManualScoreHistoryEntries(numericTripId, payload);
      await refreshCommittedEntries();
      setRows(createEmptyRows(5));
      setMessage(
        `${saved.length} score history ${saved.length === 1 ? "entry" : "entries"} committed.`,
      );
    } catch (error: unknown) {
      const apiMessage = getApiMessage(error);
      const err = error as any;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : (err?.message ?? "Unable to save score history entries."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadDbCandidates(): Promise<void> {
    try {
      setLoadingDbCandidates(true);
      setError(null);
      setMessage(null);
      const candidates = await getImportableDbScoreHistory(numericTripId);
      setDbCandidates(candidates);
      setSelectedDbCandidateIds([]);
      setMessage(
        `${candidates.length} prior event score ${candidates.length === 1 ? "row" : "rows"} found. Select rows, then commit them into this event score history.`,
      );
    } catch (error: unknown) {
      const apiMessage = getApiMessage(error);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to load prior event score history.",
      );
    } finally {
      setLoadingDbCandidates(false);
    }
  }

  async function handleCommitSelectedDbCandidates(): Promise<void> {
    if (selectedDbCandidateIds.length === 0) return;

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const selectedCandidates = dbCandidates.filter((candidate) =>
        selectedDbCandidateIds.includes(candidate.sourceScoreHistoryEntryId),
      );
      const perPlayerOrder: Record<number, number> = {};
      const payload: SaveManualScoreHistoryEntryRequest[] = [];

      for (const candidate of selectedCandidates) {
        const nextOrder = (perPlayerOrder[candidate.playerId] ?? 0) + 1;
        perPlayerOrder[candidate.playerId] = nextOrder;
        payload.push({
          playerId: candidate.playerId,
          scoreDate: candidate.scoreDate,
          courseName: candidate.courseName || "Unknown Course",
          courseRating: roundOneDecimal(Number(candidate.courseRating)),
          slope: Number(candidate.slope),
          grossScore: Number(candidate.grossScore),
          adjustedGrossScore:
            candidate.adjustedGrossScore == null
              ? Number(candidate.grossScore)
              : Number(candidate.adjustedGrossScore),
          differential:
            candidate.differential == null
              ? null
              : roundOneDecimal(Number(candidate.differential)),
          includedInMyrtleCalc: candidate.includedInMyrtleCalc !== false,
          holesPlayed: candidate.holesPlayed || 18,
          postingOrder: nextOrder,
        });
      }

      validateCommitCounts(payload);
      const saved = await createManualScoreHistoryEntries(numericTripId, payload);
      await refreshCommittedEntries();
      setSelectedDbCandidateIds([]);
      setMessage(
        `${saved.length} prior event score ${saved.length === 1 ? "row" : "rows"} committed into this event.`,
      );
    } catch (error: unknown) {
      const apiMessage = getApiMessage(error);
      const err = error as any;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : (err?.message ?? "Unable to commit selected prior event scores."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setError(null);
      setMessage(null);
      const text = await file.text();
      const parsedRows = parseCsvRows(text, activePlayers);
      setRows(parsedRows);
      const unmatched = parsedRows.filter((row) => !row.playerId).length;
      setMessage(
        `${parsedRows.length} uploaded ${parsedRows.length === 1 ? "row" : "rows"} loaded. ${unmatched > 0 ? `${unmatched} player ${unmatched === 1 ? "name needs" : "names need"} manual matching before commit.` : "Review/resequence, then commit."}`,
      );
    } catch (error: unknown) {
      const err = error as any;
      setError(err?.message ?? "Unable to parse upload file.");
    }
  }

  async function handleDelete(entry: ManualScoreHistoryEntry): Promise<void> {
    const confirmed = await confirmDialog({
      title: "Delete Score History Entry",
      message: `Delete score history entry for ${entry.playerName} on ${formatScoreMonthYear(entry.scoreDate)}?`,
      severity: "danger",
      confirmText: "Delete Entry",
    });
    if (!confirmed) return;

    try {
      setError(null);
      setMessage(null);
      await deleteManualScoreHistoryEntry(numericTripId, entry.scoreHistoryEntryId);
      await refreshCommittedEntries();
      setMessage("Score history entry deleted.");
    } catch (error: unknown) {
      const apiMessage = getApiMessage(error);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to delete score history entry.",
      );
    }
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedEntryIds.length === 0) return;

    const confirmed = await confirmDialog({
      title: "Delete Selected Score History",
      message: `Delete ${selectedEntryIds.length} selected score history ${selectedEntryIds.length === 1 ? "entry" : "entries"}?`,
      severity: "danger",
      confirmText: "Delete Selected",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      for (const entryId of selectedEntryIds) {
        await deleteManualScoreHistoryEntry(numericTripId, entryId);
      }
      const removedCount = selectedEntryIds.length;
      await refreshCommittedEntries();
      setMessage(
        `${removedCount} score history ${removedCount === 1 ? "entry" : "entries"} deleted.`,
      );
    } catch (error: unknown) {
      const apiMessage = getApiMessage(error);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to delete selected score history entries.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(entryId: number): Promise<void> {
    if (!editRow) return;

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const payload = buildRequestFromRow(editRow, 1, null);
      await updateManualScoreHistoryEntry(numericTripId, entryId, payload);
      await refreshCommittedEntries();
      setMessage("Score history entry updated.");
    } catch (error: unknown) {
      const apiMessage = getApiMessage(error);
      const err = error as any;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : (err?.message ?? "Unable to update score history entry."),
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    message,
    setMessage,
    dbCandidates,
    loadingDbCandidates,
    handleSaveAll,
    handleLoadDbCandidates,
    handleCommitSelectedDbCandidates,
    handleUpload,
    handleDelete,
    handleBulkDelete,
    handleSaveEdit,
  };
}
