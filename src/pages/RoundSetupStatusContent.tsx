import { useNavigate } from "react-router-dom";
import { buttonStyle, primaryButtonStyle, sectionStyle, warningBoxStyle } from "../styles/uiStyles";
import RoundReadinessPanel from "../components/round/RoundReadinessPanel";
import { formatRoundSetupDate, formatRoundSetupFormat } from "./roundSetupStatusLogic";
import type { useRoundSetupStatusController } from "./useRoundSetupStatusController";

// Reuse the controller's domain types so this presentation stays in sync.
type Controller = ReturnType<typeof useRoundSetupStatusController>;
type Props = {
  round: NonNullable<Controller["round"]>;
  readiness: NonNullable<Controller["readiness"]>;
  summary: NonNullable<Controller["summary"]>;
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "220px 1fr", gap: "10px 16px",
  alignItems: "center", marginTop: "12px",
};
const summaryLabelStyle: React.CSSProperties = { fontWeight: 700 };
const buttonRowStyle: React.CSSProperties = {
  display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px",
};
const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle, color: "#888", background: "#eee",
  border: "1px solid #c7ccd1", cursor: "not-allowed",
};
const localWarningBoxStyle: React.CSSProperties = { ...warningBoxStyle, marginTop: "12px" };

/** Read-only round information, readiness guidance, and workflow navigation. */
export default function RoundSetupStatusContent({ round, readiness, summary }: Props) {
  const navigate = useNavigate();
  const {
    totalPlayers, totalGroupedPlayers, totalTeamedPlayers,
    teamUnassignedCount, groupUnassignedCount, usesTeamAssignment,
    scramble, groupsReady, teamsReady, scoringReady, scoreEntryAction,
    groupsActionLabel, teamButtonLabel, derivedGroupsLabel,
  } = summary;

  return (
    <>
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Round Information</h2>

        <div style={summaryGridStyle}>
          <div style={summaryLabelStyle}>Course</div>
          <div>{round.courseName}</div>

          <div style={summaryLabelStyle}>Tee</div>
          <div>
            {round.teeName}
          </div>

          <div style={summaryLabelStyle}>Format</div>
          <div>{formatRoundSetupFormat(round.format)}</div>

          <div style={summaryLabelStyle}>Round Date</div>
          <div>{formatRoundSetupDate(round.roundDate)}</div>

          <div style={summaryLabelStyle}>Finalized</div>
          <div>{round.finalized ? "Yes" : "No"}</div>

          <div style={summaryLabelStyle}>Players</div>
          <div>{totalPlayers}</div>
        </div>
      </section>

      <RoundReadinessPanel readiness={readiness} />

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Format Notes</h2>

        {usesTeamAssignment ? (
          <div style={localWarningBoxStyle}>
            {scramble
              ? "For Scramble, teams are entered first. Each scramble team is also used as its tee-sheet group."
              : "For 2-Man Low Net, teams are entered first. Tee-sheet groups are built automatically from team order: Team 1 + Team 2 = Group 1, Team 3 + Team 4 = Group 2, and so on."}
          </div>
        ) : (
          <div style={localWarningBoxStyle}>
            For this format, the tee sheet groups are also the competition teams.
            Separate team assignment is not required.
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Setup Summary</h2>

        <div style={summaryGridStyle}>
          <div style={summaryLabelStyle}>Total Players</div>
          <div>{totalPlayers}</div>

          <div style={summaryLabelStyle}>Players Assigned to Groups</div>
          <div>{totalGroupedPlayers}</div>

          <div style={summaryLabelStyle}>Players Unassigned from Groups</div>
          <div>{groupUnassignedCount}</div>

          <div style={summaryLabelStyle}>Groups Complete</div>
          <div>{groupsReady ? "Yes" : "No"}</div>

          {usesTeamAssignment ? (
            <>
              <div style={summaryLabelStyle}>Players Assigned to Teams</div>
              <div>{totalTeamedPlayers}</div>

              <div style={summaryLabelStyle}>Players Unassigned from Teams</div>
              <div>{teamUnassignedCount}</div>

              <div style={summaryLabelStyle}>Teams Complete</div>
              <div>{teamsReady ? "Yes" : "No"}</div>
            </>
          ) : (
            <>
              <div style={summaryLabelStyle}>Team Assignment</div>
              <div>Derived from groups for this format</div>
            </>
          )}
        </div>

        <div style={buttonRowStyle}>
          {usesTeamAssignment ? (
            <>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => navigate(`/rounds/${round.roundId}/teams`)}
              >
                {teamButtonLabel}
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => navigate(`/rounds/${round.roundId}/groups`)}
              >
                {derivedGroupsLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(`/rounds/${round.roundId}/groups`)}
            >
              {groupsActionLabel}
            </button>
          )}

          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate(`/rounds/${round.roundId}/tee-sheet`)}
          >
            Tee Sheet
          </button>

          <button
            type="button"
            style={scoringReady ? primaryButtonStyle : disabledButtonStyle}
            onClick={() => {
              if (!scoringReady && !round.finalized) {
                return;
              }
              navigate(scoreEntryAction?.path ?? `/rounds/${round.roundId}/scoring`);
            }}
            disabled={!scoringReady && !round.finalized}
          >
            {scoreEntryAction?.label ?? "Scoring"}
          </button>
        </div>
      </section>
    </>
  );
}
