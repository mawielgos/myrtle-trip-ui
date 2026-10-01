import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import type { TripDetail, TripPlayer } from "../../types/trip";
import {
  buttonStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../../styles/uiStyles";
import {
  formatCurrency,
  formatStatusLabel,
  getStatusBadgeStyle,
  type TripPanelAction,
} from "./tripDetailUtils";

interface TripDetailHeaderProps {
  trip: TripDetail;
  players: TripPlayer[];
  plannedRoundCount: number;
  currentRoundAction: TripPanelAction | null;
  canShowLoadGhinButton: boolean;
  canShowStartTripButton: boolean;
  initializingGhin: boolean;
  startingTrip: boolean;
  onInitializeGhin: () => void;
  onStartTrip: () => void;
  onNavigate: (path: string) => void;
}

const metadataGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "8px 16px",
  fontSize: "14px",
  color: "#444",
};

export default function TripDetailHeader({
  trip,
  players,
  plannedRoundCount,
  currentRoundAction,
  canShowLoadGhinButton,
  canShowStartTripButton,
  initializingGhin,
  startingTrip,
  onInitializeGhin,
  onStartTrip,
  onNavigate,
}: TripDetailHeaderProps) {
  return (
    <div
      style={{
        ...sectionStyle,
        marginBottom: "16px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: "260px", flex: "1 1 420px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "8px",
            }}
          >
            <h1 style={{ margin: 0 }}>{trip.tripName}</h1>
            <span style={getStatusBadgeStyle(trip.status)}>
              {formatStatusLabel(trip.status)}
            </span>
          </div>

          <div style={metadataGridStyle}>
            <div>
              Code: <strong>{trip.tripCode}</strong>
            </div>
            <div>
              Year: <strong>{trip.tripYear}</strong>
            </div>
            <div>
              Entry Fee: <strong>{formatCurrency(trip.entryFee)}</strong>
            </div>
            <div>
              Players: <strong>{players.length}</strong>
            </div>
            <div>
              Planned Rounds: <strong>{plannedRoundCount}</strong>
            </div>
            <div>
              Event ID: <strong>{trip.tripId}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            flex: "1 1 320px",
          }}
        >
          <Link to="/trips">
            <button type="button" style={buttonStyle}>
              Events
            </button>
          </Link>

          {trip.status !== "IN_PROGRESS" && trip.status !== "COMPLETE" ? (
            <Link to={`/trips/${trip.tripId}/edit`}>
              <button type="button" style={buttonStyle}>
                Edit Event
              </button>
            </Link>
          ) : null}

          {currentRoundAction ? (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => onNavigate(currentRoundAction.path)}
            >
              {currentRoundAction.label}
            </button>
          ) : null}

          {canShowLoadGhinButton ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={onInitializeGhin}
              disabled={initializingGhin}
            >
              {initializingGhin ? "Loading GHIN..." : "Load GHIN Baseline"}
            </button>
          ) : null}

          {canShowStartTripButton ? (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={onStartTrip}
              disabled={startingTrip}
            >
              {startingTrip ? "Starting Event..." : "Start Event"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
