import { useEffect, useState } from "react";
import type {
  RoundTeam,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
} from "../../types/round";
import {
  buttonStyle,
  formInputStyle,
  formSelectStyle,
} from "../../styles/uiStyles";
import {
  getActiveExceptionForTeam,
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

const inlineFieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "8px",
  alignItems: "end",
};

const exceptionCardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "10px",
  background: "#fff",
  marginTop: "8px",
};

type GhostCandidate = RoundTeamPlayer & { sourceTeamName: string };

type Props = {
  team: RoundTeam;
  teams: RoundTeam[];
  teamExceptions: RoundTeamExceptionResponse[];
  expectedTeamSize: number;
  teamStructureLocked: boolean;
  hasScrambleEvent: boolean;
  saving: boolean;
  onSaveGhost: (
    team: RoundTeam,
    ghostPlayerIdValue: string,
    indexMinValue: string,
    indexMaxValue: string,
  ) => Promise<void>;
  onSaveRotation: (team: RoundTeam) => Promise<void>;
  onDelete: (exceptionId: number) => Promise<void>;
};

function GhostPlayerExceptionEditor({
  team,
  existingGhost,
  ghostCandidates,
  saving,
  onSave,
  onDelete,
}: {
  team: RoundTeam;
  existingGhost: RoundTeamExceptionResponse | null;
  ghostCandidates: GhostCandidate[];
  saving: boolean;
  onSave: Props["onSaveGhost"];
  onDelete: Props["onDelete"];
}) {
  const [ghostPlayerIdValue, setGhostPlayerIdValue] = useState(
    existingGhost?.ghostPlayerId == null
      ? ""
      : String(existingGhost.ghostPlayerId),
  );
  const [indexMinValue, setIndexMinValue] = useState(
    existingGhost?.indexMin == null ? "" : String(existingGhost.indexMin),
  );
  const [indexMaxValue, setIndexMaxValue] = useState(
    existingGhost?.indexMax == null ? "" : String(existingGhost.indexMax),
  );

  useEffect(() => {
    setGhostPlayerIdValue(
      existingGhost?.ghostPlayerId == null
        ? ""
        : String(existingGhost.ghostPlayerId),
    );
    setIndexMinValue(
      existingGhost?.indexMin == null ? "" : String(existingGhost.indexMin),
    );
    setIndexMaxValue(
      existingGhost?.indexMax == null ? "" : String(existingGhost.indexMax),
    );
  }, [
    existingGhost?.ghostPlayerId,
    existingGhost?.indexMin,
    existingGhost?.indexMax,
  ]);

  return (
    <div style={exceptionCardStyle}>
      <div style={{ fontWeight: 700 }}>Short 4-Man Team</div>
      <div style={{ ...mutedTextStyle, fontSize: "13px", marginTop: "4px" }}>
        Select one ghost player from another team. A real player can only be a
        ghost for one team in this round.
      </div>
      <div style={{ ...inlineFieldGridStyle, marginTop: "8px" }}>
        <label>
          <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}>
            Ghost Player
          </div>
          <select
            value={ghostPlayerIdValue}
            onChange={(event) => setGhostPlayerIdValue(event.target.value)}
            style={formSelectStyle}
            disabled={saving || team.roundTeamId < 1}
          >
            <option value="">Select player</option>
            {existingGhost?.ghostPlayerId &&
            !ghostCandidates.some(
              (player) => player.playerId === existingGhost.ghostPlayerId,
            ) ? (
              <option value={existingGhost.ghostPlayerId}>
                {existingGhost.ghostPlayerName ?? "Current ghost player"}
              </option>
            ) : null}
            {ghostCandidates.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {player.playerName} — {player.sourceTeamName} — Index{" "}
                {player.tripIndex == null
                  ? "—"
                  : Number(player.tripIndex).toFixed(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}>
            Index Min
          </div>
          <input
            value={indexMinValue}
            onChange={(event) => setIndexMinValue(event.target.value)}
            style={formInputStyle}
            disabled={saving || team.roundTeamId < 1}
            placeholder="Optional"
          />
        </label>
        <label>
          <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}>
            Index Max
          </div>
          <input
            value={indexMaxValue}
            onChange={(event) => setIndexMaxValue(event.target.value)}
            style={formInputStyle}
            disabled={saving || team.roundTeamId < 1}
            placeholder="Optional"
          />
        </label>
      </div>
      {existingGhost ? (
        <div style={{ marginTop: "8px", fontSize: "13px" }}>
          <strong>Configured:</strong> {existingGhost.ghostPlayerName} from{" "}
          {existingGhost.ghostSourceTeamName ?? "another team"}
        </div>
      ) : null}
      <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          style={buttonStyle}
          disabled={saving || team.roundTeamId < 1}
          onClick={() =>
            void onSave(team, ghostPlayerIdValue, indexMinValue, indexMaxValue)
          }
        >
          {existingGhost ? "Update Ghost" : "Save Ghost"}
        </button>
        {existingGhost ? (
          <button
            type="button"
            style={smallButtonStyle}
            disabled={saving}
            onClick={() => void onDelete(existingGhost.id)}
          >
            Remove
          </button>
        ) : null}
      </div>
      {team.roundTeamId < 1 ? (
        <div style={{ color: "#9a3412", fontSize: "12px", marginTop: "6px" }}>
          Save assignments before configuring this exception.
        </div>
      ) : null}
    </div>
  );
}

export default function RoundTeamAssignmentExceptionControl({
  team,
  teams,
  teamExceptions,
  expectedTeamSize,
  teamStructureLocked,
  hasScrambleEvent,
  saving,
  onSaveGhost,
  onSaveRotation,
  onDelete,
}: Props) {
  const playerCount = team.players?.length ?? 0;
  if (expectedTeamSize !== 4 || playerCount !== 3 || teamStructureLocked) {
    return null;
  }

  const existingGhost = getActiveExceptionForTeam(
    teamExceptions,
    team.roundTeamId,
    "GHOST_PLAYER",
  );
  const existingRotation = getActiveExceptionForTeam(
    teamExceptions,
    team.roundTeamId,
    "EXTRA_SHOT_ROTATION",
  );

  if (hasScrambleEvent) {
    return (
      <div style={exceptionCardStyle}>
        <div style={{ fontWeight: 700 }}>Short Scramble Team</div>
        <div style={{ ...mutedTextStyle, fontSize: "13px", marginTop: "4px" }}>
          This threesome needs an extra-shot rotation. Twosomes are not allowed;
          move a player from a foursome instead.
        </div>
        {existingRotation ? (
          <div style={{ marginTop: "8px", fontSize: "13px" }}>
            <strong>Configured:</strong> {existingRotation.rotationPattern}
          </div>
        ) : null}
        <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            style={buttonStyle}
            disabled={saving || team.roundTeamId < 1}
            onClick={() => void onSaveRotation(team)}
          >
            {existingRotation ? "Refresh Rotation" : "Configure Rotation"}
          </button>
          {existingRotation ? (
            <button
              type="button"
              style={smallButtonStyle}
              disabled={saving}
              onClick={() => void onDelete(existingRotation.id)}
            >
              Remove
            </button>
          ) : null}
        </div>
        {team.roundTeamId < 1 ? (
          <div style={{ color: "#9a3412", fontSize: "12px", marginTop: "6px" }}>
            Save assignments before configuring this exception.
          </div>
        ) : null}
      </div>
    );
  }

  const ghostCandidates = sortTeams(teams)
    .filter((candidateTeam) => candidateTeam.roundTeamId !== team.roundTeamId)
    .flatMap((candidateTeam) =>
      sortPlayers(candidateTeam.players).map((player) => ({
        ...player,
        sourceTeamName: candidateTeam.teamName,
      })),
    )
    .filter(
      (player) =>
        !teamExceptions.some(
          (exception) =>
            exception.active !== false &&
            exception.exceptionType === "GHOST_PLAYER" &&
            exception.ghostPlayerId === player.playerId &&
            exception.roundTeamId !== team.roundTeamId,
        ),
    );

  return (
    <GhostPlayerExceptionEditor
      team={team}
      existingGhost={existingGhost}
      ghostCandidates={ghostCandidates}
      saving={saving}
      onSave={onSaveGhost}
      onDelete={onDelete}
    />
  );
}
