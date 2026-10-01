import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getTripDetail,
  getTripPlayers,
  getTripRounds,
} from "../api/tripApi";
import TripRosterPanel from "../components/trip/TripRosterPanel";
import PageHeader from "../components/common/PageHeader";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  sectionStyle,
} from "../styles/uiStyles";
import type { TripDetail, TripPlayer, TripRoundListItem } from "../types/trip";

function readApiError(err: any, fallback: string): string {
  const apiMessage =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null);

  return typeof apiMessage === "string" ? apiMessage : fallback;
}

export default function TripPlayerMaintenancePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const parsedTripId = Number(tripId);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(): Promise<void> {
    if (!Number.isFinite(parsedTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tripResponse, playersResponse, roundsResponse] = await Promise.all([
        getTripDetail(parsedTripId),
        getTripPlayers(parsedTripId),
        getTripRounds(parsedTripId),
      ]);

      setTrip(tripResponse);
      setPlayers(playersResponse);
      setRounds(roundsResponse);
    } catch (err: any) {
      console.error("Failed to load event player maintenance", err);
      setError(readApiError(err, "Unable to load event player maintenance."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedTripId]);

  const activePlayers = useMemo(() => {
    return players.filter(
      (player) => player.active !== false && (player.participationStatus ?? "ACTIVE") === "ACTIVE"
    );
  }, [players]);

  const finalizedRoundCount = useMemo(() => {
    return rounds.filter((round) => round.finalized === true).length;
  }, [rounds]);

  const allCreatedRoundsFinalized = rounds.length > 0 && finalizedRoundCount === rounds.length;
  const playerStatusLocked =
    (trip?.status === "COMPLETE" && trip?.correctionMode !== true) || allCreatedRoundsFinalized;
  const playerStatusLockReason = allCreatedRoundsFinalized
    ? "Event player status is locked because all created rounds are finalized. Use round corrections for finalized-round changes."
    : "Event player status is locked because this event is complete.";

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading event player maintenance...</div>;
  }

  if (error || !trip) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Event not found."}</div>
        <button type="button" style={buttonStyle} onClick={() => navigate(`/trips/${parsedTripId}`)}>
          Event Detail
        </button>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Event Player Maintenance"
        subtitle={`${trip.tripName} · ${activePlayers.length} active / ${players.length} total`}
        actions={
          <button type="button" style={buttonStyle} onClick={() => navigate(`/trips/${trip.tripId}`)}>
            Event Detail
          </button>
        }
      />

      <div style={{ ...sectionStyle, marginBottom: "16px" }}>
        <div style={{ color: "#555", fontSize: "14px", lineHeight: 1.45 }}>
          Use this page for event-level player maintenance after import: frozen index updates,
          withdrawals, no-shows, and reactivating a player before rounds are finalized.
        </div>
      </div>

      <TripRosterPanel
        tripId={trip.tripId}
        players={players}
        activePlayers={activePlayers}
        unresolvedGhinFixCount={trip.unresolvedGhinFixCount ?? 0}
        tripLocked={trip.status === "COMPLETE" && trip.correctionMode !== true}
        handicapsEnabled={trip.handicapsEnabled}
        handicapMethod={trip.handicapMethod}
        onNavigate={(path) => navigate(path)}
        onPlayerHandicapSaved={() => void loadPage()}
        onPlayersUpdated={(updatedPlayers) => setPlayers(updatedPlayers)}
        participationLocked={playerStatusLocked}
        participationLockReason={playerStatusLockReason}
        showPlayerMaintenanceButton={false}
      />
    </div>
  );
}
