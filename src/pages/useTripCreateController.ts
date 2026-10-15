import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayers } from "../api/playerApi";
import { getTrip, getTripPlayers, saveTripSetup } from "../api/tripApi";
import type { PlayerListItem } from "../types/player";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { buildTripCode, normalizeTripHandicapMethod, sortPlayers, validateTripSetup } from "./tripCreateLogic";

function currentYear(): number {
  return new Date().getFullYear();
}

export function useTripCreateController() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const numericTripId = tripId ? Number(tripId) : null;
  const isEditMode = numericTripId != null && !Number.isNaN(numericTripId);

  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tripName, setTripName] = useState("");
  const [tripYear, setTripYear] = useState(String(currentYear()));
  const [tripCode, setTripCode] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [plannedRoundCount, setPlannedRoundCount] = useState("1");
  const [handicapsEnabled, setHandicapsEnabled] = useState(true);
  const [handicapMethod, setHandicapMethod] = useState("GHIN_PLUS_DB_SCORE_HISTORY");
  const [frozenIndexes, setFrozenIndexes] = useState<Record<number, string>>({});
  const [scoreDataByPlayerId, setScoreDataByPlayerId] = useState<Record<number, { ghinHistoryCount: number; dbScoreHistoryCount: number; tripScoreCount: number; usableHandicapIndex: boolean }>>({});
  const [initialized, setInitialized] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPage();
  }, [tripId]);

  const filteredPlayers = useMemo(() => {
    const sorted = sortPlayers(players.filter((player) => player.active === true));
    const search = playerSearch.trim().toLowerCase();

    if (!search) {
      return sorted;
    }

    return sorted.filter((player) =>
      player.displayName.toLowerCase().includes(search)
    );
  }, [players, playerSearch]);


  const comparableSnapshot = useMemo(() => {
    return JSON.stringify({
      tripName: tripName.trim(),
      tripYear: tripYear.trim(),
      tripCode: tripCode.trim(),
      entryFee: entryFee.trim(),
      tripStartDate,
      tripEndDate,
      plannedRoundCount: plannedRoundCount.trim(),
      handicapsEnabled,
      handicapMethod,
      frozenIndexes,
      selectedPlayerIds: [...selectedPlayerIds].sort((a, b) => a - b),
    });
  }, [entryFee, frozenIndexes, handicapsEnabled, handicapMethod, plannedRoundCount, selectedPlayerIds, tripCode, tripEndDate, tripName, tripStartDate, tripYear]);

  const usesFrozenGhinIndex = handicapsEnabled && handicapMethod === "FROZEN_GHIN_INDEX";

  const hasChanges =
    !loading &&
    initialSnapshot.length > 0 &&
    comparableSnapshot !== initialSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }

  const activePlayers = useMemo(
    () => players.filter((player) => player.active === true),
    [players]
  );

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const playerPromise = getPlayers();

      if (isEditMode && numericTripId != null) {
        const [playerData, tripData, tripPlayerData] = await Promise.all([
          playerPromise,
          getTrip(numericTripId),
          getTripPlayers(numericTripId),
        ]);

        setPlayers(playerData);
        const activePlayerIds = new Set(
          playerData
            .filter((player) => player.active === true)
            .map((player) => player.playerId)
        );
        setTripName(tripData.tripName ?? "");
        setTripYear(tripData.tripYear != null ? String(tripData.tripYear) : "");
        setTripCode(tripData.tripCode ?? "");
        setEntryFee(
          tripData.entryFee == null || Number.isNaN(tripData.entryFee)
            ? ""
            : String(tripData.entryFee)
        );
        setTripStartDate(tripData.tripStartDate ?? "");
        setTripEndDate(tripData.tripEndDate ?? "");
        setPlannedRoundCount(String(tripData.plannedRoundCount ?? 1));
        setHandicapsEnabled(tripData.handicapsEnabled !== false);
        setHandicapMethod(normalizeTripHandicapMethod(tripData.handicapMethod));
        setInitialized(Boolean(tripData.initialized));
        const loadedPlayerIds = tripPlayerData
          .filter((player) => activePlayerIds.has(player.playerId))
          .map((player) => player.playerId);
        const loadedFrozenIndexes: Record<number, string> = {};
        tripPlayerData
          .filter((player) => activePlayerIds.has(player.playerId))
          .forEach((player) => {
            loadedFrozenIndexes[player.playerId] =
              player.frozenHandicapIndex == null ? "" : String(player.frozenHandicapIndex);
          });
        const loadedScoreData: Record<number, { ghinHistoryCount: number; dbScoreHistoryCount: number; tripScoreCount: number; usableHandicapIndex: boolean }> = {};
        tripPlayerData
          .filter((player) => activePlayerIds.has(player.playerId))
          .forEach((player) => {
            loadedScoreData[player.playerId] = {
              ghinHistoryCount: player.ghinHistoryCount ?? 0,
              dbScoreHistoryCount: player.dbScoreHistoryCount ?? 0,
              tripScoreCount: player.tripScoreCount ?? 0,
              usableHandicapIndex: player.usableHandicapIndex === true,
            };
          });
        setFrozenIndexes(loadedFrozenIndexes);
        setScoreDataByPlayerId(loadedScoreData);
        setSelectedPlayerIds(loadedPlayerIds);
        setInitialSnapshot(JSON.stringify({
          tripName: tripData.tripName ?? "",
          tripYear: tripData.tripYear != null ? String(tripData.tripYear) : "",
          tripCode: tripData.tripCode ?? "",
          entryFee:
            tripData.entryFee == null || Number.isNaN(tripData.entryFee)
              ? ""
              : String(tripData.entryFee),
          tripStartDate: tripData.tripStartDate ?? "",
          tripEndDate: tripData.tripEndDate ?? "",
          plannedRoundCount: String(tripData.plannedRoundCount ?? 1),
          handicapsEnabled: tripData.handicapsEnabled !== false,
          handicapMethod: normalizeTripHandicapMethod(tripData.handicapMethod),
          frozenIndexes: loadedFrozenIndexes,
          selectedPlayerIds: [...loadedPlayerIds].sort((a, b) => a - b),
        }));
      } else {
        const playerData = await playerPromise;
        setPlayers(playerData);
        setHandicapsEnabled(true);
        setHandicapMethod("GHIN_PLUS_DB_SCORE_HISTORY");
        setTripStartDate("");
        setTripEndDate("");
        setPlannedRoundCount("1");
        setFrozenIndexes({});
        setScoreDataByPlayerId({});
        setInitialized(false);
        setInitialSnapshot(JSON.stringify({
          tripName: "",
          tripYear: String(currentYear()),
          tripCode: "",
          entryFee: "",
          tripStartDate: "",
          tripEndDate: "",
          plannedRoundCount: "1",
          handicapsEnabled: true,
          handicapMethod: "GHIN_PLUS_DB_SCORE_HISTORY",
          frozenIndexes: {},
          selectedPlayerIds: [],
        }));
      }
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to load event setup."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack(): void {
    if (isEditMode && numericTripId != null) {
      navigateIfConfirmed(`/trips/${numericTripId}`);
      return;
    }

    navigateIfConfirmed("/trips");
  }

  function togglePlayer(playerId: number): void {
    setSelectedPlayerIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      setFrozenIndexes((existing) => ({
        ...existing,
        [playerId]: existing[playerId] ?? "",
      }));
      return [...current, playerId];
    });
  }

  function handleAutoCode(): void {
    setTripCode(buildTripCode(tripName, tripYear));
  }

  function handleSelectAllActive(): void {
    setSelectedPlayerIds(activePlayers.map((player) => player.playerId));
  }

  function handleClearPlayers(): void {
    setSelectedPlayerIds([]);
  }

  async function handleSave(): Promise<void> {
    const validationError = validateTripSetup({
      tripName, tripYear, tripCode, entryFee, tripStartDate, tripEndDate,
      plannedRoundCount, handicapsEnabled, handicapMethod, selectedPlayerIds, frozenIndexes,
    });
    if (validationError) {
      setError(validationError);
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedTripId = await saveTripSetup({
        tripId: isEditMode ? numericTripId : null,
        name: tripName.trim(),
        tripYear: Number(tripYear),
        tripCode: tripCode.trim(),
        entryFee: entryFee.trim() ? Number(entryFee) : null,
        tripStartDate,
        tripEndDate,
        plannedRoundCount: Number(plannedRoundCount),
        handicapsEnabled,
        handicapMethod,
        playerIds: selectedPlayerIds,
        frozenHandicapIndexesByPlayerId: Object.fromEntries(
          selectedPlayerIds.map((playerId) => [
            playerId,
            frozenIndexes[playerId]?.trim()
              ? Number(frozenIndexes[playerId])
              : null,
          ])
        ),
      });

      setMessage(isEditMode ? "Event updated." : "Event saved.");

      if (isEditMode) {
        setInitialSnapshot(comparableSnapshot);
        navigate(`/trips/${savedTripId}`);
        return;
      }

      setInitialSnapshot(comparableSnapshot);
      navigate(`/trips/${savedTripId}`);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string" ? apiMessage : "Failed to save event."
      );
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  return {
    isEditMode,
    numericTripId,
    saving,
    initialized,
    error,
    message,
    confirmIfNeeded,
    handleBack,
    handleSave,
    tripName,
    setTripName,
    tripYear,
    setTripYear,
    tripCode,
    setTripCode,
    entryFee,
    setEntryFee,
    tripStartDate,
    setTripStartDate,
    tripEndDate,
    setTripEndDate,
    plannedRoundCount,
    setPlannedRoundCount,
    handicapsEnabled,
    setHandicapsEnabled,
    handicapMethod,
    setHandicapMethod,
    usesFrozenGhinIndex,
    handleAutoCode,
    handleSelectAllActive,
    handleClearPlayers,
    loading,
    playerSearch,
    setPlayerSearch,
    selectedPlayerIds,
    filteredPlayers,
    togglePlayer,
    scoreDataByPlayerId,
    frozenIndexes,
    setFrozenIndexes,
  };
}
