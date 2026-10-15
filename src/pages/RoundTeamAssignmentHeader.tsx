import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import { buttonStyle, primaryButtonStyle } from "../styles/uiStyles";

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

type Props = {
  roundId: string | undefined;
  eventRoundLabel: string;
  formatLabel: string | null;
  courseName: string | null | undefined;
  roundDate: string | null | undefined;
  tripId: number | null | undefined;
  assignedCount: number;
  unassignedCount: number;
  totalPlayers: number;
  inactiveCount: number;
  teamCount: number;
  expectedTeamCount: number;
  expectedTeamSize: number;
  hasScrambleEvent: boolean;
  seedingLabel: string | null | undefined;
  dirty: boolean;
  scrambleConfigDirty: boolean;
  canSuggestTeamAssignments: boolean;
  saving: boolean;
  usesDerivedTeeSheetGroups: boolean;
  derivedGroupsButtonLabel: string;
  isReadyForScoring: boolean;
  scoringBlockedReason: string | null | undefined;
  tripIsLocked: boolean;
  saveButtonLabel: string;
  onBeforeNavigate: () => Promise<boolean>;
  onSuggestTeams: () => void;
  onOpenDerivedGroups: () => Promise<void>;
  onNavigate: (path: string) => Promise<void>;
  onScoringBlocked: (message: string) => void;
  onSave: () => Promise<unknown>;
};

export default function RoundTeamAssignmentHeader({
  roundId,
  eventRoundLabel,
  formatLabel,
  courseName,
  roundDate,
  tripId,
  assignedCount,
  unassignedCount,
  totalPlayers,
  inactiveCount,
  teamCount,
  expectedTeamCount,
  expectedTeamSize,
  hasScrambleEvent,
  seedingLabel,
  dirty,
  scrambleConfigDirty,
  canSuggestTeamAssignments,
  saving,
  usesDerivedTeeSheetGroups,
  derivedGroupsButtonLabel,
  isReadyForScoring,
  scoringBlockedReason,
  tripIsLocked,
  saveButtonLabel,
  onBeforeNavigate,
  onSuggestTeams,
  onOpenDerivedGroups,
  onNavigate,
  onScoringBlocked,
  onSave,
}: Props) {
  return (
      <PageHeader
        title="Round Team Assignment"
        subtitle={
          <>
            <div>
              {eventRoundLabel}
              {formatLabel
                ? ` • ${formatLabel}`
                : ""}
              {courseName ? ` • ${courseName}` : ""}
              {roundDate ? ` • ${roundDate}` : ""}
            </div>
            <div style={{ marginTop: "6px" }}>
              Assigned: {assignedCount} • Unassigned: {unassignedCount}{" "}
              • Total Active: {totalPlayers} • Unavailable: {inactiveCount} •
              Teams: {teamCount}/{expectedTeamCount} • Max/team:{" "}
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
            {tripId ? (
              <TripDetailButton
                tripId={tripId}
                onBeforeNavigate={onBeforeNavigate}
              />
            ) : null}
            <WorkflowBackButton
              label="Back to Round Setup"
              to={`/rounds/${roundId}`}
              onBeforeNavigate={onBeforeNavigate}
            />
            {canSuggestTeamAssignments ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={() => onSuggestTeams()}
                disabled={saving || (hasScrambleEvent && scrambleConfigDirty)}
              >
                Suggest Teams
              </button>
            ) : null}
            {usesDerivedTeeSheetGroups ? (
              <button
                type="button"
                style={dirty ? primaryButtonStyle : buttonStyle}
                onClick={() => void onOpenDerivedGroups()}
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
                void onNavigate(`/rounds/${roundId}/tee-sheet`)
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
                  onScoringBlocked(scoringBlockedReason ?? "Round is not ready for scoring.");
                  return;
                }
                onNavigate(`/rounds/${roundId}/scoring`);
              }}
            >
              Continue to Scoring
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void onNavigate(`/rounds/${roundId}/results`)}
            >
              Results
            </button>
            {!tripIsLocked ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void onSave()}
                disabled={saving || !dirty}
              >
                {saveButtonLabel}
              </button>
            ) : null}
          </>
        }
      />
  );
}
