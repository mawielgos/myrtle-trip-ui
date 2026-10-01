import { Fragment, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { useParams } from "react-router-dom";
import {
  createManualScoreHistoryEntries,
  deleteManualScoreHistoryEntry,
  updateManualScoreHistoryEntry,
  getImportableDbScoreHistory,
  getManualScoreHistory,
  getTripDetail,
  getTripPlayers,
} from "../api/tripApi";
import type {
  DbScoreHistoryImportCandidate,
  ManualScoreHistoryEntry,
  SaveManualScoreHistoryEntryRequest,
} from "../types/manualScoreHistory";
import type { TripPlayer } from "../types/trip";
import {
  actionRowStyle,
  appTableStyle,
  buttonStyle,
  dangerButtonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import TripDetailButton from "../components/common/TripDetailButton";

interface ScoreRowForm {
  rowKey: number;
  playerId: string;
  playerName: string;
  scoreDate: string;
  courseName: string;
  courseRating: string;
  slope: string;
  score: string;
  differential: string;
  includedInMyrtleCalc: boolean;
  holesPlayed: string;
  postingOrder: string;
}

const MAX_ROWS_PER_PLAYER = 20;
let nextRowKey = 1;

const gridInputStyle = {
  ...formInputStyle,
  height: "30px",
  padding: "4px 8px",
  fontSize: "13px",
};
const gridSelectStyle = {
  ...formSelectStyle,
  height: "30px",
  padding: "4px 8px",
  fontSize: "13px",
};

const committedHeaderCellStyle: CSSProperties = {
  ...thStyle,
  position: "sticky",
  top: 0,
  zIndex: 5,
  background: "#fff",
  boxShadow: "0 1px 0 #c7ccd1",
  whiteSpace: "nowrap",
};

const committedTableStyle: CSSProperties = {
  ...appTableStyle,
  minWidth: "1100px",
  margin: 0,
  borderCollapse: "separate",
  borderSpacing: 0,
};


function createEmptyScoreRow(): ScoreRowForm {
  const row: ScoreRowForm = {
    rowKey: nextRowKey,
    playerId: "",
    playerName: "",
    scoreDate: "",
    courseName: "",
    courseRating: "",
    slope: "",
    score: "",
    differential: "",
    includedInMyrtleCalc: true,
    holesPlayed: "18",
    postingOrder: "",
  };
  nextRowKey += 1;
  return row;
}

function createEmptyRows(count: number): ScoreRowForm[] {
  const rows: ScoreRowForm[] = [];
  for (let i = 0; i < count; i += 1) rows.push(createEmptyScoreRow());
  return rows;
}

function formatNumber(
  value: number | null | undefined,
  digits: number,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function pickValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (row[normalized] != null) return row[normalized];
  }
  return "";
}

function parseBooleanText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "y" ||
    normalized === "1"
  );
}

function parseRequiredNumber(
  value: string,
  label: string,
  rowNumber: number,
): number {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Row ${rowNumber}: ${label} is required.`);
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed))
    throw new Error(`Row ${rowNumber}: ${label} must be numeric.`);
  return parsed;
}

function parseOptionalNumber(
  value: string,
  label: string,
  rowNumber: number,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed))
    throw new Error(`Row ${rowNumber}: ${label} must be numeric.`);
  return parsed;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseScoreMonthYear(value: string, rowNumber: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Row ${rowNumber}: Score Date is required.`);

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-01`;

  const monthYearMatch = trimmed.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!monthYearMatch)
    throw new Error(
      `Row ${rowNumber}: Score Date must be MM/YY, for example 04/26.`,
    );

  const month = Number(monthYearMatch[1]);
  if (month < 1 || month > 12)
    throw new Error(`Row ${rowNumber}: Month must be between 1 and 12.`);

  let year = Number(monthYearMatch[2]);
  if (year < 100) year += 2000;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function formatScoreMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!match) return value;
  return `${match[2]}/${match[1].slice(2)}`;
}

function parseCsvRows(text: string, players: TripPlayer[]): ScoreRowForm[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2)
    throw new Error(
      "Upload file must include a header row and at least one score row.",
    );

  const playerByName: Record<string, TripPlayer> = {};
  for (const player of players)
    playerByName[normalizeName(player.displayName)] = player;

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows: ScoreRowForm[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const rowMap: Record<string, string> = {};
    for (let h = 0; h < headers.length; h += 1)
      rowMap[headers[h]] = values[h] ?? "";

    const playerName = pickValue(rowMap, [
      "Player",
      "Player Name",
      "Golfer",
      "Name",
      "displayName",
    ]);
    const matchedPlayer = playerByName[normalizeName(playerName)];

    rows.push({
      rowKey: nextRowKey,
      playerId: matchedPlayer ? String(matchedPlayer.playerId) : "",
      playerName,
      scoreDate: pickValue(rowMap, [
        "Score Date",
        "scoreDate",
        "date",
        "score_date",
      ]),
      courseName: pickValue(rowMap, [
        "Course Name",
        "courseName",
        "course",
        "course_name",
      ]),
      score: pickValue(rowMap, [
        "Score",
        "grossScore",
        "gross",
        "adjustedGrossScore",
        "adjusted_gross_score",
      ]),
      courseRating: pickValue(rowMap, [
        "CR",
        "courseRating",
        "rating",
        "course_rating",
      ]),
      slope: pickValue(rowMap, ["Slope"]),
      differential: pickValue(rowMap, ["Diff", "differential"]),
      holesPlayed:
        pickValue(rowMap, ["Holes", "holesPlayed", "holes_played"]) || "18",
      includedInMyrtleCalc: parseBooleanText(
        pickValue(rowMap, [
          "Include In Event",
          "includedInMyrtleCalc",
          "included",
          "include",
          "myrtle",
          "included_in_myrtle_calc",
        ]),
      ),
      postingOrder: pickValue(rowMap, [
        "Seq",
        "Sequence",
        "Posting Order",
        "postingOrder",
        "posting_order",
      ]),
    });
    nextRowKey += 1;
  }

  return rows;
}

function getPlayerIdsForEntries(entries: ManualScoreHistoryEntry[]): number[] {
  const playerIds: number[] = [];
  for (const entry of entries) {
    if (!playerIds.includes(entry.playerId)) {
      playerIds.push(entry.playerId);
    }
  }
  return playerIds;
}

export default function TripManualScoreHistoryPage() {
  const { confirmDialog } = useAppDialog();
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const [tripName, setTripName] = useState("Event");
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [entries, setEntries] = useState<ManualScoreHistoryEntry[]>([]);
  const [rows, setRows] = useState<ScoreRowForm[]>(createEmptyRows(5));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<ScoreRowForm | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [collapsedPlayerIds, setCollapsedPlayerIds] = useState<number[]>([]);
  const [dbCandidates, setDbCandidates] = useState<DbScoreHistoryImportCandidate[]>([]);
  const [selectedDbCandidateIds, setSelectedDbCandidateIds] = useState<number[]>([]);
  const [loadingDbCandidates, setLoadingDbCandidates] = useState(false);

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }
    void loadPage();
  }, [numericTripId]);

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

  const committedPlayerIds = useMemo(() => {
    return groupedEntries.map((group) => group.playerId);
  }, [groupedEntries]);

  const selectedEntryCount = selectedEntryIds.length;
  const allVisibleEntriesSelected =
    entries.length > 0 && selectedEntryIds.length === entries.length;

  const selectedDbCandidateCount = selectedDbCandidateIds.length;
  const allDbCandidatesSelected =
    dbCandidates.length > 0 && selectedDbCandidateIds.length === dbCandidates.length;

  const groupedDbCandidates = useMemo(() => {
    const groups: Array<{
      playerId: number;
      playerName: string;
      candidates: DbScoreHistoryImportCandidate[];
    }> = [];

    for (const candidate of dbCandidates) {
      let group = groups.find((item) => item.playerId === candidate.playerId);
      if (!group) {
        group = {
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          candidates: [],
        };
        groups.push(group);
      }
      group.candidates.push(candidate);
    }

    groups.sort((a, b) =>
      a.playerName.localeCompare(b.playerName, undefined, {
        sensitivity: "base",
      }),
    );

    for (const group of groups) {
      group.candidates.sort((a, b) => {
        const aDate = a.scoreDate || "";
        const bDate = b.scoreDate || "";
        if (aDate !== bDate) return bDate.localeCompare(aDate);
        return b.sourceScoreHistoryEntryId - a.sourceScoreHistoryEntryId;
      });
    }

    return groups;
  }, [dbCandidates]);

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const [trip, tripPlayers, manualEntries] = await Promise.all([
        getTripDetail(numericTripId),
        getTripPlayers(numericTripId),
        getManualScoreHistory(numericTripId),
      ]);
      setTripName(trip.tripName);
      setPlayers(tripPlayers);
      setEntries(manualEntries);
      setCollapsedPlayerIds(getPlayerIdsForEntries(manualEntries));
      setSelectedEntryIds([]);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to load manual score history.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshCommittedEntries(): Promise<void> {
    const manualEntries = await getManualScoreHistory(numericTripId);
    setEntries(manualEntries);
    setCollapsedPlayerIds(getPlayerIdsForEntries(manualEntries));
    setSelectedEntryIds([]);
    setEditingEntryId(null);
    setEditRow(null);
  }

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
      rowKey: nextRowKey++,
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
    const differentialRaw = parseOptionalNumber(
      row.differential,
      "Diff",
      rowNumber,
    );
    const differential =
      differentialRaw == null ? null : roundOneDecimal(differentialRaw);
    const holesPlayed = parseRequiredNumber(
      row.holesPlayed,
      "Holes",
      rowNumber,
    );
    const scoreDate = parseScoreMonthYear(row.scoreDate, rowNumber);
    const postingOrder = row.postingOrder.trim()
      ? parseRequiredNumber(row.postingOrder, "Seq", rowNumber)
      : postingOrderFallback;

    if (holesPlayed !== 9 && holesPlayed !== 18)
      throw new Error(`Row ${rowNumber}: Holes must be 9 or 18.`);
    if (postingOrder != null && postingOrder <= 0)
      throw new Error(`Row ${rowNumber}: Seq must be greater than zero.`);

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

  function validateCommitCounts(
    payload: SaveManualScoreHistoryEntryRequest[],
  ): void {
    const newCounts: Record<string, number> = {};
    for (const item of payload) {
      const key = String(item.playerId);
      newCounts[key] = (newCounts[key] ?? 0) + 1;
    }
    for (const key of Object.keys(newCounts)) {
      const player = activePlayers.find(
        (candidate) => String(candidate.playerId) === key,
      );
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
      if (!row.playerId && row.playerName.trim())
        throw new Error(
          `Row ${i + 1}: Player "${row.playerName}" did not match an event player. Select the player before committing.`,
        );

      const nextOrder = row.playerId
        ? (perPlayerOrder[row.playerId] ?? 0) + 1
        : payload.length + 1;
      if (row.playerId)
        perPlayerOrder = { ...perPlayerOrder, [row.playerId]: nextOrder };
      payload.push(buildRequestFromRow(row, i + 1, nextOrder));
    }

    if (payload.length === 0)
      throw new Error("At least one completed score row is required.");
    validateCommitCounts(payload);
    return payload;
  }

  async function handleSaveAll(): Promise<void> {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const payload = buildPayload();
      const saved = await createManualScoreHistoryEntries(
        numericTripId,
        payload,
      );
      await refreshCommittedEntries();
      setRows(createEmptyRows(5));
      setMessage(
        `${saved.length} score history ${saved.length === 1 ? "entry" : "entries"} committed.`,
      );
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
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
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to load prior event score history.",
      );
    } finally {
      setLoadingDbCandidates(false);
    }
  }

  function toggleDbCandidateSelected(candidateId: number): void {
    setSelectedDbCandidateIds((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }
      return [...current, candidateId];
    });
  }

  function toggleSelectAllDbCandidates(checked: boolean): void {
    if (!checked) {
      setSelectedDbCandidateIds([]);
      return;
    }
    setSelectedDbCandidateIds(
      dbCandidates.map((candidate) => candidate.sourceScoreHistoryEntryId),
    );
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
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : (err?.message ?? "Unable to commit selected prior event scores."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
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
    } catch (err: any) {
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
      await deleteManualScoreHistoryEntry(
        numericTripId,
        entry.scoreHistoryEntryId,
      );
      await refreshCommittedEntries();
      setMessage("Score history entry deleted.");
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to delete score history entry.",
      );
    }
  }

  function toggleSelectedEntry(entryId: number): void {
    setSelectedEntryIds((current) => {
      if (current.includes(entryId)) {
        return current.filter((id) => id !== entryId);
      }
      return [...current, entryId];
    });
  }

  function toggleSelectAllEntries(checked: boolean): void {
    if (!checked) {
      setSelectedEntryIds([]);
      return;
    }
    setSelectedEntryIds(entries.map((entry) => entry.scoreHistoryEntryId));
  }

  function togglePlayerSelected(groupEntries: ManualScoreHistoryEntry[], checked: boolean): void {
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
    setCollapsedPlayerIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function collapseAllPlayers(): void {
    setCollapsedPlayerIds(committedPlayerIds);
  }

  function expandAllPlayers(): void {
    setCollapsedPlayerIds([]);
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
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to delete selected score history entries.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: ManualScoreHistoryEntry): void {
    setEditingEntryId(entry.scoreHistoryEntryId);
    setEditRow(entryToScoreRow(entry));
    setError(null);
    setMessage(null);
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

  async function handleSaveEdit(entryId: number): Promise<void> {
    if (!editRow) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const payload = buildRequestFromRow(editRow, 1, null);
      await updateManualScoreHistoryEntry(
        numericTripId,
        entryId,
        payload,
      );
      await refreshCommittedEntries();
      setMessage("Score history entry updated.");
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : (err?.message ?? "Unable to update score history entry."),
      );
    } finally {
      setSaving(false);
    }
  }

  function playerSelect(
    value: string,
    onChange: (value: string) => void,
    width = "160px",
  ) {
    return (
      <select
        style={{ ...gridSelectStyle, width }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select player</option>
        {activePlayers.map((player) => (
          <option key={player.playerId} value={player.playerId}>
            {player.displayName}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Manual Score History"
        subtitle={`${tripName} • Add or upload DB Score History rows for this event only`}
        actions={
          <>
            <TripDetailButton tripId={numericTripId} />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void loadPage()}
            >
              Refresh
            </button>
          </>
        }
      />

      {error && <div style={errorBoxStyle}>{error}</div>}
      {message && <div style={successBoxStyle}>{message}</div>}

      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Import Score History</h2>
        <p style={{ marginTop: "-4px", color: "#555", fontSize: "13px" }}>
          Upload one CSV for one or more trip players, review the preview rows,
          resequence if needed, then commit. Player matching is case-insensitive
          and limited to players on this event. No player can commit more than 20
          score rows.
        </p>

        <div
          style={{ ...actionRowStyle, alignItems: "end", marginBottom: "12px" }}
        >
          <label>
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              Upload CSV
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void handleUpload(event)}
            />
          </label>
          <button type="button" style={buttonStyle} onClick={addRow}>
            Add Row
          </button>
          <button type="button" style={buttonStyle} onClick={addFiveRows}>
            Add 5 Rows
          </button>
          <button type="button" style={buttonStyle} onClick={copyFirstRowDown}>
            Copy First Row Down
          </button>
          <button type="button" style={buttonStyle} onClick={clearRows}>
            Clear Preview
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            disabled={saving || loading}
            onClick={() => void handleSaveAll()}
          >
            {saving ? "Committing..." : "Commit Preview Rows"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              ...appTableStyle,
              tableLayout: "fixed",
              minWidth: "1120px",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "170px" }}>Player</th>
                <th style={{ ...thStyle, width: "48px" }}>Seq</th>
                <th style={{ ...thStyle, width: "88px" }}>Score Date</th>
                <th style={{ ...thStyle, width: "180px" }}>Course Name</th>
                <th style={{ ...thStyle, width: "72px" }}>Score</th>
                <th style={{ ...thStyle, width: "70px" }}>CR</th>
                <th style={{ ...thStyle, width: "70px" }}>Slope</th>
                <th style={{ ...thStyle, width: "70px" }}>Diff</th>
                <th style={{ ...thStyle, width: "70px" }}>Holes</th>
                <th style={{ ...thStyle, width: "76px" }}>Include</th>
                <th style={{ ...thStyle, width: "92px" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.rowKey}>
                  <td style={tdStyle}>
                    {playerSelect(row.playerId, (value) =>
                      updateRow(row.rowKey, "playerId", value),
                    )}
                    {!row.playerId && row.playerName && (
                      <div
                        style={{
                          color: "#b25b00",
                          fontSize: "11px",
                          marginTop: "3px",
                        }}
                      >
                        No match: {row.playerName}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      style={{ ...gridInputStyle, width: "40px" }}
                      value={row.postingOrder || String(index + 1)}
                      onChange={(event) =>
                        updateRow(
                          row.rowKey,
                          "postingOrder",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ ...gridInputStyle, width: "74px" }}
                      value={row.scoreDate}
                      onChange={(event) =>
                        updateRow(row.rowKey, "scoreDate", event.target.value)
                      }
                      placeholder="MM/YY"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ ...gridInputStyle, width: "160px" }}
                      value={row.courseName}
                      onChange={(event) =>
                        updateRow(row.rowKey, "courseName", event.target.value)
                      }
                      placeholder="Optional"
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      style={{ ...gridInputStyle, width: "58px" }}
                      value={row.score}
                      onChange={(event) =>
                        updateRow(row.rowKey, "score", event.target.value)
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      step="0.1"
                      style={{ ...gridInputStyle, width: "58px" }}
                      value={row.courseRating}
                      onChange={(event) =>
                        updateRow(
                          row.rowKey,
                          "courseRating",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      style={{ ...gridInputStyle, width: "58px" }}
                      value={row.slope}
                      onChange={(event) =>
                        updateRow(row.rowKey, "slope", event.target.value)
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      step="0.1"
                      style={{ ...gridInputStyle, width: "58px" }}
                      value={row.differential}
                      onChange={(event) =>
                        updateRow(
                          row.rowKey,
                          "differential",
                          event.target.value,
                        )
                      }
                      placeholder="Auto"
                    />
                  </td>
                  <td style={tdStyle}>
                    <select
                      style={{ ...gridSelectStyle, width: "62px" }}
                      value={row.holesPlayed}
                      onChange={(event) =>
                        updateRow(row.rowKey, "holesPlayed", event.target.value)
                      }
                    >
                      <option value="18">18</option>
                      <option value="9">9</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={row.includedInMyrtleCalc}
                      onChange={(event) =>
                        updateRow(
                          row.rowKey,
                          "includedInMyrtleCalc",
                          event.target.checked,
                        )
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={dangerButtonStyle}
                      onClick={() => removeRow(row.rowKey)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "10px", color: "#666", fontSize: "12px" }}>
          CSV headers:{" "}
          <strong>
            Player, Seq, Score Date, Course Name, Score, CR, Slope, Diff,
            Holes, Include In Event
          </strong>
          . Diff and Course Name are optional. CR and Diff are rounded to 1
          decimal before commit.
        </div>
      </div>

      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Import Scores From Prior Events</h2>
            <p style={{ margin: "6px 0 0", color: "#555", fontSize: "13px" }}>
              Load finalized prior-trip round scores for players on this event, select the rows you want, then commit them into this event score history.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ color: "#555", fontSize: "13px" }}>
              {selectedDbCandidateCount} selected
            </span>
            <button
              type="button"
              style={buttonStyle}
              disabled={loadingDbCandidates || saving}
              onClick={() => void handleLoadDbCandidates()}
            >
              {loadingDbCandidates ? "Loading..." : "Load DB Scores"}
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              disabled={saving || selectedDbCandidateCount === 0}
              onClick={() => void handleCommitSelectedDbCandidates()}
            >
              Commit Selected DB Scores
            </button>
          </div>
        </div>

        {dbCandidates.length > 0 && (
          <div
            style={{
              marginTop: "12px",
              maxHeight: "360px",
              overflowY: "auto",
              overflowX: "auto",
              border: "1px solid #d8dee8",
              borderRadius: "10px",
            }}
          >
            <table style={{ ...committedTableStyle, minWidth: "1180px" }}>
              <thead>
                <tr>
                  <th style={{ ...committedHeaderCellStyle, width: "42px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={allDbCandidatesSelected}
                      onChange={(event) =>
                        toggleSelectAllDbCandidates(event.target.checked)
                      }
                      aria-label="Select all prior event score rows"
                    />
                  </th>
                  <th style={committedHeaderCellStyle}>Player</th>
                  <th style={committedHeaderCellStyle}>Source Event</th>
                  <th style={committedHeaderCellStyle}>Round</th>
                  <th style={committedHeaderCellStyle}>Score Date</th>
                  <th style={committedHeaderCellStyle}>Course</th>
                  <th style={committedHeaderCellStyle}>Score</th>
                  <th style={committedHeaderCellStyle}>CR</th>
                  <th style={committedHeaderCellStyle}>Slope</th>
                  <th style={committedHeaderCellStyle}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {groupedDbCandidates.map((group) => (
                  <Fragment key={`db-group-${group.playerId}`}>
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          ...tdStyle,
                          background: "#f3f6f9",
                          borderTop: "2px solid #cfd8e3",
                          fontWeight: 700,
                        }}
                      >
                        {group.playerName} · {group.candidates.length} available score
                        {group.candidates.length === 1 ? "" : "s"}
                      </td>
                    </tr>
                    {group.candidates.map((candidate) => (
                      <tr key={candidate.sourceScoreHistoryEntryId}>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedDbCandidateIds.includes(
                              candidate.sourceScoreHistoryEntryId,
                            )}
                            onChange={() =>
                              toggleDbCandidateSelected(
                                candidate.sourceScoreHistoryEntryId,
                              )
                            }
                            aria-label={`Select prior event score for ${candidate.playerName}`}
                          />
                        </td>
                        <td style={tdStyle}>{candidate.playerName}</td>
                        <td style={tdStyle}>
                          {candidate.sourceTripName || candidate.sourceTripCode || "—"}
                        </td>
                        <td style={tdStyle}>
                          {candidate.sourceRoundNumber == null
                            ? "—"
                            : candidate.sourceRoundNumber}
                        </td>
                        <td style={tdStyle}>
                          {formatScoreMonthYear(candidate.scoreDate)}
                        </td>
                        <td style={tdStyle}>{candidate.courseName || "—"}</td>
                        <td style={tdStyle}>
                          {candidate.adjustedGrossScore ?? candidate.grossScore}
                        </td>
                        <td style={tdStyle}>
                          {formatNumber(candidate.courseRating, 1)}
                        </td>
                        <td style={tdStyle}>{candidate.slope}</td>
                        <td style={tdStyle}>
                          {formatNumber(candidate.differential, 1)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Committed Score History Entries</h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              color: "#555",
            }}
          >
            <span>{selectedEntryCount} selected</span>
            <button
              type="button"
              style={buttonStyle}
              disabled={groupedEntries.length === 0}
              onClick={expandAllPlayers}
            >
              Expand All
            </button>
            <button
              type="button"
              style={buttonStyle}
              disabled={groupedEntries.length === 0}
              onClick={collapseAllPlayers}
            >
              Collapse All
            </button>
            <button
              type="button"
              style={dangerButtonStyle}
              disabled={saving || selectedEntryCount === 0}
              onClick={() => void handleBulkDelete()}
            >
              Remove Selected
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ marginTop: "12px" }}>Loading score history...</div>
        ) : entries.length === 0 ? (
          <div style={{ color: "#555", marginTop: "12px" }}>
            No score history entries for this event yet.
          </div>
        ) : (
          <div
            style={{
              maxHeight: "520px",
              overflowY: "auto",
              overflowX: "auto",
              border: "1px solid #d8dee8",
              borderRadius: "10px",
            }}
          >
            <table style={committedTableStyle}>
              <thead>
                <tr>
                  <th style={{ ...committedHeaderCellStyle, width: "42px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={allVisibleEntriesSelected}
                      onChange={(event) =>
                        toggleSelectAllEntries(event.target.checked)
                      }
                      aria-label="Select all committed score history entries"
                    />
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Player
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Seq
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Score Date
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Course Name
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Score
                  </th>
                  <th style={committedHeaderCellStyle}>
                    CR
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Slope
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Diff
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Holes
                  </th>
                  <th style={committedHeaderCellStyle}>
                    Include
                  </th>
                  <th style={committedHeaderCellStyle}></th>
                </tr>
              </thead>
              <tbody>
                {groupedEntries.map((group) => {
                  const collapsed = collapsedPlayerIds.includes(group.playerId);
                  const groupEntryIds = group.entries.map(
                    (entry) => entry.scoreHistoryEntryId,
                  );
                  const selectedInGroup = groupEntryIds.filter((id) =>
                    selectedEntryIds.includes(id),
                  ).length;
                  const allGroupEntriesSelected =
                    groupEntryIds.length > 0 &&
                    selectedInGroup === groupEntryIds.length;

                  return (
                    <Fragment key={`group-${group.playerId}`}>
                      <tr>
                        <td
                          style={{
                            ...tdStyle,
                            background: "#f3f6f9",
                            borderTop: "2px solid #cfd8e3",
                            textAlign: "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allGroupEntriesSelected}
                            onChange={(event) =>
                              togglePlayerSelected(
                                group.entries,
                                event.target.checked,
                              )
                            }
                            aria-label={`Select all score history entries for ${group.playerName}`}
                          />
                        </td>
                        <td
                          colSpan={11}
                          style={{
                            ...tdStyle,
                            background: "#f3f6f9",
                            borderTop: "2px solid #cfd8e3",
                            fontWeight: 700,
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              padding: "2px 8px",
                              marginRight: "10px",
                            }}
                            onClick={() => togglePlayerCollapsed(group.playerId)}
                          >
                            {collapsed ? "+" : "−"}
                          </button>
                          {group.playerName} · {group.entries.length} score
                          {group.entries.length === 1 ? "" : "s"}
                          {selectedInGroup > 0 && (
                            <span
                              style={{
                                marginLeft: "10px",
                                color: "#555",
                                fontWeight: 500,
                              }}
                            >
                              {selectedInGroup} selected
                            </span>
                          )}
                        </td>
                      </tr>

                      {!collapsed &&
                        group.entries.map((entry) => {
                          const isEditing =
                            editingEntryId === entry.scoreHistoryEntryId &&
                            editRow;
                          if (isEditing && editRow) {
                            return (
                              <tr key={entry.scoreHistoryEntryId}>
                                <td style={{ ...tdStyle, textAlign: "center" }}></td>
                                <td style={tdStyle}>
                                  {playerSelect(editRow.playerId, (value) =>
                                    updateEditRow("playerId", value),
                                  )}
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    type="number"
                                    style={{ ...gridInputStyle, width: "52px" }}
                                    value={editRow.postingOrder}
                                    onChange={(event) =>
                                      updateEditRow(
                                        "postingOrder",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    style={{ ...gridInputStyle, width: "76px" }}
                                    value={editRow.scoreDate}
                                    onChange={(event) =>
                                      updateEditRow("scoreDate", event.target.value)
                                    }
                                    placeholder="MM/YY"
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    style={{ ...gridInputStyle, width: "150px" }}
                                    value={editRow.courseName}
                                    onChange={(event) =>
                                      updateEditRow("courseName", event.target.value)
                                    }
                                    placeholder="Optional"
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    type="number"
                                    style={{ ...gridInputStyle, width: "62px" }}
                                    value={editRow.score}
                                    onChange={(event) =>
                                      updateEditRow("score", event.target.value)
                                    }
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    style={{ ...gridInputStyle, width: "62px" }}
                                    value={editRow.courseRating}
                                    onChange={(event) =>
                                      updateEditRow(
                                        "courseRating",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    type="number"
                                    style={{ ...gridInputStyle, width: "58px" }}
                                    value={editRow.slope}
                                    onChange={(event) =>
                                      updateEditRow("slope", event.target.value)
                                    }
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    style={{ ...gridInputStyle, width: "62px" }}
                                    value={editRow.differential}
                                    onChange={(event) =>
                                      updateEditRow(
                                        "differential",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Auto"
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <select
                                    style={{ ...gridSelectStyle, width: "64px" }}
                                    value={editRow.holesPlayed}
                                    onChange={(event) =>
                                      updateEditRow(
                                        "holesPlayed",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="18">18</option>
                                    <option value="9">9</option>
                                  </select>
                                </td>
                                <td style={tdStyle}>
                                  <input
                                    type="checkbox"
                                    checked={editRow.includedInMyrtleCalc}
                                    onChange={(event) =>
                                      updateEditRow(
                                        "includedInMyrtleCalc",
                                        event.target.checked,
                                      )
                                    }
                                  />
                                </td>
                                <td style={tdStyle}>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      type="button"
                                      style={primaryButtonStyle}
                                      disabled={saving}
                                      onClick={() =>
                                        void handleSaveEdit(
                                          entry.scoreHistoryEntryId,
                                        )
                                      }
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      style={buttonStyle}
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={entry.scoreHistoryEntryId}>
                              <td style={{ ...tdStyle, textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedEntryIds.includes(
                                    entry.scoreHistoryEntryId,
                                  )}
                                  onChange={() =>
                                    toggleSelectedEntry(
                                      entry.scoreHistoryEntryId,
                                    )
                                  }
                                  aria-label={`Select score history entry for ${entry.playerName}`}
                                />
                              </td>
                              <td style={tdStyle}>{entry.playerName}</td>
                              <td style={tdStyle}>{entry.postingOrder ?? "—"}</td>
                              <td style={tdStyle}>
                                {formatScoreMonthYear(entry.scoreDate)}
                              </td>
                              <td style={tdStyle}>{entry.courseName || "—"}</td>
                              <td style={tdStyle}>
                                {entry.adjustedGrossScore ?? entry.grossScore}
                              </td>
                              <td style={tdStyle}>
                                {formatNumber(entry.courseRating, 1)}
                              </td>
                              <td style={tdStyle}>{entry.slope}</td>
                              <td style={tdStyle}>
                                {formatNumber(entry.differential, 1)}
                              </td>
                              <td style={tdStyle}>{entry.holesPlayed}</td>
                              <td style={tdStyle}>
                                {entry.includedInMyrtleCalc === false
                                  ? "No"
                                  : "Yes"}
                              </td>
                              <td style={tdStyle}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    style={buttonStyle}
                                    onClick={() => startEdit(entry)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    style={dangerButtonStyle}
                                    onClick={() => void handleDelete(entry)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
