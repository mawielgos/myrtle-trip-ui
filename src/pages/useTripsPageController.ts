import { useEffect, useMemo, useState } from "react";
import { useAppDialog } from "../components/common/AppDialog";
import { archiveTrip, deleteTrip, getTripDetail, getTrips, restoreTrip } from "../api/tripApi";
import type { TripDetail, TripListItem } from "../types/trip";
import { getApiErrorMessage, sortTrips, summarizeTrips } from "./tripsPageLogic";

/** Coordinates event-list loading and archive/delete/restore actions. */
export function useTripsPageController() {
  const { confirmDialog } = useAppDialog();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [tripDetailsById, setTripDetailsById] = useState<Record<number, TripDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingTripId, setDeletingTripId] = useState<number | null>(null);
  const [archiveActionTripId, setArchiveActionTripId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    void loadTrips();
  }, [showArchived]);

  async function loadTrips(): Promise<void> {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const tripList = await getTrips(showArchived);
      setTrips(tripList);

      const detailResults = await Promise.allSettled(
        tripList.map(async (trip) => {
          const detail = await getTripDetail(trip.tripId);
          return [trip.tripId, detail] as const;
        }),
      );

      const nextDetailsById: Record<number, TripDetail> = {};
      for (const result of detailResults) {
        if (result.status === "fulfilled") {
          const [tripId, detail] = result.value;
          nextDetailsById[tripId] = detail;
        }
      }

      setTripDetailsById(nextDetailsById);
    } catch (err) {
      console.error("Failed to load trips", err);
      setError("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }


  async function handleDeleteTrip(trip: TripListItem): Promise<void> {
    const confirmed = await confirmDialog({
      title: "Delete Event",
      message: `Delete ${trip.tripName}? This will remove the event roster, planned rounds, and any frozen GHIN baseline for this event.`,
      severity: "danger",
      confirmText: "Delete Event",
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeletingTripId(trip.tripId);
      setError("");
      setSuccessMessage("");
      await deleteTrip(trip.tripId);
      await loadTrips();
      setSuccessMessage(`${trip.tripName} was deleted.`);
    } catch (err: any) {
      console.error("Failed to delete trip", err);
      setError(getApiErrorMessage(err, "Failed to delete event."));
    } finally {
      setDeletingTripId(null);
    }
  }

  async function handleArchiveTrip(trip: TripListItem): Promise<void> {
    const confirmed = await confirmDialog({
      title: "Archive Event",
      message: `Archive ${trip.tripName}? It will be hidden from the main Events page but can be restored later.`,
      severity: "warning",
      confirmText: "Archive Event",
    });

    if (!confirmed) {
      return;
    }

    try {
      setArchiveActionTripId(trip.tripId);
      setError("");
      setSuccessMessage("");
      await archiveTrip(trip.tripId);
      await loadTrips();
      setSuccessMessage(`${trip.tripName} was archived.`);
    } catch (err: any) {
      console.error("Failed to archive trip", err);
      setError(getApiErrorMessage(err, "Failed to archive event."));
    } finally {
      setArchiveActionTripId(null);
    }
  }

  async function handleRestoreTrip(trip: TripListItem): Promise<void> {
    try {
      setArchiveActionTripId(trip.tripId);
      setError("");
      setSuccessMessage("");
      await restoreTrip(trip.tripId);
      await loadTrips();
      setSuccessMessage(`${trip.tripName} was restored.`);
    } catch (err: any) {
      console.error("Failed to restore trip", err);
      setError(getApiErrorMessage(err, "Failed to restore event."));
    } finally {
      setArchiveActionTripId(null);
    }
  }

  const sortedTrips = useMemo(() => sortTrips(trips, tripDetailsById), [trips, tripDetailsById]);
  const summary = useMemo(() => summarizeTrips(trips, tripDetailsById), [trips, tripDetailsById]);

  return { trips, tripDetailsById, loading, error, successMessage, deletingTripId, archiveActionTripId, showArchived, setShowArchived, sortedTrips, summary, handleDeleteTrip, handleArchiveTrip, handleRestoreTrip };
}
