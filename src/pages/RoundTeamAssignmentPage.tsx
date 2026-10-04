import { useNavigate, useParams } from "react-router-dom";
import type { RoundTeam } from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import RoundReadinessPanel from "../components/round/RoundReadinessPanel";
import RoundTeamAssignmentTables from "../components/round/RoundTeamAssignmentTables";
import RoundTeamAssignmentExceptionControl from "../components/round/RoundTeamAssignmentExceptionControl";
import RoundTeamAssignmentScrambleSetup from "../components/round/RoundTeamAssignmentScrambleSetup";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { useRoundTeamAssignmentPageData } from "../hooks/useRoundTeamAssignmentPageData";
import { useRoundTeamAssignmentCommands } from "../hooks/useRoundTeamAssignmentCommands";
import { useRoundTeamAssignmentInteractions } from "../hooks/useRoundTeamAssignmentInteractions";
import {
  getRoundTeamAssignmentCompletionState,
  useRoundTeamAssignmentBaseViewState,
} from "../hooks/useRoundTeamAssignmentViewState";
import {
  playerCanUseTee,
  getRoundFormatLabel,
} from "./roundTeamAssignmentLogic";

const disabledSmallButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  height: "30px",
  padding: "0 10px",
  fontSize: "13px",
  color: "#888",
  background: "#eee",
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};

function formatEventRoundLabel(
  roundNumber?: number | null,
  fallbackRoundId?: number | null,
): string {
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) {
    return `Round ${roundNumber}`;
  }

  if (typeof fallbackRoundId === "number" && Number.isFinite(fallbackRoundId)) {
    return `Round ${fallbackRoundId}`;
  }

  return "Round";
}


export default function RoundTeamAssignmentPage() {
  const navigate = useNavigate();
  const { roundId } = useParams<{ roundId: string }>();

  const {
    status,
    eventRoundNumber,
    readiness,
    setReadiness,
    capabilities,
    setCapabilities,
    loading,
    error,
    setError,
    message,
    setMessage,
    defaultRoundTeeId,
    teeOptions,
    teams,
    setTeams,
    unassignedPlayers,
    setUnassignedPlayers,
    inactivePlayers,
    teamExceptions,
    setTeamExceptions,
    originalTeeByScorecardId,
    setOriginalTeeByScorecardId,
    seedingLabel,
    setSeedingLabel,
    scrambleTeamSize,
    setScrambleTeamSize,
    scrambleSeedingMethod,
    setScrambleSeedingMethod,
    scrambleHandicapDate,
    setScrambleHandicapDate,
    scrambleSeedingRounds,
    setScrambleSeedingRounds,
    scrambleConfigDirty,
    setScrambleConfigDirty,
    applyAssignmentPageResponse,
  } = useRoundTeamAssignmentPageData(roundId);

  const {
    assignedCount,
    totalPlayers,
    inactiveCount,
    hasScrambleEvent,
    hasTwoManLowNetEvent,
    expectedTeamSize,
    expectedTeamCount,
    isFinalizedRound,
    tripIsLocked,
    canAssignTeams,
    canSuggestTeamAssignments,
    canEditScrambleSetup,
    canCorrectTeeAfterFinalization,
    teeCorrectionsAllowed,
    teamStructureLocked,
  } = useRoundTeamAssignmentBaseViewState({
    status,
    readiness,
    capabilities,
    teams,
    unassignedPlayers,
    inactivePlayers,
    scrambleTeamSize,
  });

  const {
    dirty,
    setDirty,
    confirmSuggestTeams,
    setConfirmSuggestTeams,
    updatePlayerTee,
    moveUnassignedPlayerToTeam,
    removePlayerFromTeam,
    movePlayerWithinTeam,
    updateScrambleSeedingRound,
    updateScrambleTeamSize,
    updateScrambleSeedingMethod,
    updateScrambleHandicapDate,
    applySuggestedScrambleTeams,
    suggestScrambleTeams,
  } = useRoundTeamAssignmentInteractions({
    status,
    teams,
    setTeams,
    unassignedPlayers,
    setUnassignedPlayers,
    teeOptions,
    defaultRoundTeeId,
    scrambleTeamSize,
    setScrambleTeamSize,
    setScrambleSeedingMethod,
    setScrambleHandicapDate,
    setScrambleSeedingRounds,
    scrambleConfigDirty,
    setScrambleConfigDirty,
    setError,
    setMessage,
    expectedTeamSize,
    canAssignTeams,
    hasScrambleEvent,
    canUseTee: playerCanUseTee,
  });

  const {
    saving,
    handleParticipationChange,
    handleSaveScrambleConfig,
    handleSave,
    handleSaveGhostException,
    handleSaveRotationException,
    handleDeleteException,
  } = useRoundTeamAssignmentCommands({
    roundId,
    status,
    capabilities,
    setCapabilities,
    setReadiness,
    teams,
    setTeams,
    unassignedPlayers,
    setUnassignedPlayers,
    teamExceptions,
    setTeamExceptions,
    defaultRoundTeeId,
    originalTeeByScorecardId,
    setOriginalTeeByScorecardId,
    scrambleTeamSize,
    setScrambleTeamSize,
    scrambleSeedingMethod,
    setScrambleSeedingMethod,
    scrambleHandicapDate,
    setScrambleHandicapDate,
    scrambleSeedingRounds,
    setScrambleSeedingRounds,
    setSeedingLabel,
    scrambleConfigDirty,
    setScrambleConfigDirty,
    dirty,
    setDirty,
    setError,
    setMessage,
    applyAssignmentPageResponse,
    expectedTeamSize,
    hasScrambleEvent,
    hasTwoManLowNetEvent,
    tripIsLocked,
    canAssignTeams,
    canEditScrambleSetup,
    canCorrectTeeAfterFinalization,
  });

  const {
    shortFourManTeams,
    shortFourManTeamsNeedingException,
    isReadyForScoring,
    scoringBlockedReason,
    usesDerivedTeeSheetGroups,
    derivedGroupsButtonLabel,
    saveButtonLabel,
  } = getRoundTeamAssignmentCompletionState({
    status,
    readiness,
    teams,
    unassignedPlayers,
    teamExceptions,
    expectedTeamSize,
    hasScrambleEvent,
    hasTwoManLowNetEvent,
    isFinalizedRound,
    dirty,
    scrambleConfigDirty,
    saving,
  });

  const confirmIfNeeded = useUnsavedChangesWarning(
    (dirty || scrambleConfigDirty) && !saving,
    "You have unsaved team assignment or Scramble setup changes. Leave without saving?",
  );

  async function navigateIfClean(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) return;
    navigate(path);
  }

  async function handleOpenDerivedGroups(): Promise<void> {
    if (!roundId) return;

    if (scrambleConfigDirty) {
      setError(
        "Save Scramble Setup before setting tee times so groups use the current Scramble configuration.",
      );
      setMessage(null);
      return;
    }

    if (dirty) {
      const saved = await handleSave();
      if (!saved) return;
    } else if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(`/rounds/${roundId}/groups`);
  }

  if (loading) {
    return (
      <div style={pageContainerMediumStyle}>
        <h1 style={{ marginTop: 0 }}>Round Team Assignment</h1>
        <div>Loading team assignment...</div>
      </div>
    );
  }

  const eventRoundLabel = formatEventRoundLabel(
    eventRoundNumber,
    Number(roundId),
  );

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Round Team Assignment"
        subtitle={
          <>
            <div>
              {eventRoundLabel}
              {status?.format
                ? ` • ${getRoundFormatLabel(status.format, scrambleTeamSize)}`
                : ""}
              {status?.courseName ? ` • ${status.courseName}` : ""}
              {status?.roundDate ? ` • ${status.roundDate}` : ""}
            </div>
            <div style={{ marginTop: "6px" }}>
              Assigned: {assignedCount} • Unassigned: {unassignedPlayers.length}{" "}
              • Total Active: {totalPlayers} • Unavailable: {inactiveCount} •
              Teams: {teams.length}/{expectedTeamCount} • Max/team:{" "}
              {expectedTeamSize}
            </div>
            {hasScrambleEvent && seedingLabel ? (
              <div style={{ marginTop: "6px", color: "#555" }}>
                {seedingLabel}
              </div>
            ) : null}
            <div
              style={{
                marginTop: "6px",
                color: dirty || scrambleConfigDirty ? "#9a3412" : "#555",
                fontWeight: dirty || scrambleConfigDirty ? 600 : 400,
              }}
            >
              {dirty || scrambleConfigDirty
                ? "Unsaved changes"
                : "All changes saved"}
            </div>
          </>
        }
        actions={
          <>
            {status?.tripId ? (
              <TripDetailButton
                tripId={status.tripId}
                onBeforeNavigate={confirmIfNeeded}
              />
            ) : null}
            <WorkflowBackButton
              label="Back to Round Setup"
              to={`/rounds/${roundId}`}
              onBeforeNavigate={confirmIfNeeded}
            />
            {canSuggestTeamAssignments ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={() => suggestScrambleTeams(capabilities?.assignTeamsReason)}
                disabled={saving || (hasScrambleEvent && scrambleConfigDirty)}
              >
                Suggest Teams
              </button>
            ) : null}
            {usesDerivedTeeSheetGroups ? (
              <button
                type="button"
                style={dirty ? primaryButtonStyle : buttonStyle}
                onClick={() => void handleOpenDerivedGroups()}
                disabled={saving}
                title={
                  scrambleConfigDirty
                    ? "Save Scramble Setup before setting tee times."
                    : undefined
                }
              >
                {derivedGroupsButtonLabel}
              </button>
            ) : null}

            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                void navigateIfClean(`/rounds/${roundId}/tee-sheet`)
              }
            >
              Tee Sheet
            </button>
            <button
              type="button"
              style={isReadyForScoring ? buttonStyle : disabledSmallButtonStyle}
              disabled={!isReadyForScoring}
              title={scoringBlockedReason ?? undefined}
              onClick={() => {
                if (!isReadyForScoring) {
                  setError(
                    scoringBlockedReason ?? "Round is not ready for scoring.",
                  );
                  return;
                }
                navigateIfClean(`/rounds/${roundId}/scoring`);
              }}
            >
              Continue to Scoring
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void navigateIfClean(`/rounds/${roundId}/results`)}
            >
              Results
            </button>
            {!tripIsLocked ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
              >
                {saveButtonLabel}
              </button>
            ) : null}
          </>
        }
      />

      {readiness ? <RoundReadinessPanel readiness={readiness} compact /> : null}
      {status ? (
        <RoundProgressBar
          roundId={status.roundId}
          currentStep="teams"
          format={status.format}
          finalized={status.finalized}
        />
      ) : null}

      {usesDerivedTeeSheetGroups ? (
        <div style={warningBoxStyle}>
          {hasScrambleEvent
            ? "Scramble teams define the competition teams. Tee times and starting holes are managed from derived tee-sheet groups."
            : "2-Man teams define the competition teams. Tee times and starting holes are managed from derived tee-sheet groups."}{" "}
          Use <strong>{derivedGroupsButtonLabel}</strong> after suggesting or
          editing teams to generate or adjust tee times before scoring.
        </div>
      ) : null}

      {shortFourManTeamsNeedingException.length > 0 ? (
        <div style={warningBoxStyle}>
          One or more 4-man teams have only 3 players. Configure a valid
          short-team exception below: ghost player for 4-Man 2-Low Net, or
          extra-shot rotation for Scramble.
        </div>
      ) : shortFourManTeams.length > 0 ? (
        <div style={warningBoxStyle}>
          Short 4-man team exception configured. Readiness will allow the short
          team once groups / tee times are complete.
        </div>
      ) : null}

      {tripIsLocked ? (
        <div style={warningBoxStyle}>
          This event is complete and locked. Team assignments and tee selections
          are view-only.
        </div>
      ) : isFinalizedRound ? (
        <div style={warningBoxStyle}>
          This round is finalized. Team membership and player order are locked,
          but tee corrections are allowed and will trigger recalculation.
        </div>
      ) : null}

      {dirty || scrambleConfigDirty ? (
        <div style={warningBoxStyle}>
          {isFinalizedRound
            ? "You have unsaved tee corrections. Save before leaving this page or going to scoring."
            : scrambleConfigDirty && dirty
              ? "You have unsaved Scramble setup and team assignment changes. Save both before leaving this page or going to scoring."
              : scrambleConfigDirty
                ? "You have unsaved Scramble setup changes. Save Scramble Setup before leaving this page or going to scoring."
                : "You have unsaved team assignment changes. Save before leaving this page or going to scoring."}
        </div>
      ) : null}

      {confirmSuggestTeams ? (
        <div style={warningBoxStyle}>
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>
            Replace current team assignments?
          </div>
          <div>
            Suggest Teams will rebuild the teams from the current active player
            list. Existing team assignments, short-team exception setup, and
            tee-sheet groups may need to be reviewed again after you save.
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={applySuggestedScrambleTeams}
              disabled={saving}
            >
              Continue Suggest Teams
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => setConfirmSuggestTeams(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {hasScrambleEvent ? (
        <RoundTeamAssignmentScrambleSetup
          scrambleTeamSize={scrambleTeamSize}
          scrambleSeedingMethod={scrambleSeedingMethod}
          scrambleHandicapDate={scrambleHandicapDate}
          scrambleSeedingRounds={scrambleSeedingRounds}
          scrambleConfigDirty={scrambleConfigDirty}
          canEditScrambleSetup={canEditScrambleSetup}
          saving={saving}
          assignTeamsReason={capabilities?.assignTeamsReason}
          updateScrambleTeamSize={updateScrambleTeamSize}
          updateScrambleSeedingMethod={updateScrambleSeedingMethod}
          updateScrambleHandicapDate={updateScrambleHandicapDate}
          updateScrambleSeedingRound={updateScrambleSeedingRound}
          handleSaveScrambleConfig={handleSaveScrambleConfig}
          suggestScrambleTeams={suggestScrambleTeams}
        />
      ) : null}

      <RoundTeamAssignmentTables
        teams={teams}
        unassignedPlayers={unassignedPlayers}
        inactivePlayers={inactivePlayers}
        teeOptions={teeOptions}
        defaultRoundTeeId={defaultRoundTeeId}
        expectedTeamSize={expectedTeamSize}
        teamStructureLocked={teamStructureLocked}
        saving={saving}
        isFinalizedRound={isFinalizedRound}
        teeCorrectionsAllowed={teeCorrectionsAllowed}
        tripIsLocked={tripIsLocked}
        updatePlayerTee={updatePlayerTee}
        movePlayerWithinTeam={movePlayerWithinTeam}
        removePlayerFromTeam={removePlayerFromTeam}
        moveUnassignedPlayerToTeam={moveUnassignedPlayerToTeam}
        handleParticipationChange={handleParticipationChange}
        renderTeamExceptionControl={(team: RoundTeam) => (
          <RoundTeamAssignmentExceptionControl
            team={team}
            teams={teams}
            teamExceptions={teamExceptions}
            expectedTeamSize={expectedTeamSize}
            teamStructureLocked={teamStructureLocked}
            hasScrambleEvent={hasScrambleEvent}
            saving={saving}
            onSaveGhost={handleSaveGhostException}
            onSaveRotation={handleSaveRotationException}
            onDelete={handleDeleteException}
          />
        )}
      />

      {!tripIsLocked ? (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            {saveButtonLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
