import { useNavigate, useParams } from "react-router-dom";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
} from "../styles/uiStyles";
import TripDetailBody from "./TripDetailBody";
import { useTripDetailPageData } from "./useTripDetailPageData";
import { useTripDetailCommands } from "./useTripDetailCommands";
import { useTripDetailViewState } from "./useTripDetailViewState";

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const {
    trip,
    players,
    plannedRounds,
    rounds,
    prizeSchedules,
    tournamentSetup,
    loading,
    error,
    setError,
    setPlayers,
    loadTripPage,
  } = useTripDetailPageData(tripId);

  const commands = useTripDetailCommands({
    trip,
    setError,
    loadTripPage,
  });

  const viewState = useTripDetailViewState({
    trip,
    players,
    plannedRounds,
    rounds,
  });

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading event...</div>;
  }

  if (error || !trip) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Event not found."}</div>
        <button type="button" style={buttonStyle} onClick={() => navigate("/trips")}>
          Events
        </button>
      </div>
    );
  }

  const handlePageNavigate = (path: string): void => {
    if (commands.initializingGhin) {
      return;
    }

    navigate(path);
  };

  return (
    <TripDetailBody
      trip={trip}
      players={players}
      prizeSchedules={prizeSchedules}
      tournamentSetup={tournamentSetup}
      initializingGhin={commands.initializingGhin}
      startingTrip={commands.startingTrip}
      resettingTripStart={commands.resettingTripStart}
      completingTrip={commands.completingTrip}
      changingCorrectionMode={commands.changingCorrectionMode}
      statusMessage={commands.statusMessage}
      playerImportOpen={commands.playerImportOpen}
      setPlayerImportOpen={commands.setPlayerImportOpen}
      handleInitializeGhin={commands.handleInitializeGhin}
      handleStartTrip={commands.handleStartTrip}
      handleResetTripStart={commands.handleResetTripStart}
      handleCompleteTrip={commands.handleCompleteTrip}
      handleEnterCorrectionMode={commands.handleEnterCorrectionMode}
      handleExitCorrectionMode={commands.handleExitCorrectionMode}
      handlePlayersImported={commands.handlePlayersImported}
      setPlayers={setPlayers}
      loadTripPage={loadTripPage}
      viewState={viewState}
      error={error}
      onNavigate={handlePageNavigate}
    />
  );
}
