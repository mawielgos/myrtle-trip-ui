import { useNavigate, useParams } from "react-router-dom";
import type { RoundTeam } from "../types/round";
import {
  pageContainerMediumStyle,
  primaryButtonStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import RoundReadinessPanel from "../components/round/RoundReadinessPanel";
import RoundTeamAssignmentTables from "../components/round/RoundTeamAssignmentTables";
import RoundTeamAssignmentNotices from "./RoundTeamAssignmentNotices";
import RoundTeamAssignmentHeader from "./RoundTeamAssignmentHeader";
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
      <RoundTeamAssignmentHeader
        roundId={roundId}
        eventRoundLabel={eventRoundLabel}
        formatLabel={status?.format ? getRoundFormatLabel(status.format, scrambleTeamSize) : null}
        courseName={status?.courseName}
        roundDate={status?.roundDate}
        tripId={status?.tripId}
        assignedCount={assignedCount}
        unassignedCount={unassignedPlayers.length}
        totalPlayers={totalPlayers}
        inactiveCount={inactiveCount}
        teamCount={teams.length}
        expectedTeamCount={expectedTeamCount}
        expectedTeamSize={expectedTeamSize}
        hasScrambleEvent={hasScrambleEvent}
        seedingLabel={seedingLabel}
        dirty={dirty}
        scrambleConfigDirty={scrambleConfigDirty}
        canSuggestTeamAssignments={canSuggestTeamAssignments}
        saving={saving}
        usesDerivedTeeSheetGroups={usesDerivedTeeSheetGroups}
        derivedGroupsButtonLabel={derivedGroupsButtonLabel}
        isReadyForScoring={isReadyForScoring}
        scoringBlockedReason={scoringBlockedReason}
        tripIsLocked={tripIsLocked}
        saveButtonLabel={saveButtonLabel}
        onBeforeNavigate={confirmIfNeeded}
        onSuggestTeams={() => suggestScrambleTeams(capabilities?.assignTeamsReason)}
        onOpenDerivedGroups={handleOpenDerivedGroups}
        onNavigate={navigateIfClean}
        onScoringBlocked={setError}
        onSave={handleSave}
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

      <RoundTeamAssignmentNotices
        usesDerivedTeeSheetGroups={usesDerivedTeeSheetGroups}
        hasScrambleEvent={hasScrambleEvent}
        derivedGroupsButtonLabel={derivedGroupsButtonLabel}
        shortFourManTeamsNeedingExceptionCount={shortFourManTeamsNeedingException.length}
        shortFourManTeamsCount={shortFourManTeams.length}
        tripIsLocked={tripIsLocked}
        isFinalizedRound={isFinalizedRound}
        dirty={dirty}
        scrambleConfigDirty={scrambleConfigDirty}
        confirmSuggestTeams={confirmSuggestTeams}
        applySuggestedScrambleTeams={applySuggestedScrambleTeams}
        cancelSuggestTeams={() => setConfirmSuggestTeams(false)}
        saving={saving}
        message={message}
        error={error}
      />

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
