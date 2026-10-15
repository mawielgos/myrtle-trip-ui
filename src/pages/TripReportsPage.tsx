import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { errorBoxStyle, pageContainerWideStyle, sectionStyle } from "../styles/uiStyles";
import { useTripReportsController } from "./useTripReportsController";
import TripEventReports from "./TripEventReports";
import TripRoundReports from "./TripRoundReports";

export default function TripReportsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const {
    trip,
    rounds,
    loading,
    error,
    finalizedRounds,
    tournamentCompetitionLinks,
    showTournament,
  } = useTripReportsController(numericTripId);

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading reports...</div>;
  }

  if (error || !trip) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Event was not found."}</div>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Reports & Exports"
        subtitle={`${trip.tripName} - ${trip.tripYear}`}
        actions={<TripDetailButton tripId={trip.tripId} />}
      />

      <TripEventReports
        tripId={trip.tripId}
        showTournament={showTournament}
        tournamentCompetitionLinks={tournamentCompetitionLinks}
        onNavigate={navigate}
      />
      <TripRoundReports rounds={rounds} onNavigate={navigate} />

      {finalizedRounds.length === 0 ? (
        <div style={{ ...sectionStyle, color: "#666" }}>
          Finalized round result reports will become more useful after scoring
          and finalization. Tee sheets are available before finalization.
        </div>
      ) : null}
    </div>
  );
}
