import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { useRoundScoringPageData } from "../hooks/useRoundScoringPageData";
import { useRoundScoringCommands } from "../hooks/useRoundScoringCommands";
import { useRoundScoringInteractions } from "../hooks/useRoundScoringInteractions";
import {
  deriveRoundScoringActionState,
  useRoundScoringViewState,
} from "../hooks/useRoundScoringViewState";
import { errorBoxStyle, pageContainerWideStyle } from "../styles/uiStyles";
import RoundScoringView from "../components/round/scoring/RoundScoringView";

export default function RoundScoringPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roundId } = useParams();
  const numericRoundId = Number(roundId);

  const {
    status,
    eventRoundNumber,
    readiness,
    rows,
    setRows,
    scrambleRows,
    setScrambleRows,
    scrambleEntryMode,
    setScrambleEntryMode,
    teeOptions,
    defaultRoundTeeId,
    initialRowsSnapshot,
    loading,
    message,
    setMessage,
    error,
    setError,
    focusRequestId,
    loadPage,
  } = useRoundScoringPageData(numericRoundId);

  const viewOnlyMode = searchParams.get("mode") === "view";
  const {
    isScramble,
    hasChanges,
    hasIncompleteScorecards,
    roundLockedByCompleteTrip,
    tripCorrectionMode,
    scoringReadOnly,
    readinessReadyForScoring,
    readinessBlocksScoring,
    canFinalize,
  } = useRoundScoringViewState({
    status,
    readiness,
    rows,
    scrambleRows,
    scrambleEntryMode,
    initialRowsSnapshot,
    loading,
    viewOnlyMode,
  });

  const {
    saving,
    finalizing,
    refreshingHandicaps,
    handleSaveScores,
    handleRefreshHandicaps,
    handleFinalizeRound,
  } = useRoundScoringCommands({
    status,
    rows,
    scrambleRows,
    scrambleEntryMode,
    initialRowsSnapshot,
    hasChanges,
    canFinalize,
    readinessReadyForScoring,
    isScramble,
    roundLockedByCompleteTrip,
    loadPage,
    setMessage,
    setError,
  });

  const {
    setInputRef,
    handlePlayerHoleChange,
    handleScrambleHoleChange,
    handleHoleKeyDown,
    updateScrambleTotal,
    updateScrambleMode,
    updateTee,
    updateWithdrawalStatus,
    markRowWithdrawn,
  } = useRoundScoringInteractions({
    rows,
    setRows,
    scrambleRows,
    setScrambleRows,
    scrambleEntryMode,
    setScrambleEntryMode,
    isScramble,
    loading,
    saving,
    finalizing,
    scoringReadOnly,
    focusRequestId,
    setMessage,
    setError,
  });

  const {
    saveDisabled,
    finalizeDisabled,
    refreshHandicapsDisabled,
    showSaveButton,
    saveButtonLabel,
  } = deriveRoundScoringActionState({
    status,
    saving,
    finalizing,
    refreshingHandicaps,
    scoringReadOnly,
    hasChanges,
    canFinalize,
  });

  const confirmIfNeeded = useUnsavedChangesWarning(
    hasChanges && !saving && !finalizing,
  );

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }



  if (loading) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Scoring</h1>
        <div>Loading...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={pageContainerWideStyle}>
        <h1 style={{ marginTop: 0 }}>Round Scoring</h1>
        <div style={errorBoxStyle}>{error ?? "Round not found."}</div>
      </div>
    );
  }

  return (
    <RoundScoringView
      status={status}
      eventRoundNumber={eventRoundNumber}
      rows={rows}
      scrambleRows={scrambleRows}
      scrambleEntryMode={scrambleEntryMode}
      teeOptions={teeOptions}
      defaultRoundTeeId={defaultRoundTeeId}
      message={message}
      error={error}
      viewOnlyMode={viewOnlyMode}
      roundLockedByCompleteTrip={roundLockedByCompleteTrip}
      tripCorrectionMode={tripCorrectionMode}
      scoringReadOnly={scoringReadOnly}
      isScramble={isScramble}
      canFinalize={canFinalize}
      hasIncompleteScorecards={hasIncompleteScorecards}
      readinessBlocksScoring={readinessBlocksScoring}
      saving={saving}
      finalizing={finalizing}
      refreshingHandicaps={refreshingHandicaps}
      saveDisabled={saveDisabled}
      finalizeDisabled={finalizeDisabled}
      refreshHandicapsDisabled={refreshHandicapsDisabled}
      showSaveButton={showSaveButton}
      hasChanges={hasChanges}
      saveButtonLabel={saveButtonLabel}
      confirmIfNeeded={confirmIfNeeded}
      navigateIfConfirmed={navigateIfConfirmed}
      loadPage={loadPage}
      handleSaveScores={handleSaveScores}
      handleRefreshHandicaps={handleRefreshHandicaps}
      handleFinalizeRound={handleFinalizeRound}
      setInputRef={setInputRef}
      handlePlayerHoleChange={handlePlayerHoleChange}
      handleScrambleHoleChange={handleScrambleHoleChange}
      handleHoleKeyDown={handleHoleKeyDown}
      updateScrambleTotal={updateScrambleTotal}
      updateScrambleMode={updateScrambleMode}
      updateTee={updateTee}
      updateWithdrawalStatus={updateWithdrawalStatus}
      markRowWithdrawn={markRowWithdrawn}
    />
  );

}
