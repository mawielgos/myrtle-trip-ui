import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import RoundGroupsBody from "./RoundGroupsBody";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { useRoundGroupsPageData } from "./useRoundGroupsPageData";
import { useRoundGroupsCommands } from "./useRoundGroupsCommands";
import { useRoundGroupsInteractions } from "./useRoundGroupsInteractions";

import {
  isScrambleRound,
  isTwoManRound,
} from "./roundGroupsLogic";

export default function RoundGroupsPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();


  const pageData = useRoundGroupsPageData({ roundId });
  const {
    groups,
    setGroups,
    roundStatus,
    allRoundPlayers,
    setAllRoundPlayers,
    roundFormat,
    readiness,
    defaultRoundTeeId,
    menDefaultRoundTeeId,
    womenDefaultRoundTeeId,
    teeOptions,
    loading,
    hydrationRevision,
    error,
    setError,
    reloadPageState,
  } = pageData;

  const roundIsFinalized = roundStatus?.finalized === true;
  const tripIsLocked = roundStatus?.tripLocked === true;
  const readOnly = roundIsFinalized || tripIsLocked;
  const readOnlyReason = tripIsLocked
    ? "This event is complete and locked. Groups and tee selections are view-only."
    : roundIsFinalized
      ? "This round is finalized. Groups and tee selections are view-only."
      : null;
  const teamsStepRequired = isTwoManRound(readiness, roundFormat);
  const interactions = useRoundGroupsInteractions({
    hydrationRevision,
    groups,
    setGroups,
    allRoundPlayers,
    setAllRoundPlayers,
    readiness,
    roundFormat,
    defaultRoundTeeId,
    menDefaultRoundTeeId,
    womenDefaultRoundTeeId,
    teeOptions,
    readOnly,
    readOnlyReason,
    setError,
  });
  const {
    dirty,
    successMessage,
    setSuccessMessage,
    unassignedPlayers,
    totalAssignedPlayers,
    totalPlayers,
    totalUnavailablePlayers,
    handleSuggestScrambleGroups,
  } = interactions;

  const assignmentComplete =
    totalPlayers > 0 &&
    totalAssignedPlayers === totalPlayers &&
    unassignedPlayers.length === 0;
  const commands = useRoundGroupsCommands({
    roundId,
    groups,
    defaultRoundTeeId,
    dirty,
    readOnly,
    readOnlyReason,
    reloadPageState,
    setError,
    setSuccessMessage,
  });
  const { saving, handleSave } = commands;
  const continueDisabled = !readOnly && (!assignmentComplete || saving);
  const continueDisabledReason = !assignmentComplete
    ? "Assign every player to a group before continuing."
    : saving
      ? "Saving group assignments..."
      : undefined;

  const continueButtonStyle: CSSProperties = continueDisabled
    ? {
        ...buttonStyle,
        color: "#888",
        background: "#eee",
        border: "1px solid #c7ccd1",
        cursor: "not-allowed",
      }
    : buttonStyle;

  const confirmIfNeeded = useUnsavedChangesWarning(
    dirty && !saving,
    "You have unsaved group or tee-selection changes. Leave without saving?",
  );

  async function navigateIfClean(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(path);
  }

  async function handleContinue(): Promise<void> {
    if (!roundId) {
      return;
    }

    if (readOnly) {
      if (teamsStepRequired) {
        navigate(`/rounds/${roundId}/teams`);
        return;
      }

      navigate(`/rounds/${roundId}/scoring`);
      return;
    }

    if (!assignmentComplete) {
      setError("Assign every player to a group before continuing.");
      return;
    }

    const saved = await handleSave(false);

    if (!saved) {
      return;
    }

    if (teamsStepRequired) {
      navigate(`/rounds/${roundId}/teams`);
      return;
    }

    navigate(`/rounds/${roundId}/scoring`);
  }


  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading round groups...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Round Groups"
        subtitle={
          <>
            <div>
              Assigned: {totalAssignedPlayers} • Unassigned:{" "}
              {unassignedPlayers.length} • Total Active: {totalPlayers}
              {totalUnavailablePlayers > 0 ? ` • Unavailable: ${totalUnavailablePlayers}` : ""}
            </div>
            <div
              style={{
                marginTop: "6px",
                color: dirty ? "#9a3412" : "#555",
                fontWeight: dirty ? 600 : 400,
              }}
            >
              {dirty ? "Unsaved changes" : "All changes saved"}
            </div>
          </>
        }
        actions={
          <>
            {roundStatus?.tripId ? (
              <TripDetailButton
                tripId={roundStatus.tripId}
                onBeforeNavigate={confirmIfNeeded}
              />
            ) : null}

            <WorkflowBackButton
              label="Round Setup"
              to={`/rounds/${roundId}`}
              onBeforeNavigate={confirmIfNeeded}
            />

            <button
              type="button"
              style={buttonStyle}
              onClick={() =>
                void navigateIfClean(`/rounds/${roundId}/tee-sheet`)
              }
            >
              Tee Sheet
            </button>

            {teamsStepRequired ? (
              <button
                type="button"
                style={continueButtonStyle}
                onClick={() => {
                  if (continueDisabled) {
                    setError(
                      continueDisabledReason ??
                        "Round groups are not ready for team assignment.",
                    );
                    return;
                  }
                  void navigateIfClean(`/rounds/${roundId}/teams`);
                }}
                disabled={continueDisabled}
                title={continueDisabledReason}
              >
                {readOnly ? "View Teams" : "Teams"}
              </button>
            ) : (
              <button
                type="button"
                style={continueButtonStyle}
                onClick={() => {
                  if (continueDisabled) {
                    setError(
                      continueDisabledReason ??
                        "Round groups are not ready for scoring.",
                    );
                    return;
                  }
                  void navigateIfClean(`/rounds/${roundId}/scoring`);
                }}
                disabled={continueDisabled}
                title={continueDisabledReason}
              >
                {readOnly ? "View Scores" : "Scoring"}
              </button>
            )}

            {isScrambleRound(readiness, roundFormat) && !readOnly ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={handleSuggestScrambleGroups}
                disabled={saving || allRoundPlayers.length === 0}
                title="Suggest balanced scramble teams by current index using serpentine seeding"
              >
                Suggest Teams
              </button>
            ) : null}

            {!readOnly ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
              >
                {saving ? "Saving..." : dirty ? "Save Groups" : "Saved"}
              </button>
            ) : null}
          </>
        }
      />

      <RoundProgressBar
        roundId={Number(roundId)}
        currentStep="groups"
        format={roundFormat}
        finalized={roundStatus?.finalized === true}
      />

      {readOnlyReason ? (
        <div style={warningBoxStyle}>{readOnlyReason}</div>
      ) : null}

      {dirty ? (
        <div style={warningBoxStyle}>
          You have unsaved group or tee-selection changes. Save before
          continuing.
        </div>
      ) : null}

      {successMessage ? (
        <div style={successBoxStyle}>{successMessage}</div>
      ) : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <RoundGroupsBody
        data={pageData}
        interactions={interactions}
        commands={commands}
        roundId={roundId}
        readOnly={readOnly}
        teamsStepRequired={teamsStepRequired}
        continueDisabled={continueDisabled}
        continueDisabledReason={continueDisabledReason}
        continueButtonStyle={continueButtonStyle}
        onNavigateIfClean={navigateIfClean}
        onContinue={handleContinue}
      />
    </div>
  );
}
