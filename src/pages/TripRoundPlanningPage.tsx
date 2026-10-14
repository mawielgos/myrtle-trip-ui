import { useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTripRoundPlanningPageData } from "./useTripRoundPlanningPageData";
import { useTripRoundPlanningCommands } from "./useTripRoundPlanningCommands";
import { useTripRoundPlanningInteractions } from "./useTripRoundPlanningInteractions";
import TripRoundPlanningBody from "./TripRoundPlanningBody";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";

export default function TripRoundPlanningPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const numericTripId = Number(tripId);
  const requestedRoundNumber = Number(searchParams.get("round"));

  const data = useTripRoundPlanningPageData({
    tripId: numericTripId,
    requestedRoundNumber,
  });
  const {
    rounds,
    setRounds,
    setExpandedRoundKey,
    tripName,
    tripInitialized,
    tripStartDate,
    tripEndDate,
    setPlannedRoundCount,
    hasFemalePlayers,
    loading,
    error,
    setError,
    initialSnapshot,
    ensureTeesLoaded,
    applySavedRounds,
  } = data;

  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const isReadOnly = tripInitialized;

  const interactions = useTripRoundPlanningInteractions({
    rounds,
    setRounds,
    expandedRoundKey: data.expandedRoundKey,
    setExpandedRoundKey,
    plannedRoundCount: data.plannedRoundCount,
    loading,
    initialSnapshot,
    isReadOnly,
    ensureTeesLoaded,
    setError,
  });

  function scrollToTopMessageArea(): void {
    window.setTimeout(() => {
      topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const commands = useTripRoundPlanningCommands({
    tripId: numericTripId,
    rounds,
    setRounds,
    setPlannedRoundCount,
    setExpandedRoundKey,
    tripStartDate,
    tripEndDate,
    hasFemalePlayers,
    multiRoundTournamentEnabled: interactions.multiRoundTournamentEnabled,
    isReadOnly,
    setError,
    applySavedRounds,
    onShowMessage: scrollToTopMessageArea,
  });

  const confirmIfNeeded = useUnsavedChangesWarning(
    interactions.hasChanges && !commands.saving,
  );

  async function handleTournamentSetupClick(): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(`/trips/${numericTripId}/tournament-setup`);
  }

  function renderActionButtons() {
    return (
      <>
        <TripDetailButton
          tripId={numericTripId}
          onBeforeNavigate={confirmIfNeeded}
        />
        {interactions.supportsMultiRoundTournament ? (
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void handleTournamentSetupClick()}
          >
            Tournament Setup
          </button>
        ) : null}
        {!isReadOnly ? (
          <button
            style={{
              ...primaryButtonStyle,
              ...(commands.isBusy ? { opacity: 0.55, cursor: "not-allowed" } : {}),
            }}
            type="button"
            onClick={commands.handleSave}
            disabled={commands.isBusy}
          >
            {commands.saving ? "Saving..." : "Save Planned Rounds"}
          </button>
        ) : null}
      </>
    );
  }

  if (loading) {
    return <div style={{ padding: "16px" }}>Loading planned rounds...</div>;
  }

  return (
    <div ref={topAnchorRef} style={pageContainerMediumStyle}>
      <PageHeader
        title="Event Round Planning"
        subtitle={`${tripName ? `${tripName} — ` : ""}${
          isReadOnly
            ? "planned rounds are locked after event initialization."
            : "choose each round's date, game, course, and default tee."
        }`}
        actions={renderActionButtons()}
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {commands.message ? <div style={successBoxStyle}>{commands.message}</div> : null}

      <TripRoundPlanningBody
        data={data}
        commands={commands}
        interactions={interactions}
        isReadOnly={isReadOnly}
        onTournamentSetupClick={() => void handleTournamentSetupClick()}
      />
    </div>
  );
}
