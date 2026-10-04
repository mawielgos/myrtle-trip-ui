import React from "react";
import type { RoundStatus, RoundTeeOption, ScrambleScoreEntryMode } from "../../../types/round";
import { buttonStyle, errorBoxStyle, pageContainerWideStyle, primaryButtonStyle, successBoxStyle, warningBoxStyle } from "../../../styles/uiStyles";
import PageHeader from "../../common/PageHeader";
import TripDetailButton from "../../common/TripDetailButton";
import RoundCorrectionHistoryPanel from "../../RoundCorrectionHistoryPanel";
import RoundProgressBar from "../RoundProgressBar";
import type { ScoreRow } from "../../../pages/roundScoringLogic";
import type { ScrambleTeamRow } from "../../../pages/roundScrambleScoringLogic";
import RoundScoringActionPanel from "./RoundScoringActionPanel";
import RoundScrambleScoringSection from "./RoundScrambleScoringSection";
import RoundPlayerScoringSection from "./RoundPlayerScoringSection";

type Props = {
  status: RoundStatus; eventRoundNumber: number | null; rows: ScoreRow[]; scrambleRows: ScrambleTeamRow[]; scrambleEntryMode: ScrambleScoreEntryMode; teeOptions: RoundTeeOption[]; defaultRoundTeeId: number | null;
  message: string | null; error: string | null; viewOnlyMode: boolean; roundLockedByCompleteTrip: boolean; tripCorrectionMode: boolean; scoringReadOnly: boolean; isScramble: boolean; canFinalize: boolean; hasIncompleteScorecards: boolean; readinessBlocksScoring: boolean;
  saving: boolean; finalizing: boolean; refreshingHandicaps: boolean; saveDisabled: boolean; finalizeDisabled: boolean; refreshHandicapsDisabled: boolean; showSaveButton: boolean; hasChanges: boolean; saveButtonLabel: string;
  confirmIfNeeded: () => Promise<boolean>; navigateIfConfirmed: (path: string) => Promise<void>; loadPage: (roundId: number) => Promise<void>; handleSaveScores: () => Promise<void>; handleRefreshHandicaps: () => Promise<void>; handleFinalizeRound: () => Promise<void>;
  setInputRef: (rowId: number, holeIndex: number, element: HTMLInputElement | null, prefix?: string) => void; handlePlayerHoleChange: (scorecardId: number, holeIndex: number, value: string) => void; handleScrambleHoleChange: (roundTeamId: number, holeIndex: number, value: string) => void; handleHoleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, rowId: number, holeIndex: number, currentValue: string, prefix?: string) => void;
  updateScrambleTotal: (roundTeamId: number, value: string) => void; updateScrambleMode: (mode: ScrambleScoreEntryMode) => void; updateTee: (scorecardId: number, roundTeeId: number) => void; updateWithdrawalStatus: (scorecardId: number, withdrawalHoleNumber: number | null) => void; markRowWithdrawn: (scorecardId: number) => void;
};

function formatEventRoundLabel(roundNumber?: number | null, fallbackRoundId?: number | null): string {
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) return `Round ${roundNumber}`;
  if (typeof fallbackRoundId === "number" && Number.isFinite(fallbackRoundId)) return `Round ${fallbackRoundId}`;
  return "Round";
}

export default function RoundScoringView(props: Props) {
  const { status, eventRoundNumber, rows, scrambleRows, scrambleEntryMode, teeOptions, defaultRoundTeeId, message, error, viewOnlyMode, roundLockedByCompleteTrip, tripCorrectionMode, scoringReadOnly, isScramble, canFinalize, hasIncompleteScorecards, readinessBlocksScoring, saving, finalizing, refreshingHandicaps, saveDisabled, finalizeDisabled, refreshHandicapsDisabled, showSaveButton, hasChanges, saveButtonLabel, confirmIfNeeded, navigateIfConfirmed, loadPage, handleSaveScores, handleRefreshHandicaps, handleFinalizeRound, setInputRef, handlePlayerHoleChange, handleScrambleHoleChange, handleHoleKeyDown, updateScrambleTotal, updateScrambleMode, updateTee, updateWithdrawalStatus, markRowWithdrawn } = props;
  const headerHoles = rows.length > 0 && rows[0].holeMeta.length === 18 ? rows[0].holeMeta : Array.from({ length: 18 }, (_, index) => ({ holeNumber: index + 1, par: null, handicap: null, strokes: null }));
  const frontNineParTotal = headerHoles.slice(0, 9).reduce((sum, hole) => sum + (hole.par ?? 0), 0);
  const backNineParTotal = headerHoles.slice(9, 18).reduce((sum, hole) => sum + (hole.par ?? 0), 0);
  const totalParTotal = frontNineParTotal + backNineParTotal;
  const scrambleTeamSize = status.scrambleTeamSize === 2 || status.scrambleTeamSize === 3 || status.scrambleTeamSize === 4 ? status.scrambleTeamSize : 4;
  const scrambleGameLabel = `${scrambleTeamSize}-Person Scramble`;
  const scrambleModeLabel = scrambleEntryMode === "TOTAL" ? "Scoring Mode: Total Team Score" : "Scoring Mode: Hole-by-Hole";
  const eventRoundLabel = formatEventRoundLabel(eventRoundNumber, status.roundId);
  const actionProps = { scoringReadOnly, finalized: status.finalized, canFinalize, hasIncompleteScorecards, isScramble, readinessBlocksScoring, showSaveButton, saveDisabled, saveButtonLabel, saving, refreshHandicapsDisabled, refreshingHandicaps, hasChanges, finalizeDisabled, finalizing, handleSaveScores, handleRefreshHandicaps, handleFinalizeRound };
  return (
    <div style={pageContainerWideStyle}>
      <PageHeader title="Round Scoring" subtitle={`${eventRoundLabel}${status.courseName ? ` • ${status.courseName}` : ""}${status.teeName ? ` • ${status.teeName}` : ""}${status.roundDate ? ` • ${status.roundDate}` : ""}`} actions={<>
        <TripDetailButton tripId={status.tripId} onBeforeNavigate={confirmIfNeeded} />
        <button type="button" style={buttonStyle} onClick={() => void navigateIfConfirmed(`/rounds/${status.roundId}/results`)}>Results</button>
        <button type="button" style={primaryButtonStyle} onClick={() => void loadPage(status.roundId)}>Refresh</button>
      </>} />
      <RoundProgressBar roundId={status.roundId} currentStep="scoring" format={status.format} finalized={status.finalized} />
      {viewOnlyMode ? <div style={warningBoxStyle}>Scores are shown in read-only mode. Use Edit Corrections from Round Results if you need to make post-finalization changes.</div> : roundLockedByCompleteTrip ? <div style={warningBoxStyle}>Event is complete and locked. Enter Correction Mode from Event Detail before changing scores or tees.</div> : status.finalized ? <div style={warningBoxStyle}>{tripCorrectionMode ? "Correction Mode is enabled. Changes will recalculate round results, standings, and payouts." : "This round is finalized. Saved changes will be treated as score corrections."}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      <RoundScoringActionPanel location="top" {...actionProps} />
      {isScramble ? (
        <RoundScrambleScoringSection scrambleGameLabel={scrambleGameLabel} scrambleModeLabel={scrambleModeLabel} scrambleEntryMode={scrambleEntryMode} scrambleRows={scrambleRows} headerHoles={headerHoles} saving={saving} finalizing={finalizing} scoringReadOnly={scoringReadOnly} finalized={status.finalized} updateScrambleMode={updateScrambleMode} updateScrambleTotal={updateScrambleTotal} setInputRef={setInputRef} handleScrambleHoleChange={handleScrambleHoleChange} handleHoleKeyDown={handleHoleKeyDown} />
      ) : (
        <RoundPlayerScoringSection rows={rows} headerHoles={headerHoles} frontNineParTotal={frontNineParTotal} backNineParTotal={backNineParTotal} totalParTotal={totalParTotal} teeOptions={teeOptions} defaultRoundTeeId={defaultRoundTeeId} saving={saving} finalizing={finalizing} scoringReadOnly={scoringReadOnly} setInputRef={setInputRef} updateTee={updateTee} updateWithdrawalStatus={updateWithdrawalStatus} markRowWithdrawn={markRowWithdrawn} handlePlayerHoleChange={handlePlayerHoleChange} handleHoleKeyDown={handleHoleKeyDown} />
      )}
      <RoundScoringActionPanel location="bottom" {...actionProps} />
      {status.finalized && <RoundCorrectionHistoryPanel roundId={status.roundId} />}
    </div>
  );
}
