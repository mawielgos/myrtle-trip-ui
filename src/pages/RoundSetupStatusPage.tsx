import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoundSetupStatus } from "../api/roundSetupApi";
import type { RoundSetupStatusResponse } from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import PageHeader from "../components/common/PageHeader";
import { formatGameDescription } from "../utils/gameFormat";
import TripDetailButton from "../components/common/TripDetailButton";
import RoundReadinessPanel from "../components/round/RoundReadinessPanel";
import { buildScoreEntryAction, getGroupsActionLabel, getTeamsActionLabel } from "../utils/roundNavigation";
import {
  roundHasScrambleEvent,
  roundHasTwoManLowNetEvent,
  roundRequiresTeams,
} from "../utils/roundEventCapabilities";

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function formatLabel(format: string | undefined | null): string {
  return formatGameDescription(format);
}

function formatRoundDate(value: string | undefined | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "220px 1fr",
  gap: "10px 16px",
  alignItems: "center",
  marginTop: "12px",
};

const summaryLabelStyle: React.CSSProperties = {
  fontWeight: 700,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  color: "#888",
  background: "#eee",
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};

const localWarningBoxStyle: React.CSSProperties = {
  ...warningBoxStyle,
  marginTop: "12px",
};

export default function RoundSetupStatusPage() {
  const navigate = useNavigate();
  const { roundId } = useParams<{ roundId: string }>();

  const [data, setData] = useState<RoundSetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getRoundSetupStatus(Number(roundId));
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load round setup status.");
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [roundId]);

  const round = data?.round;
  const readiness = data?.readiness;
  const groups = data?.groups;
  const teamAssignment = data?.teamAssignment;

  const roundPlayers = safeArray(round?.players);
  const groupList = safeArray(groups?.groups);
  const teamList = safeArray(teamAssignment?.teams);
  const teamUnassignedPlayers = safeArray(teamAssignment?.unassignedPlayers);
  const totalPlayers = roundPlayers.length;
  const usesTeamAssignment = roundRequiresTeams(readiness, round?.format);
  const scramble = roundHasScrambleEvent(readiness, round?.format);
  const twoManLowNet = roundHasTwoManLowNetEvent(readiness, round?.format);

  const totalGroupedPlayers = useMemo(() => {
    return groupList.reduce((sum, group) => sum + safeArray(group.players).length, 0);
  }, [groupList]);

  const totalTeamedPlayers = useMemo(() => {
    return teamList.reduce((sum, team) => sum + safeArray(team.players).length, 0);
  }, [teamList]);

  const groupUnassignedCount = Math.max(totalPlayers - totalGroupedPlayers, 0);
  const groupsReady = totalPlayers > 0 && groupUnassignedCount === 0;
  const teamsReady = usesTeamAssignment
    ? totalPlayers > 0 && teamUnassignedPlayers.length === 0
    : groupsReady;

  const scoringReady = Boolean(readiness?.ready ?? readiness?.readyForScoring) && !round?.finalized;
  const scoreEntryAction = round ? buildScoreEntryAction(round.roundId, round) : null;
  const groupsActionLabel = getGroupsActionLabel(round);
  const teamsActionLabel = getTeamsActionLabel(round);

  if (loading) {
    return <div style={{ padding: "16px" }}>Loading round setup...</div>;
  }

  if (error) {
    return (
      <div style={pageContainerMediumStyle}>
        <div style={errorBoxStyle}>{error}</div>
      </div>
    );
  }

  if (!data || !round || !readiness || !groups || !teamAssignment) {
    return (
      <div style={pageContainerMediumStyle}>
        <div style={errorBoxStyle}>Round setup data was not found.</div>
      </div>
    );
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Round Workflow"
        subtitle={`${round.courseName ?? "Course not selected"} • ${formatRoundDate(round.roundDate)} • ${formatLabel(round.format)}`}
        actions={
          <>
            {round.tripId ? <TripDetailButton tripId={round.tripId} /> : null}
            <button
              style={primaryButtonStyle}
              type="button"
              onClick={() => navigate(`/rounds/${round.roundId}/open`)}
            >
              Continue
            </button>
          </>
        }
      />

      <RoundProgressBar
        roundId={round.roundId}
        currentStep="setup"
        format={round.format}
        finalized={round.finalized}
      />

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
          <div>{formatLabel(round.format)}</div>

          <div style={summaryLabelStyle}>Round Date</div>
          <div>{formatRoundDate(round.roundDate)}</div>

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
              <div>{teamUnassignedPlayers.length}</div>

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
                {scramble && teamsReady && !round.finalized && !round.tripLocked ? "Edit Scramble Teams" : teamsActionLabel}
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => navigate(`/rounds/${round.roundId}/groups`)}
              >
                {round?.finalized || round?.tripLocked
                  ? "View Derived Groups"
                  : twoManLowNet || scramble
                    ? "Set Tee Times / Derived Groups"
                    : "Derived Groups"}
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
    </div>
  );
}