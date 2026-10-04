import React from "react";
import { buttonStyle, primaryButtonStyle } from "../../../styles/uiStyles";
import { actionHintStyle, disabledButtonStyle, scoreActionPanelStyle, stickyTopActionPanelStyle, topButtonRowStyle } from "./roundScoringViewStyles";

type Props = {
  location: "top" | "bottom"; scoringReadOnly: boolean; finalized: boolean; canFinalize: boolean;
  hasIncompleteScorecards: boolean; isScramble: boolean; readinessBlocksScoring: boolean; showSaveButton: boolean;
  saveDisabled: boolean; saveButtonLabel: string; saving: boolean; refreshHandicapsDisabled: boolean; refreshingHandicaps: boolean;
  hasChanges: boolean; finalizeDisabled: boolean; finalizing: boolean;
  handleSaveScores: () => Promise<void>; handleRefreshHandicaps: () => Promise<void>; handleFinalizeRound: () => Promise<void>;
};

export default function RoundScoringActionPanel(props: Props) {
  const { location, scoringReadOnly, finalized, canFinalize, hasIncompleteScorecards, isScramble, readinessBlocksScoring, showSaveButton, saveDisabled, saveButtonLabel, saving, refreshHandicapsDisabled, refreshingHandicaps, hasChanges, finalizeDisabled, finalizing, handleSaveScores, handleRefreshHandicaps, handleFinalizeRound } = props;
  return (
    <section style={{ ...(location === "top" ? stickyTopActionPanelStyle : scoreActionPanelStyle), marginTop: location === "top" ? "0" : undefined, marginBottom: location === "top" ? "12px" : undefined }}>
      <div style={actionHintStyle}>
        {scoringReadOnly
          ? "Scores are being shown in view-only mode."
          : finalized
            ? "This round is finalized. Saved changes will be treated as score corrections."
            : canFinalize
              ? "All required scores are entered. This round is ready to finalize."
              : hasIncompleteScorecards
                ? isScramble
                  ? "Enter a score for every scramble team before finalizing."
                  : "Enter all required holes for every active player before finalizing. Mark mid-round withdrawals as WD after their last completed hole. The Total column shows partial scores for mid-round withdrawals, such as 58 (13h). For 4-Man 2-Low Net, holes after a WD use the lowest 2 net scores from the remaining eligible players."
                : readinessBlocksScoring
                  ? "Resolve the readiness items before finalizing this round."
                  : "Save score changes before finalizing."}
      </div>
      <div style={topButtonRowStyle}>
        {showSaveButton ? <button type="button" style={saveDisabled ? { ...primaryButtonStyle, ...disabledButtonStyle } : primaryButtonStyle} onClick={() => void handleSaveScores()} disabled={saveDisabled}>{saving ? "Saving..." : saveButtonLabel}</button> : null}
        {!finalized && !isScramble ? <button type="button" style={refreshHandicapsDisabled ? { ...buttonStyle, ...disabledButtonStyle } : buttonStyle} onClick={() => void handleRefreshHandicaps()} disabled={refreshHandicapsDisabled} title={hasChanges ? "Save or discard score changes before refreshing handicaps." : undefined}>{refreshingHandicaps ? "Refreshing..." : "Refresh Handicaps"}</button> : null}
        {!finalized ? <button type="button" style={finalizeDisabled ? { ...buttonStyle, ...disabledButtonStyle } : buttonStyle} onClick={() => void handleFinalizeRound()} disabled={finalizeDisabled}>{finalizing ? "Finalizing..." : "Finalize Round"}</button> : null}
      </div>
    </section>
  );
}
