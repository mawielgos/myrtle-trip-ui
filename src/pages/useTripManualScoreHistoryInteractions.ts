import { useEffect, useMemo, useState } from "react";
import type { ManualScoreHistoryEntry } from "../types/manualScoreHistory";
import type { TripPlayer } from "../types/trip";
import {
  allocateScoreRowKey,
  createEmptyRows,
  createEmptyScoreRow,
  formatScoreMonthYear,
  getPlayerIdsForEntries,
} from "./tripManualScoreHistoryLogic";
import type { ScoreRowForm } from "./tripManualScoreHistoryLogic";

interface UseTripManualScoreHistoryInteractionsArgs {
  players: TripPlayer[];
  entries: ManualScoreHistoryEntry[];
  loading: boolean;
}

export function useTripManualScoreHistoryInteractions({
  players,
  entries,
  loading,
}: UseTripManualScoreHistoryInteractionsArgs) {
  const [rows, setRows] = useState<ScoreRowForm[]>(createEmptyRows(5));
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<ScoreRowForm | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [collapsedPlayerIds, setCollapsedPlayerIds] = useState<number[]>([]);
  const [selectedDbCandidateIds, setSelectedDbCandidateIds] = useState<number[]>([]);

  useEffect(() => {
    if (loading) return;
    setCollapsedPlayerIds(getPlayerIdsForEntries(entries));
    setSelectedEntryIds([]);
    setEditingEntryId(null);
    setEditRow(null);
  }, [entries, loading]);

  const activePlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.active !== false)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );
  }, [players]);

  const existingCountsByPlayerId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      const key = String(entry.playerId);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const groupedEntries = useMemo(() => {
    const groups: Array<{
      playerId: number;
      playerName: string;
      entries: ManualScoreHistoryEntry[];
    }> = [];

    for (const entry of entries) {
      let group = groups.find((item) => item.playerId === entry.playerId);
      if (!group) {
        group = {
          playerId: entry.playerId,
          playerName: entry.playerName,
          entries: [],
        };
        groups.push(group);
      }
      group.entries.push(entry);
    }

    groups.sort((a, b) =>
      a.playerName.localeCompare(b.playerName, undefined, {
        sensitivity: "base",
      }),
    );

    for (const group of groups) {
      group.entries.sort((a, b) => {
        const aOrder = a.postingOrder ?? 999999;
        const bOrder = b.postingOrder ?? 999999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.scoreHistoryEntryId - b.scoreHistoryEntryId;
      });
    }

    return groups;
  }, [entries]);

  const committedPlayerIds = useMemo(
    () => groupedEntries.map((group) => group.playerId),
    [groupedEntries],
  );

  const selectedEntryCount = selectedEntryIds.length;
  const allVisibleEntriesSelected =
    entries.length > 0 && selectedEntryIds.length === entries.length;

  function updateRow<K extends keyof ScoreRowForm>(
    rowKey: number,
    key: K,
    value: ScoreRowForm[K],
  ): void {
    setRows((current) =>
      current.map((row) =>
        row.rowKey === rowKey ? { ...row, [key]: value } : row,
      ),
    );
  }

  function addRow(): void {
    setRows((current) => [...current, createEmptyScoreRow()]);
  }

  function addFiveRows(): void {
    setRows((current) => [...current, ...createEmptyRows(5)]);
  }

  function clearRows(): void {
    setRows(createEmptyRows(5));
  }

  function removeRow(rowKey: number): void {
    setRows((current) => {
      if (current.length <= 1) return [createEmptyScoreRow()];
      return current.filter((row) => row.rowKey !== rowKey);
    });
  }

  function copyFirstRowDown(): void {
    setRows((current) => {
      if (current.length <= 1) return current;
      const first = current[0];
      return current.map((row, index) => {
        if (index === 0) return row;
        return {
          ...row,
          playerId: row.playerId || first.playerId,
          courseName: row.courseName || first.courseName,
          courseRating: row.courseRating || first.courseRating,
          slope: row.slope || first.slope,
          holesPlayed: row.holesPlayed || first.holesPlayed,
          includedInMyrtleCalc: first.includedInMyrtleCalc,
        };
      });
    });
  }

  function entryToScoreRow(entry: ManualScoreHistoryEntry): ScoreRowForm {
    return {
      rowKey: allocateScoreRowKey(),
      playerId: String(entry.playerId),
      playerName: entry.playerName,
      scoreDate:
        formatScoreMonthYear(entry.scoreDate) === "—"
          ? ""
          : formatScoreMonthYear(entry.scoreDate),
      courseName: entry.courseName ?? "",
      courseRating:
        entry.courseRating == null ? "" : Number(entry.courseRating).toFixed(1),
      slope: entry.slope == null ? "" : String(entry.slope),
      score:
        entry.adjustedGrossScore != null
          ? String(entry.adjustedGrossScore)
          : entry.grossScore != null
            ? String(entry.grossScore)
            : "",
      differential:
        entry.differential == null ? "" : String(entry.differential),
      includedInMyrtleCalc: entry.includedInMyrtleCalc !== false,
      holesPlayed: entry.holesPlayed == null ? "18" : String(entry.holesPlayed),
      postingOrder:
        entry.postingOrder == null ? "" : String(entry.postingOrder),
    };
  }

  function toggleDbCandidateSelected(candidateId: number): void {
    setSelectedDbCandidateIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    );
  }

  function toggleSelectAllDbCandidates(candidateIds: number[], checked: boolean): void {
    setSelectedDbCandidateIds(checked ? candidateIds : []);
  }

  function toggleSelectedEntry(entryId: number): void {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  }

  function toggleSelectAllEntries(checked: boolean): void {
    setSelectedEntryIds(
      checked ? entries.map((entry) => entry.scoreHistoryEntryId) : [],
    );
  }

  function togglePlayerSelected(
    groupEntries: ManualScoreHistoryEntry[],
    checked: boolean,
  ): void {
    const groupIds = groupEntries.map((entry) => entry.scoreHistoryEntryId);
    setSelectedEntryIds((current) => {
      if (!checked) {
        return current.filter((id) => !groupIds.includes(id));
      }

      const next = [...current];
      for (const id of groupIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }

  function togglePlayerCollapsed(playerId: number): void {
    setCollapsedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  function collapseAllPlayers(): void {
    setCollapsedPlayerIds(committedPlayerIds);
  }

  function expandAllPlayers(): void {
    setCollapsedPlayerIds([]);
  }

  function startEdit(entry: ManualScoreHistoryEntry): void {
    setEditingEntryId(entry.scoreHistoryEntryId);
    setEditRow(entryToScoreRow(entry));
  }

  function cancelEdit(): void {
    setEditingEntryId(null);
    setEditRow(null);
  }

  function updateEditRow<K extends keyof ScoreRowForm>(
    key: K,
    value: ScoreRowForm[K],
  ): void {
    setEditRow((current) => (current ? { ...current, [key]: value } : current));
  }

  return {
    rows,
    setRows,
    editingEntryId,
    editRow,
    selectedEntryIds,
    collapsedPlayerIds,
    selectedDbCandidateIds,
    setSelectedDbCandidateIds,
    activePlayers,
    existingCountsByPlayerId,
    groupedEntries,
    selectedEntryCount,
    allVisibleEntriesSelected,
    updateRow,
    addRow,
    addFiveRows,
    clearRows,
    removeRow,
    copyFirstRowDown,
    toggleDbCandidateSelected,
    toggleSelectAllDbCandidates,
    toggleSelectedEntry,
    toggleSelectAllEntries,
    togglePlayerSelected,
    togglePlayerCollapsed,
    collapseAllPlayers,
    expandAllPlayers,
    startEdit,
    cancelEdit,
    updateEditRow,
  };
}
