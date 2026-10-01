import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTrips } from "../api/tripApi";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import type { TripListItem } from "../types/trip";

export default function TripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadTrips();
  }, []);

  async function loadTrips(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const data = await getTrips();
      console.log("Trips API response:", data);
      setTrips(data);
    } catch (err) {
      console.error("Failed to load trips", err);
      setError("Failed to load trips.");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateTrip(): void {
    navigate("/trips/new");
  }

  function handleOpenTrip(tripId: number): void {
    navigate(`/trips/${tripId}`);
  }

  function handleOpenCourses(): void {
    navigate("/admin/courses");
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>Trips</h1>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={handleOpenCourses}>
            Course Master
          </button>
          <button style={buttonStyle} onClick={handleCreateTrip}>
            Create Trip
          </button>
        </div>
      </div>

      {loading && <div>Loading trips...</div>}

      {!loading && error && <div style={errorBoxStyle}>{error}</div>}

      {!loading && !error && trips.length === 0 && (
        <div style={sectionStyle}>No trips found.</div>
      )}

      {!loading && !error && trips.length > 0 && (
        <div style={sectionStyle}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Year</th>
                <th style={thStyle}>Players</th>
                <th style={thStyle}>Rounds</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.tripId}>
                  <td style={tdStyle}>{trip.tripName}</td>
                  <td style={tdStyle}>{trip.tripCode}</td>
                  <td style={tdStyle}>{trip.tripYear}</td>
                  <td style={tdStyle}>{trip.playerCount ?? ""}</td>
                  <td style={tdStyle}>{trip.roundCount ?? ""}</td>
                  <td style={tdStyle}>
                    <button
                      style={buttonStyle}
                      onClick={() => handleOpenTrip(trip.tripId)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}