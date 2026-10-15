import { useNavigate, useParams } from "react-router-dom";
import TripRosterPanel from "../components/trip/TripRosterPanel";
import PageHeader from "../components/common/PageHeader";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  sectionStyle,
} from "../styles/uiStyles";
import { useTripPlayerMaintenanceController } from "./useTripPlayerMaintenanceController";

export default function TripPlayerMaintenancePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const parsedTripId = Number(tripId);
  const {
    trip,
    players,
    activePlayers,
    loading,
    error,
    playerStatusLocked,
    playerStatusLockReason,
    loadPage,
    setPlayers,
  } = useTripPlayerMaintenanceController(parsedTripId);

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
