import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import TripsListCard from "../components/trip/TripsListCard";
import { archiveTrip, deleteTrip, getTripDetail, getTrips, restoreTrip } from "../api/tripApi";
import { errorBoxStyle, pageContainerWideStyle, primaryButtonStyle, sectionStyle, successBoxStyle } from "../styles/uiStyles";
import type { TripDetail, TripListItem } from "../types/trip";

function getStatusWeight(status: string | null | undefined, detail?: TripDetail | null): number {
  if (status === "IN_PROGRESS") {
    return 0;
  }

  if (status === "PLANNING" && detail?.readiness?.canStartTrip) {
    return 1;
  }

  if (status === "PLANNING" || status === "NOT_STARTED") {
    return 2;
  }

  if (status === "COMPLETE") {
    return 3;
  }

  return 4;
}

export default function TripsPage() {
  const navigate = useNavigate();
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


  function getApiErrorMessage(err: any, fallback: string): string {
    const apiMessage =
      err?.response?.data?.message ??
      err?.response?.data?.error ??
      (typeof err?.response?.data === "string" ? err.response.data : null);

    return typeof apiMessage === "string" && apiMessage.trim() ? apiMessage : fallback;
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

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const detailA = tripDetailsById[a.tripId];
      const detailB = tripDetailsById[b.tripId];
      const archivedDiff = (a.archived ? 1 : 0) - (b.archived ? 1 : 0);
      if (archivedDiff !== 0) {
        return archivedDiff;
      }

      const statusA = detailA?.status ?? a.status;
      const statusB = detailB?.status ?? b.status;
      const weightDiff = getStatusWeight(statusA, detailA) - getStatusWeight(statusB, detailB);

      if (weightDiff !== 0) {
        return weightDiff;
      }

      const yearDiff = (b.tripYear ?? 0) - (a.tripYear ?? 0);
      if (yearDiff !== 0) {
        return yearDiff;
      }

      return a.tripName.localeCompare(b.tripName);
    });
  }, [trips, tripDetailsById]);

  const summary = useMemo(() => {
    let planning = 0;
    let inProgress = 0;
    let complete = 0;
    let archived = 0;

    for (const trip of trips) {
      if (trip.archived) {
        archived += 1;
      }

      const status = tripDetailsById[trip.tripId]?.status ?? trip.status;
      if (status === "IN_PROGRESS") {
        inProgress += 1;
      } else if (status === "COMPLETE") {
        complete += 1;
      } else {
        planning += 1;
      }
    }

    return {
      total: trips.length,
      planning,
      inProgress,
      complete,
      archived,
    };
  }, [trips, tripDetailsById]);

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Events"
        subtitle="Manage active events, review readiness, and jump back into the current round."
        actions={
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived
            </label>
            <button type="button" style={primaryButtonStyle} onClick={() => navigate("/trips/new")}>
              Create Event
            </button>
          </div>
        }
      />

      {loading ? <div style={sectionStyle}>Loading events...</div> : null}
      {!loading && error ? <div style={errorBoxStyle}>{error}</div> : null}
      {!loading && !error && successMessage ? <div style={successBoxStyle}>{successMessage}</div> : null}

      {!loading && !error ? (
        <div style={{ ...sectionStyle, padding: "12px", marginBottom: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            {[
              { label: "Total Events", value: summary.total },
              { label: "Planning", value: summary.planning },
              { label: "In Progress", value: summary.inProgress },
              { label: "Complete", value: summary.complete },
              { label: "Archived", value: summary.archived },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: "1px solid #e6e8eb",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  background: "#fafafa",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && trips.length === 0 ? <div style={sectionStyle}>No events found. Create an event to get started.</div> : null}

      {!loading && !error && sortedTrips.length > 0 ? (
        <div style={{ display: "grid", gap: "14px" }}>
          {sortedTrips.map((trip) => (
            <TripsListCard
              key={trip.tripId}
              trip={trip}
              detail={tripDetailsById[trip.tripId]}
              onOpenTrip={(tripId) => navigate(`/trips/${tripId}`)}
              onEditTrip={(tripId) => navigate(`/trips/${tripId}/edit`)}
              onDeleteTrip={(selectedTrip) => void handleDeleteTrip(selectedTrip)}
              onArchiveTrip={(selectedTrip) => void handleArchiveTrip(selectedTrip)}
              onRestoreTrip={(selectedTrip) => void handleRestoreTrip(selectedTrip)}
              isDeleting={deletingTripId === trip.tripId}
              isArchiveActionRunning={archiveActionTripId === trip.tripId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
