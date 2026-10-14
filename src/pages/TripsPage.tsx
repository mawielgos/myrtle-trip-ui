import { useNavigate } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import TripsListCard from "../components/trip/TripsListCard";
import { errorBoxStyle, pageContainerWideStyle, primaryButtonStyle, sectionStyle, successBoxStyle } from "../styles/uiStyles";
import { useTripsPageController } from "./useTripsPageController";

export default function TripsPage() {
  const navigate = useNavigate();
  const {
    trips, tripDetailsById, loading, error, successMessage,
    deletingTripId, archiveActionTripId, showArchived, setShowArchived,
    sortedTrips, summary, handleDeleteTrip, handleArchiveTrip, handleRestoreTrip,
  } = useTripsPageController();

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
