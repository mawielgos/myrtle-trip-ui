import type { CSSProperties } from "react";
import TripCurrentRoundPanel from "../components/trip/TripCurrentRoundPanel";
import TripPlannedRoundsPanel from "../components/trip/TripPlannedRoundsPanel";
import TripReadinessPanel from "../components/trip/TripReadinessPanel";
import TripRosterPanel from "../components/trip/TripRosterPanel";
import PlayerImportModal from "../components/trip/PlayerImportModal";
import TripRoundsPanel from "../components/trip/TripRoundsPanel";
import TripStandingsPanel from "../components/trip/TripStandingsPanel";
import PageHeader from "../components/common/PageHeader";
import {
  formatCurrency,
  formatStatusLabel,
  getStatusBadgeStyle,
} from "../components/trip/tripDetailUtils";
import {
  buttonStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  errorBoxStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import {
  hasConfiguredPrizeMoney,
  isTripStarted,
} from "./tripDetailLogic";
import type { PrizeSchedule, TripDetail, TripPlayer, TripTournamentSetup } from "../types/trip";
import type { useTripDetailViewState } from "./useTripDetailViewState";

type TripDetailViewState = ReturnType<typeof useTripDetailViewState>;

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, 0.9fr)",
  gap: "16px",
  alignItems: "start",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "10px",
};

const metricCardStyle: CSSProperties = {
  border: "1px solid #e6e8eb",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#fafafa",
  minWidth: 0,
};

const busyBannerStyle: CSSProperties = {
  ...warningBoxStyle,
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const busyOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(255, 255, 255, 0.08)",
  cursor: "wait",
};

function GhinBaselineBusyBanner() {
  return (
    <div style={busyBannerStyle} role="status" aria-live="polite">
      <span className="ghin-loading-spinner" aria-hidden="true" />
      <div>
        <div style={{ fontWeight: 700 }}>Loading GHIN baseline...</div>
        <div style={{ fontSize: "13px", marginTop: "2px" }}>
          Please wait. Event setup actions are temporarily locked until the GHIN load finishes.
        </div>
      </div>
    </div>
  );
}

function PrizeSetupReminder({
  tripId,
  schedules,
  disabled,
  onNavigate,
}: {
  tripId: number;
  schedules: PrizeSchedule[];
  disabled: boolean;
  onNavigate: (path: string) => void;
}) {
  const prizeSetupConfigured = hasConfiguredPrizeMoney(schedules);

  if (prizeSetupConfigured) {
    return null;
  }

  return (
    <div
      style={{
        ...warningBoxStyle,
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: "3px" }}>
          Prize money has not been set up yet.
        </div>
        <div style={{ fontSize: "13px" }}>
          Set up prize payouts before finalizing rounds so winnings and winner detail are ready.
        </div>
      </div>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => onNavigate(`/trips/${tripId}/prizes`)}
        disabled={disabled}
      >
        Prize Setup
      </button>
    </div>
  );
}

function TripOverviewPanel({
  trip,
  activePlayerCount,
  playerCount,
  plannedRoundCount,
  initializedRoundCount,
  finalizedRoundCount,
  tripDateRange,
  currentRoundAction,
  canShowLoadGhinButton,
  canShowStartTripButton,
  canShowCompleteTripButton,
  canShowResetStartButton,
  initializingGhin,
  startingTrip,
  resettingTripStart,
  completingTrip,
  changingCorrectionMode,
  onInitializeGhin,
  onStartTrip,
  onResetTripStart,
  onCompleteTrip,
  onEnterCorrectionMode,
  onExitCorrectionMode,
  onNavigate,
}: {
  trip: TripDetail;
  activePlayerCount: number;
  playerCount: number;
  plannedRoundCount: number;
  initializedRoundCount: number;
  finalizedRoundCount: number;
  tripDateRange: string;
  currentRoundAction: { label: string; path: string } | null;
  canShowLoadGhinButton: boolean;
  canShowStartTripButton: boolean;
  canShowCompleteTripButton: boolean;
  canShowResetStartButton: boolean;
  initializingGhin: boolean;
  startingTrip: boolean;
  resettingTripStart: boolean;
  completingTrip: boolean;
  changingCorrectionMode: boolean;
  onInitializeGhin: () => void;
  onStartTrip: () => void;
  onResetTripStart: () => void;
  onCompleteTrip: () => void;
  onEnterCorrectionMode: () => void;
  onExitCorrectionMode: () => void;
  onNavigate: (path: string) => void;
}) {
  const pageBusy = initializingGhin;

  return (
    <div style={{ ...sectionStyle, marginBottom: "16px" }}>
      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {trip.tripName}
            <span style={getStatusBadgeStyle(trip.status)}>{formatStatusLabel(trip.status)}</span>
          </span>
        }
        subtitle={tripDateRange}
        actions={
          <>
            <button type="button" style={buttonStyle} onClick={() => onNavigate("/trips")} disabled={pageBusy}>
              Events
            </button>

            {!isTripStarted(trip.status) ? (
              <button type="button" style={buttonStyle} onClick={() => onNavigate(`/trips/${trip.tripId}/edit`)} disabled={pageBusy}>
                Edit Event
              </button>
            ) : null}

            {currentRoundAction ? (
              <button type="button" style={primaryButtonStyle} onClick={() => onNavigate(currentRoundAction.path)} disabled={pageBusy}>
                {currentRoundAction.label}
              </button>
            ) : null}

            {canShowLoadGhinButton ? (
              <button type="button" style={buttonStyle} onClick={onInitializeGhin} disabled={initializingGhin}>
                {initializingGhin ? "Loading GHIN Baseline..." : "Load GHIN Baseline"}
              </button>
            ) : null}

            {canShowStartTripButton ? (
              <button type="button" style={primaryButtonStyle} onClick={onStartTrip} disabled={pageBusy || startingTrip}>
                {startingTrip ? "Starting..." : "Start Event"}
              </button>
            ) : null}

            {canShowResetStartButton ? (
              <button
                type="button"
                style={{ ...buttonStyle, borderColor: "#8a5a00", color: "#8a5a00", background: "#fffaf0" }}
                onClick={onResetTripStart}
                disabled={pageBusy || resettingTripStart}
                title="Return this event to Planning only if no scoring/finalization has happened."
              >
                {resettingTripStart ? "Resetting..." : "Reset Start"}
              </button>
            ) : null}

            {canShowCompleteTripButton ? (
              <button type="button" style={primaryButtonStyle} onClick={onCompleteTrip} disabled={pageBusy || completingTrip}>
                {completingTrip ? "Completing..." : "Complete Event"}
              </button>
            ) : null}
          </>
        }
      />

      {trip.status === "COMPLETE" ? (
        <div
          style={{
            border: trip.correctionMode === true ? "2px solid #b7791f" : "1px solid #ccd4dd",
            background: trip.correctionMode === true ? "#fff8e6" : "#f7f9fb",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, marginBottom: "3px" }}>
              {trip.correctionMode === true ? "⚠ Correction Mode Enabled" : "Event Complete — Locked"}
            </div>
            <div style={{ color: "#555", fontSize: "13px" }}>
              {trip.correctionMode === true
                ? "Score and tee corrections are enabled. Changes may recalculate results, standings, and payouts."
                : "Event data is read-only. Enter correction mode only when a score or tee needs to be fixed."}
            </div>
          </div>

          {trip.correctionMode === true ? (
            <button
              type="button"
              style={{ ...buttonStyle, borderColor: "#8a5a00", color: "#8a5a00", background: "#fff" }}
              onClick={onExitCorrectionMode}
              disabled={pageBusy || changingCorrectionMode}
            >
              {changingCorrectionMode ? "Exiting..." : "Exit Correction Mode"}
            </button>
          ) : (
            <button type="button" style={primaryButtonStyle} onClick={onEnterCorrectionMode} disabled={pageBusy || changingCorrectionMode}>
              {changingCorrectionMode ? "Entering..." : "Enter Correction Mode"}
            </button>
          )}
        </div>
      ) : null}

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>PLAYERS</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{activePlayerCount}</div>
          <div style={{ color: "#666", fontSize: "13px" }}>Active / {playerCount} total</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>ROUNDS</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{finalizedRoundCount} / {initializedRoundCount}</div>
          <div style={{ color: "#666", fontSize: "13px" }}>Finalized / created</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>PLANNED ROUNDS</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{plannedRoundCount}</div>
          <div style={{ color: "#666", fontSize: "13px" }}>Event setup schedule</div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>ENTRY FEE</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{formatCurrency(trip.entryFee)}</div>
          <div style={{ color: "#666", fontSize: "13px" }}>Prize funding basis</div>
        </div>
      </div>
    </div>
  );
}

interface TripDetailBodyProps {
  trip: TripDetail;
  players: TripPlayer[];
  prizeSchedules: PrizeSchedule[];
  tournamentSetup: TripTournamentSetup | null;
  initializingGhin: boolean;
  startingTrip: boolean;
  resettingTripStart: boolean;
  completingTrip: boolean;
  changingCorrectionMode: boolean;
  statusMessage: string | null;
  playerImportOpen: boolean;
  setPlayerImportOpen: (open: boolean) => void;
  handleInitializeGhin: () => Promise<void>;
  handleStartTrip: () => Promise<void>;
  handleResetTripStart: () => Promise<void>;
  handleCompleteTrip: () => Promise<void>;
  handleEnterCorrectionMode: () => Promise<void>;
  handleExitCorrectionMode: () => Promise<void>;
  handlePlayersImported: () => Promise<void>;
  setPlayers: (players: TripPlayer[]) => void;
  loadTripPage: (tripId: number) => Promise<unknown>;
  viewState: TripDetailViewState;
  error: string | null;
  onNavigate: (path: string) => void;
}

export default function TripDetailBody({
  trip,
  players,
  prizeSchedules,
  tournamentSetup,
  initializingGhin,
  startingTrip,
  resettingTripStart,
  completingTrip,
  changingCorrectionMode,
  statusMessage,
  playerImportOpen,
  setPlayerImportOpen,
  handleInitializeGhin,
  handleStartTrip,
  handleResetTripStart,
  handleCompleteTrip,
  handleEnterCorrectionMode,
  handleExitCorrectionMode,
  handlePlayersImported,
  setPlayers,
  loadTripPage,
  viewState,
  error,
  onNavigate,
}: TripDetailBodyProps) {
  const {
    activePlayers,
    sortedPlannedRounds,
    sortedRounds,
    roundsByRoundNumber,
    readiness,
    unresolvedGhinFixCount,
    currentRoundAction,
    currentRoundDetail,
    canShowStartTripButton,
    canShowLoadGhinButton,
    readinessBanner,
    tripDateRange,
    finalizedRoundCount,
    canShowResetStartButton,
    canShowCompleteTripButton,
    eventPlayerStatusLocked,
    eventPlayerStatusLockReason,
    tripStarted,
  } = viewState;

  return (
    <div style={pageContainerWideStyle}>
      {initializingGhin ? <div style={busyOverlayStyle} aria-hidden="true" /> : null}

      <TripOverviewPanel
        trip={trip}
        activePlayerCount={activePlayers.length}
        playerCount={players.length}
        plannedRoundCount={sortedPlannedRounds.length}
        initializedRoundCount={sortedRounds.length}
        finalizedRoundCount={finalizedRoundCount}
        tripDateRange={tripDateRange}
        currentRoundAction={currentRoundAction}
        canShowLoadGhinButton={canShowLoadGhinButton}
        canShowStartTripButton={canShowStartTripButton}
        canShowCompleteTripButton={canShowCompleteTripButton}
        canShowResetStartButton={canShowResetStartButton}
        initializingGhin={initializingGhin}
        startingTrip={startingTrip}
        resettingTripStart={resettingTripStart}
        completingTrip={completingTrip}
        changingCorrectionMode={changingCorrectionMode}
        onInitializeGhin={() => void handleInitializeGhin()}
        onStartTrip={() => void handleStartTrip()}
        onResetTripStart={() => void handleResetTripStart()}
        onCompleteTrip={() => void handleCompleteTrip()}
        onEnterCorrectionMode={() => void handleEnterCorrectionMode()}
        onExitCorrectionMode={() => void handleExitCorrectionMode()}
        onNavigate={onNavigate}
      />

      {initializingGhin ? <GhinBaselineBusyBanner /> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {statusMessage ? <div style={successBoxStyle}>{statusMessage}</div> : null}

      {trip.status !== "COMPLETE" ? (
        <PrizeSetupReminder tripId={trip.tripId} schedules={prizeSchedules} disabled={initializingGhin} onNavigate={onNavigate} />
      ) : null}

      <div
        style={{
          ...dashboardGridStyle,
          opacity: initializingGhin ? 0.58 : 1,
          pointerEvents: initializingGhin ? "none" : "auto",
        }}
        aria-busy={initializingGhin}
      >
        <div style={{ minWidth: 0 }}>
          {!tripStarted ? (
            <>
              <TripReadinessPanel tripStatus={trip.status} readiness={readiness} readinessBanner={readinessBanner} />
              <TripPlannedRoundsPanel
                tripId={trip.tripId}
                tripStatus={trip.status}
                plannedRounds={sortedPlannedRounds}
                roundsByRoundNumber={roundsByRoundNumber}
                onNavigate={onNavigate}
                tournamentSetup={tournamentSetup}
              />
            </>
          ) : null}

          <TripRoundsPanel rounds={sortedRounds} onNavigate={onNavigate} />
          <TripStandingsPanel
            tripId={trip.tripId}
            rounds={sortedRounds}
            plannedRounds={sortedPlannedRounds}
            tripStatus={trip.status}
            onNavigate={onNavigate}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <TripCurrentRoundPanel trip={trip} currentRound={trip.currentRound} currentRoundDetail={currentRoundDetail} onNavigate={onNavigate} />
          <TripRosterPanel
            tripId={trip.tripId}
            players={players}
            activePlayers={activePlayers}
            unresolvedGhinFixCount={unresolvedGhinFixCount}
            tripLocked={trip.status === "COMPLETE" && trip.correctionMode !== true}
            handicapsEnabled={trip.handicapsEnabled}
            handicapMethod={trip.handicapMethod}
            onNavigate={onNavigate}
            onImportPlayers={() => {
              if (!initializingGhin) {
                setPlayerImportOpen(true);
              }
            }}
            onPlayerHandicapSaved={() => void loadTripPage(trip.tripId)}
            onPlayersUpdated={(updatedPlayers) => setPlayers(updatedPlayers)}
            compact
            participationLocked={eventPlayerStatusLocked}
            participationLockReason={eventPlayerStatusLockReason}
          />
        </div>
      </div>

      <PlayerImportModal
        tripId={trip.tripId}
        open={playerImportOpen}
        onClose={() => {
          if (!initializingGhin) {
            setPlayerImportOpen(false);
          }
        }}
        onImported={() => void handlePlayersImported()}
      />
    </div>
  );
}
