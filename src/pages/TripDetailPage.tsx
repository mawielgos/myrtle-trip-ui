import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  completeTrip,
  disableTripCorrectionMode,
  enableTripCorrectionMode,
  getPlannedRounds,
  getTripDetail,
  getTripPlayers,
  getTripPrizeSchedules,
  getTripRounds,
  getTripTournamentSetup,
  initializeTripGhin,
  resetTripStart,
  startTrip,
} from "../api/tripApi";
import TripCurrentRoundPanel from "../components/trip/TripCurrentRoundPanel";
import TripPlannedRoundsPanel from "../components/trip/TripPlannedRoundsPanel";
import TripReadinessPanel from "../components/trip/TripReadinessPanel";
import TripRosterPanel from "../components/trip/TripRosterPanel";
import PlayerImportModal from "../components/trip/PlayerImportModal";
import TripRoundsPanel from "../components/trip/TripRoundsPanel";
import TripStandingsPanel from "../components/trip/TripStandingsPanel";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import {
  buildCurrentRoundAction,
  buildReadinessBanner,
  formatCurrency,
  formatStatusLabel,
  getStatusBadgeStyle,
} from "../components/trip/tripDetailUtils";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import type {
  TripDetail,
  TripPlannedRound,
  PrizeSchedule,
  TripPlayer,
  TripReadiness,
  TripRoundListItem,
  TripTournamentSetup,
} from "../types/trip";

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

function isPrizeScheduleConfigured(schedule: PrizeSchedule): boolean {
  return (schedule.payouts ?? []).some((payout) => Number(payout.amountPerPlayer ?? 0) > 0);
}

function hasConfiguredPrizeMoney(schedules: PrizeSchedule[]): boolean {
  return schedules.some(isPrizeScheduleConfigured);
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

function isTripStarted(status: string | null | undefined): boolean {
  return status === "IN_PROGRESS" || status === "COMPLETE";
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildDateRange(rounds: TripPlannedRound[]): string {
  const datedRounds = rounds
    .map((round) => round.roundDate)
    .filter((date): date is string => Boolean(date))
    .sort();

  if (datedRounds.length === 0) {
    return "Dates TBD";
  }

  const first = formatShortDate(datedRounds[0]);
  const last = formatShortDate(datedRounds[datedRounds.length - 1]);

  if (!first && !last) {
    return "Dates TBD";
  }

  if (first && last) {
    return first === last ? first : `${first} – ${last}`;
  }

  return first ?? last ?? "Dates TBD";
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
            <button
              type="button"
              style={buttonStyle}
              onClick={() => onNavigate("/trips")}
              disabled={pageBusy}
            >
              Events
            </button>

            {!isTripStarted(trip.status) ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={() => onNavigate(`/trips/${trip.tripId}/edit`)}
                disabled={pageBusy}
              >
                Edit Event
              </button>
            ) : null}

            {currentRoundAction ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => onNavigate(currentRoundAction.path)}
                disabled={pageBusy}
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
                {initializingGhin ? "Loading GHIN Baseline..." : "Load GHIN Baseline"}
              </button>
            ) : null}

            {canShowStartTripButton ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={onStartTrip}
                disabled={pageBusy || startingTrip}
              >
                {startingTrip ? "Starting..." : "Start Event"}
              </button>
            ) : null}

            {canShowResetStartButton ? (
              <button
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: "#8a5a00",
                  color: "#8a5a00",
                  background: "#fffaf0",
                }}
                onClick={onResetTripStart}
                disabled={pageBusy || resettingTripStart}
                title="Return this event to Planning only if no scoring/finalization has happened."
              >
                {resettingTripStart ? "Resetting..." : "Reset Start"}
              </button>
            ) : null}

            {canShowCompleteTripButton ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={onCompleteTrip}
                disabled={pageBusy || completingTrip}
              >
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
              {trip.correctionMode === true
                ? "⚠ Correction Mode Enabled"
                : "Event Complete — Locked"}
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
              style={{
                ...buttonStyle,
                borderColor: "#8a5a00",
                color: "#8a5a00",
                background: "#fff",
              }}
              onClick={onExitCorrectionMode}
              disabled={pageBusy || changingCorrectionMode}
            >
              {changingCorrectionMode ? "Exiting..." : "Exit Correction Mode"}
            </button>
          ) : (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={onEnterCorrectionMode}
              disabled={pageBusy || changingCorrectionMode}
            >
              {changingCorrectionMode ? "Entering..." : "Enter Correction Mode"}
            </button>
          )}
        </div>
      ) : null}

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>
            PLAYERS
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {activePlayerCount}
          </div>
          <div style={{ color: "#666", fontSize: "13px" }}>
            Active / {playerCount} total
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>
            ROUNDS
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {finalizedRoundCount} / {initializedRoundCount}
          </div>
          <div style={{ color: "#666", fontSize: "13px" }}>
            Finalized / created
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>
            PLANNED ROUNDS
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {plannedRoundCount}
          </div>
          <div style={{ color: "#666", fontSize: "13px" }}>
            Event setup schedule
          </div>
        </div>

        <div style={metricCardStyle}>
          <div style={{ color: "#666", fontSize: "12px", fontWeight: 700 }}>
            ENTRY FEE
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {formatCurrency(trip.entryFee)}
          </div>
          <div style={{ color: "#666", fontSize: "13px" }}>
            Prize funding basis
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { confirmDialog } = useAppDialog();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [plannedRounds, setPlannedRounds] = useState<TripPlannedRound[]>([]);
  const [rounds, setRounds] = useState<TripRoundListItem[]>([]);
  const [prizeSchedules, setPrizeSchedules] = useState<PrizeSchedule[]>([]);
  const [tournamentSetup, setTournamentSetup] = useState<TripTournamentSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializingGhin, setInitializingGhin] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [resettingTripStart, setResettingTripStart] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);
  const [changingCorrectionMode, setChangingCorrectionMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [playerImportOpen, setPlayerImportOpen] = useState(false);

  async function loadTripPage(numericTripId: number): Promise<TripDetail> {
    const [
      tripResponse,
      playersResponse,
      plannedRoundsResponse,
      roundsResponse,
      prizeSchedulesResponse,
      tournamentSetupResponse,
    ] = await Promise.all([
      getTripDetail(numericTripId),
      getTripPlayers(numericTripId),
      getPlannedRounds(numericTripId),
      getTripRounds(numericTripId),
      getTripPrizeSchedules(numericTripId).catch((err) => {
        console.warn("Unable to load prize setup reminder state", err);
        return [] as PrizeSchedule[];
      }),
      getTripTournamentSetup(numericTripId).catch((err) => {
        console.warn("Unable to load tournament setup state", err);
        return null as TripTournamentSetup | null;
      }),
    ]);

    setTrip(tripResponse);
    setPlayers(playersResponse);
    setPlannedRounds(plannedRoundsResponse);
    setRounds(roundsResponse);
    setPrizeSchedules(prizeSchedulesResponse);
    setTournamentSetup(tournamentSetupResponse);

    return tripResponse;
  }

  useEffect(() => {
    async function load(): Promise<void> {
      if (!tripId) {
        setError("Event id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await loadTripPage(Number(tripId));
      } catch (err) {
        console.error("Failed to load event detail page", err);
        setError("Unable to load event details.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [tripId]);

  async function handleInitializeGhin(): Promise<void> {
    if (!trip) {
      return;
    }

    try {
      setInitializingGhin(true);
      setError(null);
      setStatusMessage(null);

      await initializeTripGhin(trip.tripId);
      const updatedTrip = await loadTripPage(trip.tripId);

      setStatusMessage(`GHIN baseline loaded for ${updatedTrip.tripName}.`);
    } catch (err: any) {
      console.error("Failed to initialize GHIN baseline", err);

      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : "Unable to load GHIN baseline for this event.",
      );
    } finally {
      setInitializingGhin(false);
    }
  }

  async function handleStartTrip(): Promise<void> {
    if (!trip) {
      return;
    }

    try {
      setStartingTrip(true);
      setError(null);
      setStatusMessage(null);

      await startTrip(trip.tripId);
      await loadTripPage(trip.tripId);

      setStatusMessage("Event started successfully.");
    } catch (err: any) {
      console.error("Failed to start event", err);

      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(
        typeof apiMessage === "string" ? apiMessage : "Unable to start this event.",
      );
    } finally {
      setStartingTrip(false);
    }
  }

  function readApiError(err: any, fallback: string): string {
    const apiMessage =
      err?.response?.data?.message ??
      err?.response?.data?.error ??
      (typeof err?.response?.data === "string" ? err.response.data : null);

    return typeof apiMessage === "string" ? apiMessage : fallback;
  }


  async function handleResetTripStart(): Promise<void> {
    if (!trip) {
      return;
    }

    const confirmed = await confirmDialog({
      title: "Reset Event Start",
      message: "Reset this event back to Planning? This will remove initialized rounds, scorecards, groups, teams, and round tees. Planned rounds, roster, handicap setup, prize setup, and manual score history will remain. This is only allowed before scoring starts.",
      severity: "danger",
      confirmText: "Reset Event",
    });

    if (!confirmed) {
      return;
    }

    try {
      setResettingTripStart(true);
      setError(null);
      setStatusMessage(null);

      await resetTripStart(trip.tripId);
      await loadTripPage(trip.tripId);

      setStatusMessage("Event start reset. You can update planning values and start the event again.");
    } catch (err: any) {
      console.error("Failed to reset event start", err);
      setError(readApiError(err, "Unable to reset this event start."));
    } finally {
      setResettingTripStart(false);
    }
  }

  async function handleCompleteTrip(): Promise<void> {
    if (!trip) {
      return;
    }

    const confirmed = await confirmDialog({
      title: "Complete Event",
      message: "Complete this event? Scores, setup, teams, and prize setup will be locked unless correction mode is enabled.",
      severity: "warning",
      confirmText: "Complete Event",
    });

    if (!confirmed) {
      return;
    }

    try {
      setCompletingTrip(true);
      setError(null);
      setStatusMessage(null);

      await completeTrip(trip.tripId);
      await loadTripPage(trip.tripId);

      setStatusMessage("Event marked complete. Event data is now locked.");
    } catch (err: any) {
      console.error("Failed to complete event", err);
      setError(readApiError(err, "Unable to complete this event."));
    } finally {
      setCompletingTrip(false);
    }
  }

  async function handleEnterCorrectionMode(): Promise<void> {
    if (!trip) {
      return;
    }

    try {
      setChangingCorrectionMode(true);
      setError(null);
      setStatusMessage(null);

      await enableTripCorrectionMode(trip.tripId);
      const updatedTrip = await loadTripPage(trip.tripId);

      if (updatedTrip.correctionMode !== true) {
        setError(
          "Correction mode was saved, but the event detail response did not return correctionMode=true. Restart the backend and confirm the event detail response sets correctionMode.",
        );
        return;
      }

      setStatusMessage("Correction mode enabled.");
    } catch (err: any) {
      console.error("Failed to enter correction mode", err);
      setError(readApiError(err, "Unable to enter correction mode."));
    } finally {
      setChangingCorrectionMode(false);
    }
  }

  async function handleExitCorrectionMode(): Promise<void> {
    if (!trip) {
      return;
    }

    try {
      setChangingCorrectionMode(true);
      setError(null);
      setStatusMessage(null);

      await disableTripCorrectionMode(trip.tripId);
      await loadTripPage(trip.tripId);

      setStatusMessage("Correction mode closed. Event data is locked again.");
    } catch (err: any) {
      console.error("Failed to exit correction mode", err);
      setError(readApiError(err, "Unable to exit correction mode."));
    } finally {
      setChangingCorrectionMode(false);
    }
  }

  async function handlePlayersImported(): Promise<void> {
    if (!trip) {
      return;
    }

    await loadTripPage(trip.tripId);
    setStatusMessage("Player import completed. Roster refreshed.");
  }

  const activePlayers = useMemo(() => {
    return players.filter(
      (player) => player.active !== false && (player.participationStatus ?? "ACTIVE") === "ACTIVE"
    );
  }, [players]);

  const sortedPlannedRounds = useMemo(() => {
    const activeRoundCount = trip?.plannedRoundCount ?? plannedRounds.length;
    return [...plannedRounds]
      .filter((round) => round.roundNumber <= activeRoundCount)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }, [plannedRounds, trip?.plannedRoundCount]);

  const sortedRounds = useMemo(() => {
    return [...rounds].sort((a, b) => {
      const aNumber = a.roundNumber ?? 999;
      const bNumber = b.roundNumber ?? 999;
      return aNumber - bNumber;
    });
  }, [rounds]);

  const roundsByRoundNumber = useMemo(() => {
    const map = new Map<number, TripRoundListItem>();

    for (const round of rounds) {
      if (round.roundNumber != null) {
        map.set(round.roundNumber, round);
      }
    }

    return map;
  }, [rounds]);

  const readiness: TripReadiness | null = trip?.readiness ?? null;
  const unresolvedGhinFixCount = trip?.unresolvedGhinFixCount ?? 0;

  const currentRoundAction = useMemo(() => {
    if (!trip) {
      return null;
    }

    return buildCurrentRoundAction(trip, rounds);
  }, [trip, rounds]);

  const currentRoundDetail = useMemo(() => {
    if (!trip?.currentRound) {
      return null;
    }

    return sortedRounds.find((round) => round.roundId === trip.currentRound?.roundId) ?? null;
  }, [trip?.currentRound, sortedRounds]);

  const canShowStartTripButton = useMemo(() => {
    if (!trip) {
      return false;
    }

    if (isTripStarted(trip.status)) {
      return false;
    }

    if (trip.currentRound) {
      return false;
    }

    return readiness?.canStartTrip === true;
  }, [trip, readiness]);

  const canShowLoadGhinButton = useMemo(() => {
    if (!trip) {
      return false;
    }

    if (trip.initialized === true) {
      return false;
    }

    if (isTripStarted(trip.status)) {
      return false;
    }

    if (!trip.tripCode || players.length === 0) {
      return false;
    }

    return true;
  }, [trip, players]);

  const readinessBanner = useMemo(() => {
    return buildReadinessBanner(trip?.status, readiness);
  }, [trip, readiness]);

  const tripDateRange = useMemo(() => {
    return buildDateRange(sortedPlannedRounds);
  }, [sortedPlannedRounds]);

  const finalizedRoundCount = useMemo(() => {
    return sortedRounds.filter((round) => round.finalized === true).length;
  }, [sortedRounds]);

  const canShowResetStartButton = useMemo(() => {
    if (!trip || trip.status !== "IN_PROGRESS") {
      return false;
    }

    if (sortedRounds.length === 0) {
      return false;
    }

    return finalizedRoundCount === 0;
  }, [trip, sortedRounds.length, finalizedRoundCount]);

  const canShowCompleteTripButton = useMemo(() => {
    if (!trip || trip.status !== "IN_PROGRESS") {
      return false;
    }

    if (sortedRounds.length === 0) {
      return false;
    }

    return finalizedRoundCount === sortedRounds.length;
  }, [trip, sortedRounds, finalizedRoundCount]);

  const allCreatedRoundsFinalized = sortedRounds.length > 0 && finalizedRoundCount === sortedRounds.length;
  const eventPlayerStatusLocked =
    (trip?.status === "COMPLETE" && trip?.correctionMode !== true) || allCreatedRoundsFinalized;
  const eventPlayerStatusLockReason = allCreatedRoundsFinalized
    ? "Event player status is locked because all created rounds are finalized. Use round corrections for finalized-round changes."
    : "Event player status is locked because this event is complete.";


  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("golf-trip-app-busy-change", {
        detail: {
          busy: initializingGhin,
          message: initializingGhin ? "Loading GHIN baseline..." : null,
        },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("golf-trip-app-busy-change", {
          detail: { busy: false, message: null },
        }),
      );
    };
  }, [initializingGhin]);


  if (loading) {
    return <div style={pageContainerWideStyle}>Loading event...</div>;
  }

  if (error || !trip) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Event not found."}</div>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => navigate("/trips")}
        >
          Events
        </button>
      </div>
    );
  }

  const tripStarted = isTripStarted(trip.status);


  const handlePageNavigate = (path: string): void => {
    if (initializingGhin) {
      return;
    }

    navigate(path);
  };

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
        onNavigate={handlePageNavigate}
      />

      {initializingGhin ? <GhinBaselineBusyBanner /> : null}

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {statusMessage ? (
        <div style={successBoxStyle}>{statusMessage}</div>
      ) : null}

      {trip.status !== "COMPLETE" ? (
        <PrizeSetupReminder
          tripId={trip.tripId}
          schedules={prizeSchedules}
          disabled={initializingGhin}
          onNavigate={handlePageNavigate}
        />
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
              <TripReadinessPanel
                tripStatus={trip.status}
                readiness={readiness}
                readinessBanner={readinessBanner}
              />

              <TripPlannedRoundsPanel
                tripId={trip.tripId}
                tripStatus={trip.status}
                plannedRounds={sortedPlannedRounds}
                roundsByRoundNumber={roundsByRoundNumber}
                onNavigate={handlePageNavigate}
                tournamentSetup={tournamentSetup}
              />
            </>
          ) : null}

          <TripRoundsPanel
            rounds={sortedRounds}
            onNavigate={handlePageNavigate}
          />

          <TripStandingsPanel
            tripId={trip.tripId}
            rounds={sortedRounds}
            plannedRounds={sortedPlannedRounds}
            tripStatus={trip.status}
            onNavigate={handlePageNavigate}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <TripCurrentRoundPanel
            trip={trip}
            currentRound={trip.currentRound}
            currentRoundDetail={currentRoundDetail}
            onNavigate={handlePageNavigate}
          />

          <TripRosterPanel
            tripId={trip.tripId}
            players={players}
            activePlayers={activePlayers}
            unresolvedGhinFixCount={unresolvedGhinFixCount}
            tripLocked={trip.status === "COMPLETE" && trip.correctionMode !== true}
            handicapsEnabled={trip.handicapsEnabled}
            handicapMethod={trip.handicapMethod}
            onNavigate={handlePageNavigate}
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
