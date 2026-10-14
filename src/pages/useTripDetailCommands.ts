import { useEffect, useState } from "react";
import {
  completeTrip,
  disableTripCorrectionMode,
  enableTripCorrectionMode,
  initializeTripGhin,
  resetTripStart,
  startTrip,
} from "../api/tripApi";
import { useAppDialog } from "../components/common/AppDialog";
import type { TripDetail } from "../types/trip";

function readApiError(err: any, fallback: string): string {
  const apiMessage =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null);

  return typeof apiMessage === "string" ? apiMessage : fallback;
}

type UseTripDetailCommandsArgs = {
  trip: TripDetail | null;
  setError: (error: string | null) => void;
  loadTripPage: (tripId: number) => Promise<TripDetail>;
};

export function useTripDetailCommands({
  trip,
  setError,
  loadTripPage,
}: UseTripDetailCommandsArgs) {
  const { confirmDialog } = useAppDialog();
  const [initializingGhin, setInitializingGhin] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [resettingTripStart, setResettingTripStart] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);
  const [changingCorrectionMode, setChangingCorrectionMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [playerImportOpen, setPlayerImportOpen] = useState(false);

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
      setError(readApiError(err, "Unable to load GHIN baseline for this event."));
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
      setError(readApiError(err, "Unable to start this event."));
    } finally {
      setStartingTrip(false);
    }
  }

  async function handleResetTripStart(): Promise<void> {
    if (!trip) {
      return;
    }

    const confirmed = await confirmDialog({
      title: "Reset Event Start",
      message:
        "Reset this event back to Planning? This will remove initialized rounds, scorecards, groups, teams, and round tees. Planned rounds, roster, handicap setup, prize setup, and manual score history will remain. This is only allowed before scoring starts.",
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

      setStatusMessage(
        "Event start reset. You can update planning values and start the event again.",
      );
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
      message:
        "Complete this event? Scores, setup, teams, and prize setup will be locked unless correction mode is enabled.",
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

  return {
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
  };
}
