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
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function isTwoManFormat(format: string | undefined | null): boolean {
  return format === "TWO_MAN_LOW_NET";
}

function formatLabel(format: string | undefined | null): string {
  switch (format) {
    case "MIDDLE_MAN":
      return "4-Man Middle Man";
    case "ONE_TWO_THREE":
      return "4-Man 1-2-3";
    case "TWO_MAN_LOW_NET":
      return "2-Man Low Net";
    case "THREE_LOW_NET":
      return "4-Man 3 Low Net";
    case "TEAM_SCRAMBLE":
      return "4-Man Scramble";
    default:
      return format ?? "";
  }
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

const listStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  paddingLeft: "20px",
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
  border: "1px solid #ccc",
  cursor: "not-allowed",
};

const dangerBoxStyle: React.CSSProperties = {
  ...errorBoxStyle,
  marginTop: "12px",
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
  const blockingIssues = safeArray(readiness?.blockingIssues);
  const warnings = safeArray(readiness?.warnings);

  const totalPlayers = roundPlayers.length;
  const twoMan = isTwoManFormat(round?.format);

  const totalGroupedPlayers = useMemo(() => {
    return groupList.reduce((sum, group) => sum + safeArray(group.players).length, 0);
  }, [groupList]);

  const totalTeamedPlayers = useMemo(() => {
    return teamList.reduce((sum, team) => sum + safeArray(team.players).length, 0);
  }, [teamList]);

  const groupUnassignedCount = Math.max(totalPlayers - totalGroupedPlayers, 0);
  const groupsReady = totalPlayers > 0 && groupUnassignedCount === 0;
  const teamsReady = twoMan
    ? totalPlayers > 0 && teamUnassignedPlayers.length === 0
    : groupsReady;

  const scoringReady = twoMan
    ? Boolean(readiness?.ready) && !round?.finalized
    : groupsReady && !round?.finalized;

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>Round Setup</h1>
        <div>
          <strong>Round ID:</strong> {round.roundId}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => navigate(`/rounds/${round.roundId}/open`)}
        >
          Continue
        </button>
      </div>

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
            {round.alternateTeeName ? ` / ${round.alternateTeeName}` : ""}
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

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Readiness</h2>

        <div>
          <strong>Status:</strong> {readiness.ready ? "Ready" : "Not Ready"}
        </div>

        {readiness.ready ? (
          <div style={successBoxStyle}>This round is ready to move into scoring.</div>
        ) : null}

        {twoMan ? (
          <div style={localWarningBoxStyle}>
            For 2-Man Low Net, teams are entered first. Tee-sheet groups are built
            automatically from team order: Team 1 + Team 2 = Group 1, Team 3 + Team 4 = Group 2, and so on.
          </div>
        ) : (
          <div style={localWarningBoxStyle}>
            For this format, the tee sheet groups are also the competition teams.
            Separate team assignment is not required.
          </div>
        )}

        {blockingIssues.length > 0 ? (
          <div style={dangerBoxStyle}>
            <strong>Blocking Issues</strong>
            <ul style={listStyle}>
              {blockingIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div style={localWarningBoxStyle}>
            <strong>Warnings</strong>
            <ul style={listStyle}>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
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

          {twoMan ? (
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
          {twoMan ? (
            <>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => navigate(`/rounds/${round.roundId}/teams`)}
              >
                Edit Teams
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => navigate(`/rounds/${round.roundId}/groups`)}
              >
                View Derived Groups
              </button>
            </>
          ) : (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => navigate(`/rounds/${round.roundId}/groups`)}
            >
              Edit Groups
            </button>
          )}

          <button
            type="button"
            style={scoringReady ? primaryButtonStyle : disabledButtonStyle}
            onClick={() => {
              if (!scoringReady) {
                return;
              }
              navigate(`/rounds/${round.roundId}/scoring`);
            }}
            disabled={!scoringReady}
          >
            Go to Scoring
          </button>
        </div>
      </section>
    </div>
  );
}