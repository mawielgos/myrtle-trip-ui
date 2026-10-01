import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPlannedRounds,
  getTrip,
  getTripPlayers,
  getTripRounds,
  initializeTrip,
} from "../api/tripApi";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import type {
  TripDetail,
  TripPlannedRound,
  TripPlayer,
  TripRoundListItem,
} from "../types/trip";

function formatRoundDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getRoundStatus(round: TripRoundListItem): string {
  if (round.finalized) {
    return "Finalized";
  }

  if (round.needsTeams) {
    return "Needs Teams";
  }

  if (round.readyForScoring) {
    return "Ready for Scoring";
  }

  return "In Progress";
}

function getPrimaryRoundAction(round: TripRoundListItem): {
  label: string;
  path: string;
} {
  if (round.finalized) {
    return {
      label: "View Results",
      path: `/rounds/${round.roundId}/results`,
    };
  }

  return {
    label: "Open Round",
    path: `/rounds/${round.roundId}/open`,
  };
}

function formatPlannedRoundFormat(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0) + part.substring(1).toLowerCase())
    .join(" ");
}

export default function TripDetailPage() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [plannedRounds, setPlannedRounds] = useState<TripPlannedRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid trip id");
      setLoading(false);
      return;
    }

    void loadTripPage(numericTripId);
  }, [numericTripId]);

  async function loadTripPage(id: number): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const [tripData, playerData, roundData, plannedRoundData] = await Promise.all([
        getTrip(id),
        getTripPlayers(id),
        getTripRounds(id),
        getPlannedRounds(id),
      ]);

      setTrip(tripData);
      setPlayers(playerData);
      setRounds(roundData);
      setPlannedRounds(plannedRoundData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }

  async function handleInitializeTrip(): Promise<void> {
    if (!trip) {
      return;
    }

    try {
      setInitializing(true);
      setError(null);
      setMessage(null);

      await initializeTrip(trip.tripId);
      setMessage("Trip initialized.");
      await loadTripPage(trip.tripId);
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data;

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Failed to initialize trip."
      );
    } finally {
      setInitializing(false);
    }
  }

  function handleBackToTrips(): void {
    navigate("/trips");
  }

  function handlePlanRounds(): void {
    if (!trip) {
      return;
    }

    navigate(`/trips/${trip.tripId}/planned-rounds`);
  }

  function handleOpenPlannedRound(roundNumber?: number | null): void {
    if (!trip) {
      return;
    }

    if (roundNumber == null) {
      navigate(`/trips/${trip.tripId}/planned-rounds`);
      return;
    }

    navigate(`/trips/${trip.tripId}/planned-rounds?round=${roundNumber}`);
  }

  function handleEditTrip(): void {
    if (!trip) {
      return;
    }

    navigate(`/trips/${trip.tripId}/edit`);
  }

  function handleAddRound(): void {
    if (!trip) {
      return;
    }

    navigate(`/trips/${trip.tripId}/rounds/new`);
  }

  if (loading) {
    return <div style={{ padding: "16px" }}>Loading trip...</div>;
  }

  if (error) {
    return (
      <div style={pageContainerMediumStyle}>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={pageContainerMediumStyle}>
        <div style={sectionStyle}>Trip not found.</div>
      </div>
    );
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div style={{ marginBottom: "16px" }}>
        <button style={buttonStyle} onClick={handleBackToTrips}>
          Back to Trips
        </button>
      </div>

      {message ? <div style={successBoxStyle}>{message}</div> : null}

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 12px 0" }}>{trip.tripName}</h1>

        <div style={sectionStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                Code
              </div>
              <div style={{ fontWeight: 600 }}>{trip.tripCode}</div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                Year
              </div>
              <div style={{ fontWeight: 600 }}>{trip.tripYear}</div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                Trip ID
              </div>
              <div style={{ fontWeight: 600 }}>{trip.tripId}</div>
            </div>
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button style={buttonStyle} type="button" onClick={handleEditTrip}>
              Edit Trip / Roster
            </button>

            <button
              style={primaryButtonStyle}
              type="button"
              onClick={handleInitializeTrip}
              disabled={initializing || Boolean(trip.initialized)}
            >
              {trip.initialized
                ? "Trip Initialized"
                : initializing
                ? "Initializing..."
                : "Initialize Trip"}
            </button>
          </div>
        </div>
      </div>

      <section style={{ marginBottom: "20px" }}>
        <h2 style={{ marginTop: 0 }}>Players ({players.length})</h2>

        <div style={sectionStyle}>
          {players.length === 0 ? (
            <div>No players found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>Handicap Index</th>
                  <th style={thStyle}>Active</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.playerId}>
                    <td style={tdStyle}>{player.displayName}</td>
                    <td style={tdStyle}>{player.handicapIndex ?? ""}</td>
                    <td style={tdStyle}>
                      {player.active == null ? "" : player.active ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section style={{ marginBottom: "20px" }}>
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
          <h2 style={{ margin: 0 }}>Planned Rounds</h2>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button style={buttonStyle} type="button" onClick={handlePlanRounds}>
              Plan Rounds
            </button>
          </div>
        </div>

        <div style={sectionStyle}>
          {plannedRounds.length === 0 ? (
            <div>No planned rounds found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Standard Tee</th>
                  <th style={thStyle}>Alternate Tee</th>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {plannedRounds.map((round) => (
                  <tr key={round.plannedRoundId}>
                    <td style={tdStyle}>{round.roundNumber}</td>
                    <td style={tdStyle}>{formatRoundDate(round.roundDate)}</td>
                    <td style={tdStyle}>{round.courseName ?? ""}</td>
                    <td style={tdStyle}>{round.standardTeeDisplay ?? ""}</td>
                    <td style={tdStyle}>{round.alternateTeeDisplay ?? ""}</td>
                    <td style={tdStyle}>{formatPlannedRoundFormat(round.format)}</td>
                    <td style={tdStyle}>
                      <button
                        style={buttonStyle}
                        type="button"
                        onClick={() => handleOpenPlannedRound(round.roundNumber)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
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
          <h2 style={{ margin: 0 }}>Rounds</h2>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button style={buttonStyle} type="button" onClick={handleAddRound}>
              Add Round
            </button>
          </div>
        </div>

        <div style={sectionStyle}>
          {rounds.length === 0 ? (
            <div>No rounds found. Initialize the trip after planning the rounds.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Tee</th>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => {
                  const action = getPrimaryRoundAction(round);

                  return (
                    <tr key={round.roundId}>
                      <td style={tdStyle}>{round.roundNumber ?? ""}</td>
                      <td style={tdStyle}>{formatRoundDate(round.roundDate)}</td>
                      <td style={tdStyle}>{round.courseName ?? ""}</td>
                      <td style={tdStyle}>{round.teeName ?? ""}</td>
                      <td style={tdStyle}>{round.gameFormat ?? ""}</td>
                      <td style={tdStyle}>{getRoundStatus(round)}</td>
                      <td style={tdStyle}>
                        <button
                          style={buttonStyle}
                          type="button"
                          onClick={() => navigate(action.path)}
                        >
                          {action.label}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}