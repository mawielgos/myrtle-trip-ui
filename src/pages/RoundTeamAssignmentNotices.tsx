import type { ReactNode } from "react";
import { buttonStyle, errorBoxStyle, primaryButtonStyle, successBoxStyle, warningBoxStyle } from "../styles/uiStyles";

/** Presentation-only status and safety notices for the assignment workflow. */
export default function RoundTeamAssignmentNotices({
  usesDerivedTeeSheetGroups, hasScrambleEvent, derivedGroupsButtonLabel,
  shortFourManTeamsNeedingExceptionCount, shortFourManTeamsCount,
  tripIsLocked, isFinalizedRound, dirty, scrambleConfigDirty,
  confirmSuggestTeams, applySuggestedScrambleTeams, cancelSuggestTeams,
  saving, message, error,
}: {
  usesDerivedTeeSheetGroups: boolean;
  hasScrambleEvent: boolean;
  derivedGroupsButtonLabel: string;
  shortFourManTeamsNeedingExceptionCount: number;
  shortFourManTeamsCount: number;
  tripIsLocked: boolean;
  isFinalizedRound: boolean;
  dirty: boolean;
  scrambleConfigDirty: boolean;
  confirmSuggestTeams: boolean;
  applySuggestedScrambleTeams: () => void;
  cancelSuggestTeams: () => void;
  saving: boolean;
  message: ReactNode;
  error: ReactNode;
}) {
  return (
    <>
      {usesDerivedTeeSheetGroups ? (
        <div style={warningBoxStyle}>
          {hasScrambleEvent
            ? "Scramble teams define the competition teams. Tee times and starting holes are managed from derived tee-sheet groups."
            : "2-Man teams define the competition teams. Tee times and starting holes are managed from derived tee-sheet groups."}{" "}
          Use <strong>{derivedGroupsButtonLabel}</strong> after suggesting or
          editing teams to generate or adjust tee times before scoring.
        </div>
      ) : null}

      {shortFourManTeamsNeedingExceptionCount > 0 ? (
        <div style={warningBoxStyle}>
          One or more 4-man teams have only 3 players. Configure a valid
          short-team exception below: ghost player for 4-Man 2-Low Net, or
          extra-shot rotation for Scramble.
        </div>
      ) : shortFourManTeamsCount > 0 ? (
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
              onClick={cancelSuggestTeams}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

    </>
  );
}
