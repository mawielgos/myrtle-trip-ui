import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getRoundStatus,
  getRoundTeamAssignmentPage,
  saveRoundTeams,
} from "../api/roundApi";
import type {
  RoundStatus,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeamPlayer,
  SaveRoundTeamsRequest,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const topButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1fr) minmax(420px, 1.4fr)",
  gap: "20px",
  alignItems: "start",
};

const teamCardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "12px",
  background: "#fafafa",
  marginBottom: "12px",
};

const mutedTextStyle: React.CSSProperties = {
  color: "#666",
};

const smallButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  height: "30px",
  padding: "0 10px",
  fontSize: "13px",
};

const disabledSmallButtonStyle: React.CSSProperties = {
  ...smallButtonStyle,
  color: "#888",
  background: "#eee",
  border: "1px solid #ccc",
  cursor: "not-allowed",
};

function cloneTeams(teams: RoundTeam[]): RoundTeam[] {
  return teams.map((team) => ({
    ...team,
    players: (team.players ?? []).map((player) => ({
      ...player,
      useAlternateTee: player.useAlternateTee ?? false,
    })),
  }));
}

function sortTeams(teams: RoundTeam[]): RoundTeam[] {
  return [...teams].sort((a, b) => {
    const aOrder = a.teamNumber ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.teamNumber ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function sortPlayers(players: RoundTeamPlayer[]): RoundTeamPlayer[] {
  return [...players].sort((a, b) => {
    const aOrder = a.playerOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.playerOrder ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.playerName.localeCompare(b.playerName);
  });
}

function buildDefaultTeams(playerCount: number): RoundTeam[] {
  if (playerCount <= 0) {
    return [];
  }

  const teamCount = Math.floor(playerCount / 2);
  const teams: RoundTeam[] = [];

  for (let i = 1; i <= teamCount; i += 1) {
    teams.push({
      roundTeamId: -i,
      teamNumber: i,
      teamName: `Team ${i}`,
      players: [],
    });
  }

  return teams;
}

export default function RoundTeamAssignmentPage() {
  const navigate = useNavigate();
  const { roundId } = useParams<{ roundId: string }>();

  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [teams, setTeams] = useState<RoundTeam[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<RoundTeamPlayer[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      if (!roundId) {
        setError("Missing round id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        const numericRoundId = Number(roundId);

        const [statusResponse, teamAssignmentResponse] = await Promise.all([
          getRoundStatus(numericRoundId),
          getRoundTeamAssignmentPage(numericRoundId),
        ]);

        setStatus(statusResponse);

        const response: RoundTeamAssignmentPageResponse = teamAssignmentResponse;

        const normalizedUnassignedPlayers = sortPlayers(
          (response.unassignedPlayers ?? []).map((player) => ({
            ...player,
            useAlternateTee: player.useAlternateTee ?? false,
          }))
        );

        const normalizedTeams =
          response.teams && response.teams.length > 0
            ? cloneTeams(sortTeams(response.teams))
            : buildDefaultTeams(
                statusResponse.players?.length ?? normalizedUnassignedPlayers.length
              );

        setTeams(normalizedTeams);
        setUnassignedPlayers(normalizedUnassignedPlayers);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load team assignment page."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [roundId]);

  function markDirty(): void {
    setDirty(true);
    setMessage(null);
    setError(null);
  }

  function updatePlayerAlternateTee(scorecardId: number, checked: boolean): void {
    markDirty();

    setTeams((prevTeams) =>
      prevTeams.map((team) => ({
        ...team,
        players: team.players.map((player) =>
          player.scorecardId === scorecardId
            ? { ...player, useAlternateTee: checked }
            : player
        ),
      }))
    );

    setUnassignedPlayers((prev) =>
      prev.map((player) =>
        player.scorecardId === scorecardId
          ? { ...player, useAlternateTee: checked }
          : player
      )
    );
  }

  function moveUnassignedPlayerToTeam(
    player: RoundTeamPlayer,
    roundTeamId: number
  ): void {
    markDirty();

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) {
          return team;
        }

        const alreadyExists = team.players.some(
          (existing) => existing.scorecardId === player.scorecardId
        );
        if (alreadyExists) {
          return team;
        }

        const nextPlayers = [
          ...team.players,
          {
            ...player,
            playerOrder: team.players.length + 1,
            useAlternateTee: player.useAlternateTee ?? false,
          },
        ];

        return {
          ...team,
          players: sortPlayers(nextPlayers),
        };
      })
    );

    setUnassignedPlayers((prev) =>
      prev.filter((p) => p.scorecardId !== player.scorecardId)
    );
  }

  function removePlayerFromTeam(scorecardId: number, roundTeamId: number): void {
    markDirty();

    const sourceTeam = teams.find((team) => team.roundTeamId === roundTeamId);
    const playerToRemove = sourceTeam?.players.find(
      (player) => player.scorecardId === scorecardId
    );

    if (!playerToRemove) {
      return;
    }

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) {
          return team;
        }

        const nextPlayers = team.players
          .filter((player) => player.scorecardId !== scorecardId)
          .map((player, index) => ({
            ...player,
            playerOrder: index + 1,
          }));

        return {
          ...team,
          players: nextPlayers,
        };
      })
    );

    setUnassignedPlayers((prev) =>
      sortPlayers([
        ...prev,
        {
          ...playerToRemove,
          playerOrder: null,
          useAlternateTee: playerToRemove.useAlternateTee ?? false,
        },
      ])
    );
  }

  function movePlayerWithinTeam(
    roundTeamId: number,
    scorecardId: number,
    direction: "up" | "down"
  ): void {
    markDirty();

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) {
          return team;
        }

        const index = team.players.findIndex(
          (player) => player.scorecardId === scorecardId
        );
        if (index === -1) {
          return team;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= team.players.length) {
          return team;
        }

        const nextPlayers = [...team.players];
        const temp = nextPlayers[index];
        nextPlayers[index] = nextPlayers[targetIndex];
        nextPlayers[targetIndex] = temp;

        return {
          ...team,
          players: nextPlayers.map((player, idx) => ({
            ...player,
            playerOrder: idx + 1,
          })),
        };
      })
    );
  }

  async function handleSave(): Promise<void> {
    if (!roundId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const payload: SaveRoundTeamsRequest = {
        teams: teams
          .filter((team) => team.players.length > 0)
          .map((team) => ({
            teamNumber: team.teamNumber ?? 0,
            teamName: team.teamName,
            players: team.players.map((player, index) => ({
              scorecardId: player.scorecardId,
              playerId: player.playerId,
              playerOrder: player.playerOrder ?? index + 1,
              useAlternateTee: player.useAlternateTee ?? false,
            })),
          })),
      };

      await saveRoundTeams(Number(roundId), payload);
      setDirty(false);
      setMessage("Team assignments saved.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save team assignments."
      );
    } finally {
      setSaving(false);
    }
  }

  const assignedCount = useMemo(
    () => teams.reduce((sum, team) => sum + team.players.length, 0),
    [teams]
  );

  const totalPlayers = assignedCount + unassignedPlayers.length;
  const alternateTeeLabel = status?.alternateTeeName
    ? `Alt Tee (${status.alternateTeeName})`
    : "Alt Tee";

  if (loading) {
    return (
      <div style={pageContainerMediumStyle}>
        <h1 style={{ marginTop: 0 }}>Round Team Assignment</h1>
        <div>Loading team assignment...</div>
      </div>
    );
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Round Team Assignment</h1>
          <div style={{ marginTop: "8px", color: "#555" }}>
            Round {roundId}
            {status?.courseName ? ` • ${status.courseName}` : ""}
            {status?.roundDate ? ` • ${status.roundDate}` : ""}
          </div>
          <div style={{ marginTop: "8px", color: "#555" }}>
            Assigned: {assignedCount} • Unassigned: {unassignedPlayers.length} • Total:{" "}
            {totalPlayers}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: dirty ? "#9a3412" : "#555",
              fontWeight: dirty ? 600 : 400,
            }}
          >
            {dirty ? "Unsaved changes" : "All changes saved"}
          </div>
        </div>

        <div style={topButtonRowStyle}>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate(`/rounds/${roundId}/scoring`)}
          >
            Go to Scoring
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => navigate(`/rounds/${roundId}/results`)}
          >
            View Results
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            title={dirty ? "Save current team assignments" : "No unsaved changes"}
          >
            {saving ? "Saving..." : dirty ? "Save Assignments" : "Saved"}
          </button>
        </div>
      </div>

      {status ? (
        <RoundProgressBar
          roundId={status.roundId}
          currentStep="teams"
          format={status.format}
          finalized={status.finalized}
        />
      ) : null}

      {dirty ? (
        <div style={warningBoxStyle}>
          You have unsaved team assignment changes. Save before leaving this page
          or going to scoring.
        </div>
      ) : null}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      <div style={twoColumnGridStyle}>
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Unassigned Players</h2>

          {unassignedPlayers.length === 0 ? (
            <div style={mutedTextStyle}>No unassigned players.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>{alternateTeeLabel}</th>
                  <th style={thStyle}>Assign To</th>
                </tr>
              </thead>
              <tbody>
                {unassignedPlayers.map((player) => (
                  <tr key={player.scorecardId}>
                    <td style={tdStyle}>{player.playerName}</td>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={player.useAlternateTee ?? false}
                        onChange={(event) =>
                          updatePlayerAlternateTee(
                            player.scorecardId,
                            event.target.checked
                          )
                        }
                      />
                    </td>
                    <td style={tdStyle}>
                      <div style={topButtonRowStyle}>
                        {teams.map((team) => (
                          <button
                            key={team.roundTeamId}
                            type="button"
                            style={smallButtonStyle}
                            onClick={() =>
                              moveUnassignedPlayerToTeam(player, team.roundTeamId)
                            }
                          >
                            {team.teamName}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Teams</h2>

          {teams.length === 0 ? (
            <div style={mutedTextStyle}>No teams found.</div>
          ) : (
            sortTeams(teams).map((team) => (
              <div key={team.roundTeamId} style={teamCardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{team.teamName}</strong>
                  <span style={{ color: "#666", fontSize: "13px" }}>
                    Team ID: {team.roundTeamId}
                    {team.teamNumber != null ? ` • Team #: ${team.teamNumber}` : ""}
                  </span>
                </div>

                {team.players.length === 0 ? (
                  <div style={mutedTextStyle}>No players assigned.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Order</th>
                        <th style={thStyle}>Player</th>
                        <th style={thStyle}>{alternateTeeLabel}</th>
                        <th style={thStyle}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortPlayers(team.players).map((player, index) => (
                        <tr key={player.scorecardId}>
                          <td style={tdStyle}>{index + 1}</td>
                          <td style={tdStyle}>{player.playerName}</td>
                          <td style={tdStyle}>
                            <input
                              type="checkbox"
                              checked={player.useAlternateTee ?? false}
                              onChange={(event) =>
                                updatePlayerAlternateTee(
                                  player.scorecardId,
                                  event.target.checked
                                )
                              }
                            />
                          </td>
                          <td style={tdStyle}>
                            <div style={topButtonRowStyle}>
                              <button
                                type="button"
                                style={index === 0 ? disabledSmallButtonStyle : smallButtonStyle}
                                onClick={() =>
                                  movePlayerWithinTeam(
                                    team.roundTeamId,
                                    player.scorecardId,
                                    "up"
                                  )
                                }
                                disabled={index === 0}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                style={
                                  index === team.players.length - 1
                                    ? disabledSmallButtonStyle
                                    : smallButtonStyle
                                }
                                onClick={() =>
                                  movePlayerWithinTeam(
                                    team.roundTeamId,
                                    player.scorecardId,
                                    "down"
                                  )
                                }
                                disabled={index === team.players.length - 1}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                style={smallButtonStyle}
                                onClick={() =>
                                  removePlayerFromTeam(
                                    player.scorecardId,
                                    team.roundTeamId
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}