import type { ReactNode } from "react";
import type {
  RoundTeam,
  RoundTeamPlayer,
  RoundTeeOption,
} from "../../types/round";
import {
  buttonStyle,
  formSelectStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../../styles/uiStyles";
import {
  getEligibleSortedTeesForPlayer,
  getPlayerTeeId,
  getTeeDisplayForPlayer,
  normalizeGender,
  sortPlayers,
  sortTeams,
} from "../../pages/roundTeamAssignmentLogic";

const mutedTextStyle: React.CSSProperties = { color: "#666" };

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
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};

const compactSectionStyle: React.CSSProperties = {
  ...sectionStyle,
  overflowX: "auto",
};

const compactTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "760px",
};

const compactTeeSelectStyle: React.CSSProperties = {
  ...formSelectStyle,
  minWidth: "130px",
  height: "32px",
  fontSize: "13px",
};

const assignmentButtonWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

type ParticipationStatus = "ACTIVE" | "NO_SHOW" | "WITHDRAWN";

type Props = {
  teams: RoundTeam[];
  unassignedPlayers: RoundTeamPlayer[];
  inactivePlayers: RoundTeamPlayer[];
  teeOptions: RoundTeeOption[];
  defaultRoundTeeId: number | null;
  expectedTeamSize: number;
  teamStructureLocked: boolean;
  saving: boolean;
  isFinalizedRound: boolean;
  teeCorrectionsAllowed: boolean;
  tripIsLocked: boolean;
  updatePlayerTee: (scorecardId: number, roundTeeId: number) => void;
  movePlayerWithinTeam: (
    roundTeamId: number,
    scorecardId: number,
    direction: "up" | "down",
  ) => void;
  removePlayerFromTeam: (scorecardId: number, roundTeamId: number) => void;
  moveUnassignedPlayerToTeam: (
    player: RoundTeamPlayer,
    roundTeamId: number,
  ) => void;
  handleParticipationChange: (
    player: RoundTeamPlayer,
    participationStatus: ParticipationStatus,
  ) => Promise<void>;
  renderTeamExceptionControl: (team: RoundTeam) => ReactNode;
};

function formatParticipationStatus(status: string | null | undefined): string {
  if (status === "WITHDRAWN") return "Withdrawn";
  if (status === "NO_SHOW") return "No-Show";
  if (status === "ACTIVE") return "Active";
  return "Unavailable";
}

export default function RoundTeamAssignmentTables({
  teams,
  unassignedPlayers,
  inactivePlayers,
  teeOptions,
  defaultRoundTeeId,
  expectedTeamSize,
  teamStructureLocked,
  saving,
  isFinalizedRound,
  teeCorrectionsAllowed,
  tripIsLocked,
  updatePlayerTee,
  movePlayerWithinTeam,
  removePlayerFromTeam,
  moveUnassignedPlayerToTeam,
  handleParticipationChange,
  renderTeamExceptionControl,
}: Props) {
  function renderTeeControl(player: RoundTeamPlayer): ReactNode {
    const eligibleTees = getEligibleSortedTeesForPlayer(teeOptions, player);
    const selectedTeeId = getPlayerTeeId(player, defaultRoundTeeId);
    const selectedTeeIsEligible =
      selectedTeeId === "" ||
      eligibleTees.some((tee) => tee.roundTeeId === selectedTeeId);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <select
          value={selectedTeeIsEligible ? selectedTeeId : ""}
          onChange={(event) =>
            updatePlayerTee(player.scorecardId, Number(event.target.value))
          }
          style={compactTeeSelectStyle}
          disabled={
            saving ||
            teeOptions.length === 0 ||
            (isFinalizedRound && !teeCorrectionsAllowed) ||
            tripIsLocked
          }
        >
          {!selectedTeeIsEligible ? <option value="">Select tee</option> : null}
          {eligibleTees.map((tee) => (
            <option key={tee.roundTeeId} value={tee.roundTeeId}>
              {getTeeDisplayForPlayer(tee, player.gender)}
              {defaultRoundTeeId === tee.roundTeeId ? " (Men's Default)" : ""}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: "11px",
            color: player.teeOverride ? "#1d4ed8" : "#666",
          }}
        >
          {normalizeGender(player.gender)}
          {player.teeOverride ? " • Override" : " • Default"}
        </span>
      </div>
    );
  }

  function renderCompactPlayerRow(
    player: RoundTeamPlayer,
    team: RoundTeam | null,
    index: number | null,
  ): ReactNode {
    const canMoveUp = team != null && index != null && index > 0;
    const canMoveDown =
      team != null && index != null && index < (team.players?.length ?? 0) - 1;

    return (
      <tr key={`${team?.roundTeamId ?? "unassigned"}-${player.scorecardId}`}>
        <td style={tdStyle}>{team ? index! + 1 : "—"}</td>
        <td style={tdStyle}>
          <div style={{ fontWeight: 600 }}>{player.playerName}</div>
          <div style={{ fontSize: "11px", color: "#666" }}>
            Index: {player.tripIndex == null ? "—" : Number(player.tripIndex).toFixed(1)}
          </div>
        </td>
        <td style={tdStyle}>
          <div style={{ maxWidth: "170px" }}>{renderTeeControl(player)}</div>
        </td>
        <td style={tdStyle}>
          {team ? (
            <div style={assignmentButtonWrapStyle}>
              <button
                type="button"
                style={
                  teamStructureLocked || !canMoveUp
                    ? disabledSmallButtonStyle
                    : smallButtonStyle
                }
                onClick={() =>
                  movePlayerWithinTeam(team.roundTeamId, player.scorecardId, "up")
                }
                disabled={teamStructureLocked || !canMoveUp}
              >
                Up
              </button>
              <button
                type="button"
                style={
                  teamStructureLocked || !canMoveDown
                    ? disabledSmallButtonStyle
                    : smallButtonStyle
                }
                onClick={() =>
                  movePlayerWithinTeam(team.roundTeamId, player.scorecardId, "down")
                }
                disabled={teamStructureLocked || !canMoveDown}
              >
                Down
              </button>
              <button
                type="button"
                style={teamStructureLocked ? disabledSmallButtonStyle : smallButtonStyle}
                onClick={() => removePlayerFromTeam(player.scorecardId, team.roundTeamId)}
                disabled={teamStructureLocked}
              >
                Remove
              </button>
            </div>
          ) : (
            <div style={assignmentButtonWrapStyle}>
              {teams.map((targetTeam) => {
                const teamIsFull = targetTeam.players.length >= expectedTeamSize;
                return (
                  <button
                    key={targetTeam.roundTeamId}
                    type="button"
                    style={
                      teamStructureLocked || teamIsFull
                        ? disabledSmallButtonStyle
                        : smallButtonStyle
                    }
                    onClick={() =>
                      moveUnassignedPlayerToTeam(player, targetTeam.roundTeamId)
                    }
                    disabled={teamStructureLocked || teamIsFull}
                    title={teamIsFull ? `${targetTeam.teamName} is full` : undefined}
                  >
                    {targetTeam.teamName}
                  </button>
                );
              })}
              <button
                type="button"
                style={teamStructureLocked ? disabledSmallButtonStyle : smallButtonStyle}
                onClick={() => void handleParticipationChange(player, "NO_SHOW")}
                disabled={teamStructureLocked || saving}
                title="Player did not show up for this round"
              >
                No-Show
              </button>
              <button
                type="button"
                style={teamStructureLocked ? disabledSmallButtonStyle : smallButtonStyle}
                onClick={() => void handleParticipationChange(player, "WITHDRAWN")}
                disabled={teamStructureLocked || saving}
                title="Player withdrew/cancelled for this round"
              >
                Withdraw
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <section style={compactSectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "8px" }}>Unassigned Players</h2>
        <div style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}>
          Assign players with the team buttons. If a player cancelled or is a
          no-show for this round, mark them unavailable so readiness ignores them.
        </div>

        {unassignedPlayers.length === 0 ? (
          <div style={mutedTextStyle}>No unassigned players.</div>
        ) : (
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Tee</th>
                <th style={thStyle}>Assign To</th>
              </tr>
            </thead>
            <tbody>
              {unassignedPlayers.map((player) => renderCompactPlayerRow(player, null, null))}
            </tbody>
          </table>
        )}
      </section>

      {inactivePlayers.length > 0 ? (
        <section style={compactSectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "8px" }}>
            Unavailable / No-Shows / Withdrawals
          </h2>
          <div style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}>
            These players remain on the event roster but are ignored for this
            round's teams, groups, readiness, and scoring requirements.
          </div>
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inactivePlayers.map((player) => (
                <tr key={`inactive-${player.scorecardId}`}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{player.playerName}</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      Index: {player.tripIndex == null ? "—" : Number(player.tripIndex).toFixed(1)}
                    </div>
                  </td>
                  <td style={tdStyle}>{formatParticipationStatus(player.participationStatus)}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={teamStructureLocked ? disabledSmallButtonStyle : smallButtonStyle}
                      onClick={() => void handleParticipationChange(player, "ACTIVE")}
                      disabled={teamStructureLocked || saving}
                    >
                      Mark Active
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section style={compactSectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "8px" }}>Teams</h2>
        <div style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}>
          Compact assignment grid for larger trips. Use Up/Down to reorder within
          a team, Remove to move a player back to Unassigned, and Save when finished.
        </div>

        {teams.length === 0 ? (
          <div style={mutedTextStyle}>No teams found.</div>
        ) : (
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Team</th>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Tee</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortTeams(teams).flatMap((team) => {
                const sortedPlayers = sortPlayers(team.players);
                if (sortedPlayers.length === 0) {
                  return [
                    <tr key={`${team.roundTeamId}-empty`}>
                      <td style={tdStyle}>
                        <strong>{team.teamName}</strong>
                        <div style={{ color: "#666", fontSize: "11px" }}>
                          0/{expectedTeamSize} players
                        </div>
                      </td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle} colSpan={3}>No players assigned.</td>
                    </tr>,
                  ];
                }

                return sortedPlayers.map((player, index) => (
                  <tr key={`${team.roundTeamId}-${player.scorecardId}`}>
                    {index === 0 ? (
                      <td style={tdStyle} rowSpan={sortedPlayers.length}>
                        <strong>{team.teamName}</strong>
                        <div
                          style={{
                            color: team.players.length > expectedTeamSize ? "#b91c1c" : "#666",
                            fontSize: "11px",
                            fontWeight: team.players.length > expectedTeamSize ? 700 : 400,
                          }}
                        >
                          {team.players.length}/{expectedTeamSize} players
                        </div>
                        {renderTeamExceptionControl(team)}
                      </td>
                    ) : null}
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{player.playerName}</div>
                      <div style={{ fontSize: "11px", color: "#666" }}>
                        Index: {player.tripIndex == null ? "—" : Number(player.tripIndex).toFixed(1)}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ maxWidth: "170px" }}>{renderTeeControl(player)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={assignmentButtonWrapStyle}>
                        <button
                          type="button"
                          style={teamStructureLocked || index === 0 ? disabledSmallButtonStyle : smallButtonStyle}
                          onClick={() => movePlayerWithinTeam(team.roundTeamId, player.scorecardId, "up")}
                          disabled={teamStructureLocked || index === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          style={
                            teamStructureLocked || index === sortedPlayers.length - 1
                              ? disabledSmallButtonStyle
                              : smallButtonStyle
                          }
                          onClick={() => movePlayerWithinTeam(team.roundTeamId, player.scorecardId, "down")}
                          disabled={teamStructureLocked || index === sortedPlayers.length - 1}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          style={teamStructureLocked ? disabledSmallButtonStyle : smallButtonStyle}
                          onClick={() => removePlayerFromTeam(player.scorecardId, team.roundTeamId)}
                          disabled={teamStructureLocked}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
