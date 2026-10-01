import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlayers } from "../api/playerApi";
import { getTrip, getTripPlayers, saveTripSetup } from "../api/tripApi";
import type { PlayerListItem } from "../types/player";
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
  const [initialized, setInitialized] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPage();
  }, [tripId]);

  const filteredPlayers = useMemo(() => {
    const sorted = sortPlayers(players);
    const search = playerSearch.trim().toLowerCase();

    if (!search) {
      return sorted;
    }

    return sorted.filter((player) =>
      player.displayName.toLowerCase().includes(search)
    );
  }, [players, playerSearch]);

  const activePlayers = useMemo(
    () => players.filter((player) => player.active),
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
        setTripName(tripData.tripName ?? "");
        setTripYear(tripData.tripYear != null ? String(tripData.tripYear) : "");
        setTripCode(tripData.tripCode ?? "");
        setEntryFee(
          tripData.entryFee == null || Number.isNaN(tripData.entryFee)
            ? ""
            : String(tripData.entryFee)
        );
        setInitialized(Boolean(tripData.initialized));
        setSelectedPlayerIds(tripPlayerData.map((player) => player.playerId));
      } else {
        const playerData = await playerPromise;
        setPlayers(playerData);
        setInitialized(false);
      }
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to load trip setup."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack(): void {
    if (isEditMode && numericTripId != null) {
      navigate(`/trips/${numericTripId}`);
      return;
    }

    navigate("/trips");
  }

  function togglePlayer(playerId: number): void {
    setSelectedPlayerIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      return [...current, playerId];
    });
  }

  function handleAutoCode(): void {
    setTripCode(buildTripCode(tripName, tripYear));
  }

  function handleSelectAllActive(): void {
    setSelectedPlayerIds(activePlayers.map((player) => player.id));
  }

  function handleClearPlayers(): void {
    setSelectedPlayerIds([]);
  }

  function validate(): string | null {
    if (!tripName.trim()) {
      return "Trip name is required.";
    }

    if (!tripYear.trim()) {
      return "Trip year is required.";
    }

    const numericYear = Number(tripYear);
    if (!Number.isInteger(numericYear)) {
      return "Trip year must be a whole number.";
    }

    if (!tripCode.trim()) {
      return "Trip code is required.";
    }

    if (entryFee.trim()) {
      const numericEntryFee = Number(entryFee);
      if (!Number.isInteger(numericEntryFee) || numericEntryFee < 0) {
        return "Entry fee must be a whole number 0 or greater.";
      }
    }

    if (selectedPlayerIds.length === 0) {
      return "Select at least one player.";
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
        playerIds: selectedPlayerIds,
      });

      setMessage(isEditMode ? "Trip updated." : "Trip saved.");

      if (isEditMode) {
        navigate(`/trips/${savedTripId}`);
        return;
      }

      navigate(`/trips/${savedTripId}/planned-rounds`);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string" ? apiMessage : "Failed to save trip."
      );
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div style={{ marginBottom: "16px" }}>
        <button style={buttonStyle} onClick={handleBack} type="button">
          {isEditMode ? "Back to Trip" : "Back to Trips"}
        </button>
      </div>

      <h1 style={{ marginTop: 0 }}>{isEditMode ? "Edit Trip" : "Create Trip"}</h1>

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      <div style={warningBoxStyle}>
        {initialized
          ? "This trip is already initialized, so roster changes should be blocked."
          : "Save the trip first, then set the 5 planned rounds, then initialize the trip."}
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
            Trip Name
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
            Trip Year
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
            Trip Code
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
            Build Trip Code
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
          <h2 style={{ margin: 0 }}>Players</h2>

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
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr key={player.id}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.includes(player.id)}
                      onChange={() => togglePlayer(player.id)}
                      disabled={saving || initialized}
                    />
                  </td>
                  <td style={tdStyle}>{player.displayName}</td>
                  <td style={tdStyle}>{player.active ? "Yes" : "No"}</td>
                  <td style={tdStyle}>{player.handicapMethod ?? ""}</td>
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
            ? "Save Trip Changes"
            : "Save Trip and Continue"}
        </button>
        <button style={buttonStyle} type="button" onClick={handleBack} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}