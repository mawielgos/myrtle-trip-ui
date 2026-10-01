import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayers } from "../api/playerApi";
import { getTrip, getTripPlayers, saveTripSetup } from "../api/tripApi";
import type { PlayerListItem } from "../types/player";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  labelStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";

function currentYear(): number {
  return new Date().getFullYear();
}

function buildTripCode(name: string, year: string): string {
  const cleanName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const cleanYear = year.trim();

  if (!cleanName && !cleanYear) {
    return "";
  }

  if (!cleanName) {
    return cleanYear;
  }

  if (!cleanYear) {
    return cleanName;
  }

  return `${cleanName}_${cleanYear}`;
}

function sortPlayers(players: PlayerListItem[]): PlayerListItem[] {
  return [...players].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    })
  );
}

function normalizeTripHandicapMethod(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "FROZEN_GHIN_INDEX") {
    return "FROZEN_GHIN_INDEX";
  }

  if (normalized === "GHIN_HISTORY" || normalized === "GHIN") {
    return "GHIN_HISTORY";
  }

  if (
    normalized === "GHIN_PLUS_DB_SCORE_HISTORY" ||
    normalized === "DB_SCORE_HISTORY" ||
    normalized === "MYRTLE_BEACH"
  ) {
    return "GHIN_PLUS_DB_SCORE_HISTORY";
  }

  return "GHIN_PLUS_DB_SCORE_HISTORY";
}

export default function TripCreatePage() {
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

  function validate(): string | null {
    if (!tripName.trim()) {
      return "Event name is required.";
    }

    if (!tripYear.trim()) {
      return "Event year is required.";
    }

    const numericYear = Number(tripYear);
    if (!Number.isInteger(numericYear)) {
      return "Event year must be a whole number.";
    }

    if (!tripCode.trim()) {
      return "Event code is required.";
    }

    if (entryFee.trim()) {
      const numericEntryFee = Number(entryFee);
      if (!Number.isInteger(numericEntryFee) || numericEntryFee < 0) {
        return "Entry fee must be a whole number 0 or greater.";
      }
    }

    if (!tripStartDate) {
      return "Event start date is required.";
    }

    if (!tripEndDate) {
      return "Event end date is required.";
    }

    if (tripEndDate < tripStartDate) {
      return "Event end date cannot be before event start date.";
    }

    const numericPlannedRoundCount = Number(plannedRoundCount);
    if (!Number.isInteger(numericPlannedRoundCount) || numericPlannedRoundCount < 1 || numericPlannedRoundCount > 12) {
      return "Number of rounds must be a whole number between 1 and 12.";
    }

    if (handicapsEnabled && handicapMethod === "FROZEN_GHIN_INDEX") {
      for (const playerId of selectedPlayerIds) {
        const rawIndex = frozenIndexes[playerId]?.trim() ?? "";
        if (!rawIndex) {
          return "Frozen GHIN Index is required for every selected player.";
        }

        const numericIndex = Number(rawIndex);
        if (!Number.isFinite(numericIndex) || numericIndex < -10 || numericIndex > 54) {
          return "Frozen GHIN Index must be a number between -10.0 and 54.0.";
        }
      }
    }

    return null;
  }

  async function handleSave(): Promise<void> {
    const validationError = validate();
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

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title={isEditMode ? "Edit Event" : "Create Event"}
        actions={
          <>
            {isEditMode && numericTripId != null ? (
              <TripDetailButton tripId={numericTripId} onBeforeNavigate={confirmIfNeeded} />
            ) : (
              <button style={buttonStyle} onClick={handleBack} type="button">
                Events
              </button>
            )}
            <button
              style={primaryButtonStyle}
              type="button"
              onClick={handleSave}
              disabled={saving || initialized}
            >
              {saving ? "Saving..." : isEditMode ? "Save Event Changes" : "Save Event"}
            </button>
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      <div style={warningBoxStyle}>
        {initialized
          ? "This event is already initialized, so roster changes should be blocked."
          : "Create the event shell first. You can add or import players afterward from Event Detail before starting the event."}
      </div>

      <div style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label style={labelStyle} htmlFor="tripName">
            Event Name
            <input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripYear">
            Event Year
            <input
              id="tripYear"
              type="number"
              value={tripYear}
              onChange={(e) => setTripYear(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripCode">
            Event Code
            <input
              id="tripCode"
              type="text"
              value={tripCode}
              onChange={(e) => setTripCode(e.target.value.toUpperCase())}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="entryFee">
            Entry Fee
            <input
              id="entryFee"
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripStartDate">
            Event Start Date
            <input
              id="tripStartDate"
              type="date"
              value={tripStartDate}
              onChange={(e) => setTripStartDate(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="tripEndDate">
            Event End Date
            <input
              id="tripEndDate"
              type="date"
              value={tripEndDate}
              onChange={(e) => setTripEndDate(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label style={labelStyle} htmlFor="plannedRoundCount">
            Number of Rounds
            <input
              id="plannedRoundCount"
              type="number"
              min={1}
              max={12}
              step={1}
              value={plannedRoundCount}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  setPlannedRoundCount(e.target.value);
                }
              }}
              onBlur={() => {
                const parsed = Number(plannedRoundCount);
                if (!Number.isInteger(parsed) || parsed < 1) {
                  setPlannedRoundCount("1");
                } else if (parsed > 12) {
                  setPlannedRoundCount("12");
                }
              }}
              style={formInputStyle}
              disabled={saving || initialized}
            />
          </label>

          <label
            style={{
              ...labelStyle,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              paddingBottom: "9px",
            }}
          >
            <input
              type="checkbox"
              checked={!handicapsEnabled}
              onChange={(e) => setHandicapsEnabled(!e.target.checked)}
              disabled={saving || initialized}
            />
            Scratch / no handicaps
          </label>

          <label style={labelStyle} htmlFor="handicapMethod">
            Event Handicap Method
            <select
              id="handicapMethod"
              value={handicapMethod}
              onChange={(e) => setHandicapMethod(e.target.value)}
              style={formInputStyle}
              disabled={saving || initialized || !handicapsEnabled}
            >
              <option value="FROZEN_GHIN_INDEX">Frozen GHIN</option>
              <option value="GHIN_HISTORY">GHIN History</option>
              <option value="GHIN_PLUS_DB_SCORE_HISTORY">GHIN History + DB Score History</option>
            </select>
          </label>
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            border: "1px solid #d8e2ef",
            borderRadius: "8px",
            background: "#f7fbff",
            color: "#36506c",
            fontSize: "13px",
            lineHeight: 1.4,
          }}
        >
          Event dates are used to validate planned round dates. Number of rounds controls the round rows created on the Round Planning page. Players are optional during initial creation and can be added or imported after the event is saved.
          {" "}
          {handicapsEnabled
            ? "This handicap method applies to the entire event. Mixed event policies are not allowed."
            : "Scratch / no handicaps is selected. Everyone will be treated as scratch for event start readiness and scorecard handicap setup."}
          {handicapsEnabled && usesFrozenGhinIndex
            ? " Enter one frozen starting index for each selected player below."
            : handicapsEnabled && handicapMethod === "GHIN_HISTORY"
            ? " Only loaded GHIN history and event scores will be used for every selected player."
            : handicapsEnabled
            ? " Loaded GHIN history, DB score history, and event scores will be used for every selected player."
            : ""}
        </div>

        <div
          style={{
            marginTop: "12px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={buttonStyle}
            type="button"
            onClick={handleAutoCode}
            disabled={saving || initialized}
          >
            Build Event Code
          </button>
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
            marginBottom: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Players</h2>
            <div style={{ marginTop: "4px", color: "#64748b", fontSize: "13px" }}>
              Optional during creation. Add players here manually or save first and import players from Event Detail.
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              style={buttonStyle}
              type="button"
              onClick={handleSelectAllActive}
              disabled={saving || loading || initialized}
            >
              Select All Active
            </button>
            <button
              style={buttonStyle}
              type="button"
              onClick={handleClearPlayers}
              disabled={saving || loading || initialized}
            >
              Clear
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "12px", maxWidth: "320px" }}>
          <label style={labelStyle} htmlFor="playerSearch">
            Search Players
            <input
              id="playerSearch"
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={formInputStyle}
              disabled={saving || loading}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px", fontSize: "14px", color: "#555" }}>
          Selected Players: <strong>{selectedPlayerIds.length}</strong>
        </div>

        {loading ? (
          <div>Loading players...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Select</th>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Score Data</th>
                <th style={thStyle}>Index?</th>
                {usesFrozenGhinIndex ? <th style={thStyle}>Frozen GHIN Index</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr key={player.playerId}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.includes(player.playerId)}
                      onChange={() => togglePlayer(player.playerId)}
                      disabled={saving || initialized}
                    />
                  </td>
                  <td style={tdStyle}>
                    {player.displayName}
                    {player.ghinNumber ? (
                      <span style={{ color: "#64748b", marginLeft: "6px" }}>({player.ghinNumber})</span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>
                    {selectedPlayerIds.includes(player.playerId) ? (
                      <span style={{ fontSize: "12px", color: "#475569" }}>
                        GHIN {scoreDataByPlayerId[player.playerId]?.ghinHistoryCount ?? 0} · DB {scoreDataByPlayerId[player.playerId]?.dbScoreHistoryCount ?? 0} · Event {scoreDataByPlayerId[player.playerId]?.tripScoreCount ?? 0}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {!handicapsEnabled ? (
                      <span style={{ color: "#64748b" }}>Scratch</span>
                    ) : usesFrozenGhinIndex ? (
                      frozenIndexes[player.playerId]?.trim() ? "Yes" : "No"
                    ) : scoreDataByPlayerId[player.playerId]?.usableHandicapIndex ? (
                      "Yes"
                    ) : selectedPlayerIds.includes(player.playerId) ? (
                      <span style={{ color: "#b45309" }}>No</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  {usesFrozenGhinIndex ? (
                    <td style={tdStyle}>
                      {selectedPlayerIds.includes(player.playerId) ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={frozenIndexes[player.playerId] ?? ""}
                          onChange={(e) =>
                            setFrozenIndexes((current) => ({
                              ...current,
                              [player.playerId]: e.target.value,
                            }))
                          }
                          style={{ ...formInputStyle, maxWidth: "100px" }}
                          disabled={saving || initialized}
                        />
                      ) : (
                        ""
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          style={primaryButtonStyle}
          type="button"
          onClick={handleSave}
          disabled={saving || initialized}
        >
          {saving
            ? "Saving..."
            : isEditMode
            ? "Save Event Changes"
            : "Save Event and Continue"}
        </button>
        <button style={buttonStyle} type="button" onClick={handleBack} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}