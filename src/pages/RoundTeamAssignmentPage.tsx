import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getRoundReadiness,
  deleteRoundTeamException,
  getRoundStatus,
  getRoundTeamAssignmentPage,
  getRoundTeamExceptions,
  saveRoundScrambleSeeding,
  saveRoundTeamException,
  saveRoundTeams,
  saveRoundTeeCorrections,
  updateRoundScorecardParticipation,
} from "../api/roundApi";
import { getTripRounds } from "../api/tripApi";
import type {
  RoundCapabilities,
  RoundReadinessResponse,
  RoundStatus,
  RoundTeam,
  RoundTeamAssignmentPageResponse,
  RoundTeamExceptionResponse,
  RoundTeamPlayer,
  RoundScrambleSeedingRound,
  RoundTeeCorrectionRequest,
  RoundTeeOption,
  SaveRoundScrambleSeedingRequest,
  SaveRoundTeamsRequest,
} from "../types/round";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import RoundProgressBar from "../components/round/RoundProgressBar";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import WorkflowBackButton from "../components/common/WorkflowBackButton";
import RoundReadinessPanel from "../components/round/RoundReadinessPanel";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import {
  roundHasScrambleEvent,
  roundHasTwoManLowNetEvent,
} from "../utils/roundEventCapabilities";

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
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "12px",
  background: "#fafafa",
  marginBottom: "12px",
};

const mutedTextStyle: React.CSSProperties = { color: "#666" };

const configGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  alignItems: "end",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  padding: "6px 0",
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
  border: "1px solid #c7ccd1",
  cursor: "not-allowed",
};

const teeSelectStyle: React.CSSProperties = {
  ...formSelectStyle,
  minWidth: "150px",
  height: "32px",
  fontSize: "13px",
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
  ...teeSelectStyle,
  minWidth: "130px",
};

const assignmentButtonWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
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

function cloneTeams(teams: RoundTeam[]): RoundTeam[] {
  return teams.map((team) => ({
    ...team,
    players: (team.players ?? []).map((player) => ({ ...player })),
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
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.playerName.localeCompare(b.playerName);
  });
}

function getActiveExceptionForTeam(
  exceptions: RoundTeamExceptionResponse[],
  roundTeamId: number,
  exceptionType?: string,
): RoundTeamExceptionResponse | null {
  return (
    exceptions.find(
      (item) =>
        item.roundTeamId === roundTeamId &&
        item.active !== false &&
        (!exceptionType || item.exceptionType === exceptionType),
    ) ?? null
  );
}

function teamHasAllowedShortTeamException(
  team: RoundTeam,
  exceptions: RoundTeamExceptionResponse[],
  expectedTeamSize: number,
  hasScrambleEvent: boolean,
): boolean {
  const playerCount = team.players?.length ?? 0;
  if (expectedTeamSize !== 4 || playerCount !== 3) return false;
  const exceptionType = hasScrambleEvent
    ? "EXTRA_SHOT_ROTATION"
    : "GHOST_PLAYER";
  return (
    getActiveExceptionForTeam(exceptions, team.roundTeamId, exceptionType) !=
    null
  );
}

function buildPlayerDetailMap(
  page: RoundTeamAssignmentPageResponse,
): Map<number, RoundTeamPlayer> {
  const result = new Map<number, RoundTeamPlayer>();

  for (const team of page.teams ?? []) {
    for (const player of team.players ?? []) {
      result.set(player.scorecardId, player);
    }
  }

  for (const player of page.unassignedPlayers ?? []) {
    result.set(player.scorecardId, player);
  }

  for (const player of page.inactivePlayers ?? []) {
    result.set(player.scorecardId, player);
  }

  return result;
}

function mergeServerPlayerDetails(
  currentTeams: RoundTeam[],
  currentUnassignedPlayers: RoundTeamPlayer[],
  page: RoundTeamAssignmentPageResponse,
): { teams: RoundTeam[]; unassignedPlayers: RoundTeamPlayer[] } {
  const playerDetailMap = buildPlayerDetailMap(page);

  function mergePlayer(player: RoundTeamPlayer): RoundTeamPlayer {
    const serverPlayer = playerDetailMap.get(player.scorecardId);
    if (!serverPlayer) return { ...player };

    return {
      ...player,
      playerId: serverPlayer.playerId,
      playerName: serverPlayer.playerName,
      gender: serverPlayer.gender,
      tripIndex: serverPlayer.tripIndex,
      roundTeeId: serverPlayer.roundTeeId,
      roundTeeName: serverPlayer.roundTeeName,
      teeOverride: serverPlayer.teeOverride,
    };
  }

  return {
    teams: currentTeams.map((team) => ({
      ...team,
      players: (team.players ?? []).map(mergePlayer),
    })),
    unassignedPlayers: currentUnassignedPlayers.map(mergePlayer),
  };
}

function getRoundFormatLabel(
  format?: string | null,
  scrambleTeamSize?: number | null,
): string {
  switch (format) {
    case "MIDDLE_MAN":
      return "4-Man Middle Man";
    case "ONE_TWO_THREE":
      return "4-Man 1-2-3";
    case "TWO_MAN_LOW_NET":
    case "TEAM_TWO_MAN_LOW_NET":
      return "2-Man Low Net";
    case "TEAM_TWO_LOW_NET":
      return "4-Man 2-Low Net";
    case "THREE_LOW_NET":
    case "TEAM_THREE_LOW_NET":
      return "4-Man 3 Low Net";
    case "TEAM_SCRAMBLE":
      return `${scrambleTeamSize ?? 4}-Man Scramble`;
    case "STROKE_PLAY":
      return "Stroke Play";
    default:
      return format ? format.replace(/_/g, " ") : "";
  }
}

function getExpectedTeamSize(
  format?: string | null,
  scrambleTeamSize?: number | null,
): number {
  if (format === "TEAM_SCRAMBLE") {
    return scrambleTeamSize ?? 4;
  }
  if (format === "TWO_MAN_LOW_NET" || format === "TEAM_TWO_MAN_LOW_NET") {
    return 2;
  }

  return 4;
}

function formatRequiresExactTeams(format?: string | null): boolean {
  return (
    format === "MIDDLE_MAN" ||
    format === "ONE_TWO_THREE" ||
    format === "TWO_MAN_LOW_NET" ||
    format === "TEAM_TWO_MAN_LOW_NET" ||
    format === "THREE_LOW_NET" ||
    format === "TEAM_TWO_LOW_NET" ||
    format === "TEAM_THREE_LOW_NET" ||
    format === "TEAM_SCRAMBLE"
  );
}

function calculateLocalAssignmentsReady(
  teams: RoundTeam[],
  unassignedPlayers: RoundTeamPlayer[],
  format: string | null | undefined,
  expectedTeamSize = 4,
  exceptions: RoundTeamExceptionResponse[] = [],
  hasScrambleEvent = false,
): boolean {
  if ((unassignedPlayers?.length ?? 0) > 0) {
    return false;
  }

  const populatedTeams = (teams ?? []).filter(
    (team) => (team.players?.length ?? 0) > 0,
  );
  if (populatedTeams.length === 0) {
    return false;
  }

  if (formatRequiresExactTeams(format)) {
    return populatedTeams.every((team) => {
      const playerCount = team.players?.length ?? 0;
      return (
        playerCount === expectedTeamSize ||
        teamHasAllowedShortTeamException(
          team,
          exceptions,
          expectedTeamSize,
          hasScrambleEvent,
        )
      );
    });
  }

  return populatedTeams.every((team) => {
    const playerCount = team.players?.length ?? 0;
    return playerCount > 0 && playerCount <= 4;
  });
}

function buildDefaultTeams(
  playerCount: number,
  format?: string | null,
  scrambleTeamSize?: number | null,
): RoundTeam[] {
  const expectedTeamSize = getExpectedTeamSize(format, scrambleTeamSize);
  const teamCount = Math.max(1, Math.ceil(playerCount / expectedTeamSize));
  return Array.from({ length: teamCount }, (_, index) => ({
    roundTeamId: -(index + 1),
    teamNumber: index + 1,
    teamName: `Team ${index + 1}`,
    players: [],
  }));
}

function comparePlayersForSeeding(
  a: RoundTeamPlayer,
  b: RoundTeamPlayer,
): number {
  const aIndex = a.tripIndex;
  const bIndex = b.tripIndex;

  if (aIndex == null && bIndex == null) {
    return a.playerName.localeCompare(b.playerName);
  }
  if (aIndex == null) {
    return 1;
  }
  if (bIndex == null) {
    return -1;
  }

  const indexCompare = Number(aIndex) - Number(bIndex);
  if (indexCompare !== 0) {
    return indexCompare;
  }

  return a.playerName.localeCompare(b.playerName);
}

function buildSerpentineTeams(
  players: RoundTeamPlayer[],
  format?: string | null,
  scrambleTeamSize?: number | null,
): RoundTeam[] {
  const expectedTeamSize = getExpectedTeamSize(format, scrambleTeamSize);
  const sortedPlayers = [...players].sort(comparePlayersForSeeding);
  const teamCount = Math.max(
    1,
    Math.ceil(sortedPlayers.length / expectedTeamSize),
  );
  const nextTeams = buildDefaultTeams(
    sortedPlayers.length,
    format,
    scrambleTeamSize,
  );

  sortedPlayers.forEach((player, index) => {
    const rowNumber = Math.floor(index / teamCount);
    const columnNumber = index % teamCount;
    const teamIndex =
      rowNumber % 2 === 0 ? columnNumber : teamCount - 1 - columnNumber;
    const targetTeam = nextTeams[teamIndex];

    targetTeam.players.push({
      ...player,
      playerOrder: targetTeam.players.length + 1,
    });
  });

  return nextTeams.map((team) => ({
    ...team,
    players: [...team.players]
      .sort(comparePlayersForSeeding)
      .map((player, index) => ({ ...player, playerOrder: index + 1 })),
  }));
}

function getTeamCapacityLabel(
  format?: string | null,
  scrambleTeamSize?: number | null,
): string {
  const expectedTeamSize = getExpectedTeamSize(format, scrambleTeamSize);
  return expectedTeamSize === 1 ? "1 player" : `${expectedTeamSize} players`;
}

function normalizeGender(gender?: string | null): "M" | "F" {
  return gender?.trim().toUpperCase() === "F" ? "F" : "M";
}

function getTeeRatingForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): number {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === "F") return tee.womenCourseRating ?? -999;
  return tee.menCourseRating ?? -999;
}

function getTeeDisplayForPlayer(
  tee: RoundTeeOption,
  gender?: string | null,
): string {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === "F")
    return tee.displayNameForWomen || tee.displayName || tee.teeName;
  return tee.displayNameForMen || tee.displayName || tee.teeName;
}

function playerCanUseTee(
  player: RoundTeamPlayer,
  tee: RoundTeeOption,
): boolean {
  const gender = normalizeGender(player.gender);
  if (gender === "F") return tee.eligibleForWomen === true;
  return tee.eligibleForMen !== false;
}

function getEligibleSortedTeesForPlayer(
  teeOptions: RoundTeeOption[],
  player: RoundTeamPlayer,
): RoundTeeOption[] {
  return [...teeOptions]
    .filter((tee) => playerCanUseTee(player, tee))
    .sort((a, b) => {
      const ratingCompare =
        getTeeRatingForPlayer(b, player.gender) -
        getTeeRatingForPlayer(a, player.gender);
      if (ratingCompare !== 0) return ratingCompare;
      return (a.teeName || "").localeCompare(b.teeName || "");
    });
}

function getPlayerTeeId(
  player: RoundTeamPlayer,
  defaultRoundTeeId?: number | null,
): number | "" {
  return player.roundTeeId ?? defaultRoundTeeId ?? "";
}

function getScrambleSeedingMethodLabel(method?: string | null): string {
  switch (method) {
    case "AVERAGE_GROSS_SCORE":
      return "Average Gross";
    case "AVERAGE_NET_SCORE":
      return "Average Net";
    default:
      return "Current Handicap Index";
  }
}

function formatSeedingRoundLabel(round: RoundScrambleSeedingRound): string {
  const pieces: string[] = [];
  pieces.push(`Round ${round.roundNumber ?? "?"}`);
  if (round.roundDate) pieces.push(round.roundDate);
  if (round.courseName) pieces.push(round.courseName);
  if (round.format) pieces.push(getRoundFormatLabel(round.format));
  return pieces.join(" • ");
}

type GhostCandidate = RoundTeamPlayer & { sourceTeamName: string };

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
  onSave: (
    team: RoundTeam,
    ghostPlayerIdValue: string,
    indexMinValue: string,
    indexMaxValue: string,
  ) => Promise<void>;
  onDelete: (exceptionId: number) => Promise<void>;
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
          <div
            style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}
          >
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
          <div
            style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}
          >
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
          <div
            style={{ fontWeight: 600, fontSize: "12px", marginBottom: "3px" }}
          >
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
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
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

function formatEventRoundLabel(
  roundNumber?: number | null,
  fallbackRoundId?: number | null,
): string {
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) {
    return `Round ${roundNumber}`;
  }

  if (typeof fallbackRoundId === "number" && Number.isFinite(fallbackRoundId)) {
    return `Round ${fallbackRoundId}`;
  }

  return "Round";
}

async function loadEventRoundNumber(
  status: RoundStatus,
): Promise<number | null> {
  if (
    typeof status.roundNumber === "number" &&
    Number.isFinite(status.roundNumber)
  ) {
    return status.roundNumber;
  }

  if (status.tripId == null) {
    return null;
  }

  try {
    const rounds = await getTripRounds(status.tripId);
    const matchedRound = rounds.find(
      (round) => round.roundId === status.roundId,
    );
    return matchedRound?.roundNumber ?? null;
  } catch (err) {
    console.error(
      "Failed to load event round number for team assignment page",
      err,
    );
    return null;
  }
}

export default function RoundTeamAssignmentPage() {
  const navigate = useNavigate();
  const { roundId } = useParams<{ roundId: string }>();

  const [status, setStatus] = useState<RoundStatus | null>(null);
  const [eventRoundNumber, setEventRoundNumber] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<RoundReadinessResponse | null>(
    null,
  );
  const [capabilities, setCapabilities] = useState<RoundCapabilities | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [defaultRoundTeeId, setDefaultRoundTeeId] = useState<number | null>(
    null,
  );
  const [teeOptions, setTeeOptions] = useState<RoundTeeOption[]>([]);
  const [teams, setTeams] = useState<RoundTeam[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<RoundTeamPlayer[]>(
    [],
  );
  const [inactivePlayers, setInactivePlayers] = useState<RoundTeamPlayer[]>([]);
  const [teamExceptions, setTeamExceptions] = useState<
    RoundTeamExceptionResponse[]
  >([]);
  const [originalTeeByScorecardId, setOriginalTeeByScorecardId] = useState<
    Record<number, number>
  >({});
  const [seedingLabel, setSeedingLabel] = useState<string | null>(null);
  const [scrambleTeamSize, setScrambleTeamSize] = useState<number | null>(null);
  const [scrambleSeedingMethod, setScrambleSeedingMethod] = useState<string>(
    "CURRENT_HANDICAP_INDEX",
  );
  const [scrambleHandicapDate, setScrambleHandicapDate] = useState<string>("");
  const [scrambleSeedingRounds, setScrambleSeedingRounds] = useState<
    RoundScrambleSeedingRound[]
  >([]);
  const [scrambleConfigDirty, setScrambleConfigDirty] = useState(false);
  const [confirmSuggestTeams, setConfirmSuggestTeams] = useState(false);

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
        const [
          statusResponse,
          readinessResponse,
          teamAssignmentResponse,
          teamExceptionResponse,
        ] = await Promise.all([
          getRoundStatus(numericRoundId),
          getRoundReadiness(numericRoundId),
          getRoundTeamAssignmentPage(numericRoundId),
          getRoundTeamExceptions(numericRoundId),
        ]);

        setStatus(statusResponse);
        setEventRoundNumber(await loadEventRoundNumber(statusResponse));
        setReadiness(readinessResponse);

        const response: RoundTeamAssignmentPageResponse =
          teamAssignmentResponse;
        setCapabilities(
          response.capabilities ?? statusResponse.capabilities ?? null,
        );
        setDefaultRoundTeeId(response.defaultRoundTeeId ?? null);
        setTeeOptions(response.teeOptions ?? []);
        setSeedingLabel(response.seedingLabel ?? null);
        setScrambleTeamSize(
          response.scrambleTeamSize ?? statusResponse.scrambleTeamSize ?? 4,
        );
        setScrambleSeedingMethod(
          response.scrambleSeedingMethod ?? "CURRENT_HANDICAP_INDEX",
        );
        setScrambleHandicapDate(
          response.scrambleHandicapDate ??
            response.seedingAsOfDate ??
            statusResponse.roundDate ??
            "",
        );
        setScrambleSeedingRounds(response.scrambleSeedingRounds ?? []);
        setScrambleConfigDirty(false);

        const normalizedUnassignedPlayers = sortPlayers(
          response.unassignedPlayers ?? [],
        );
        const normalizedInactivePlayers = sortPlayers(
          response.inactivePlayers ?? [],
        );
        const hasSavedPlayerAssignments = Boolean(
          response.teams &&
          response.teams.some((team) => (team.players ?? []).length > 0),
        );
        const normalizedTeams = hasSavedPlayerAssignments
          ? cloneTeams(sortTeams(response.teams))
          : buildDefaultTeams(
              statusResponse.players?.length ??
                normalizedUnassignedPlayers.length,
              statusResponse.format,
              response.scrambleTeamSize ?? statusResponse.scrambleTeamSize ?? 4,
            );
        const nextUnassignedPlayers = normalizedUnassignedPlayers;

        setTeams(normalizedTeams);
        setUnassignedPlayers(nextUnassignedPlayers);
        setInactivePlayers(normalizedInactivePlayers);
        setTeamExceptions(teamExceptionResponse.exceptions ?? []);

        const teeSnapshot: Record<number, number> = {};
        for (const player of collectPlayers(
          normalizedTeams,
          nextUnassignedPlayers,
        )) {
          const teeId = getPlayerTeeId(
            player,
            response.defaultRoundTeeId ?? null,
          );
          if (teeId !== "") teeSnapshot[player.scorecardId] = Number(teeId);
        }
        setOriginalTeeByScorecardId(teeSnapshot);
        setDirty(false);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load team assignment page.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [roundId]);

  function collectPlayers(
    teamList: RoundTeam[],
    unassignedList: RoundTeamPlayer[],
  ): RoundTeamPlayer[] {
    const players: RoundTeamPlayer[] = [];
    for (const team of teamList) {
      for (const player of team.players) players.push(player);
    }
    for (const player of unassignedList) players.push(player);
    return players;
  }

  function getAllVisiblePlayers(): RoundTeamPlayer[] {
    return collectPlayers(teams, unassignedPlayers);
  }

  function markDirty(): void {
    setDirty(true);
    setConfirmSuggestTeams(false);
    setMessage(null);
    setError(null);
  }

  function markScrambleConfigDirty(): void {
    setScrambleConfigDirty(true);
    setMessage(null);
    setError(null);
  }

  function formatParticipationStatus(
    status: string | null | undefined,
  ): string {
    if (status === "WITHDRAWN") return "Withdrawn";
    if (status === "NO_SHOW") return "No-Show";
    if (status === "ACTIVE") return "Active";
    return "Unavailable";
  }

  function applyAssignmentPageResponse(
    response: RoundTeamAssignmentPageResponse,
  ): void {
    setCapabilities(response.capabilities ?? capabilities);
    setDefaultRoundTeeId(response.defaultRoundTeeId ?? defaultRoundTeeId);
    setTeeOptions(response.teeOptions ?? teeOptions);
    setSeedingLabel(response.seedingLabel ?? seedingLabel);
    setScrambleTeamSize(response.scrambleTeamSize ?? scrambleTeamSize);
    setScrambleSeedingMethod(
      response.scrambleSeedingMethod ?? scrambleSeedingMethod,
    );
    setScrambleHandicapDate(
      response.scrambleHandicapDate ??
        response.seedingAsOfDate ??
        scrambleHandicapDate,
    );
    setScrambleSeedingRounds(
      response.scrambleSeedingRounds ?? scrambleSeedingRounds,
    );
    setTeams(cloneTeams(sortTeams(response.teams ?? [])));
    setUnassignedPlayers(sortPlayers(response.unassignedPlayers ?? []));
    setInactivePlayers(sortPlayers(response.inactivePlayers ?? []));

    const teeSnapshot: Record<number, number> = {};
    for (const player of collectPlayers(
      response.teams ?? [],
      response.unassignedPlayers ?? [],
    )) {
      const teeId = getPlayerTeeId(
        player,
        response.defaultRoundTeeId ?? defaultRoundTeeId,
      );
      if (teeId !== "") teeSnapshot[player.scorecardId] = Number(teeId);
    }
    setOriginalTeeByScorecardId(teeSnapshot);
  }

  async function handleParticipationChange(
    player: RoundTeamPlayer,
    participationStatus: "ACTIVE" | "NO_SHOW" | "WITHDRAWN",
  ): Promise<void> {
    if (!roundId) return;
    if (dirty || scrambleConfigDirty) {
      setError(
        "Save current team changes before marking a player unavailable or active.",
      );
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const response = await updateRoundScorecardParticipation(
        Number(roundId),
        player.scorecardId,
        participationStatus,
      );
      applyAssignmentPageResponse(response);
      const nextReadiness = await getRoundReadiness(Number(roundId));
      setReadiness(nextReadiness);
      setDirty(false);
      setMessage(
        participationStatus === "ACTIVE"
          ? `${player.playerName} marked active for this round.`
          : `${player.playerName} marked ${participationStatus === "NO_SHOW" ? "No-Show" : "Withdrawn"} for this round.`,
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update player availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updatePlayerTee(scorecardId: number, roundTeeId: number): void {
    const targetPlayer = getAllVisiblePlayers().find(
      (player) => player.scorecardId === scorecardId,
    );
    const targetTee = teeOptions.find((tee) => tee.roundTeeId === roundTeeId);

    if (!targetPlayer || !targetTee) return;
    if (!playerCanUseTee(targetPlayer, targetTee)) {
      setError(
        `${targetPlayer.playerName} is not eligible for ${targetTee.teeName}.`,
      );
      return;
    }

    const nextTeeName = targetTee.teeName;
    const isOverride =
      defaultRoundTeeId != null && roundTeeId !== defaultRoundTeeId;

    markDirty();
    setTeams((prevTeams) =>
      prevTeams.map((team) => ({
        ...team,
        players: team.players.map((player) =>
          player.scorecardId === scorecardId
            ? {
                ...player,
                roundTeeId,
                roundTeeName: nextTeeName,
                teeOverride: isOverride,
              }
            : player,
        ),
      })),
    );
    setUnassignedPlayers((prev) =>
      prev.map((player) =>
        player.scorecardId === scorecardId
          ? {
              ...player,
              roundTeeId,
              roundTeeName: nextTeeName,
              teeOverride: isOverride,
            }
          : player,
      ),
    );
  }

  function moveUnassignedPlayerToTeam(
    player: RoundTeamPlayer,
    roundTeamId: number,
  ): void {
    const targetTeam = teams.find((team) => team.roundTeamId === roundTeamId);

    if (!targetTeam) {
      setError("Team not found.");
      setMessage(null);
      return;
    }

    if (
      targetTeam.players.some(
        (existing) => existing.scorecardId === player.scorecardId,
      )
    ) {
      return;
    }

    if (targetTeam.players.length >= expectedTeamSize) {
      setError(
        `${targetTeam.teamName} is full. This format allows ${getTeamCapacityLabel(status?.format, scrambleTeamSize)} per team.`,
      );
      setMessage(null);
      return;
    }

    markDirty();

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) return team;

        const nextPlayers = [
          ...team.players,
          { ...player, playerOrder: team.players.length + 1 },
        ];

        return { ...team, players: sortPlayers(nextPlayers) };
      }),
    );

    setUnassignedPlayers((prev) =>
      prev.filter((p) => p.scorecardId !== player.scorecardId),
    );
  }

  function removePlayerFromTeam(
    scorecardId: number,
    roundTeamId: number,
  ): void {
    markDirty();

    const sourceTeam = teams.find((team) => team.roundTeamId === roundTeamId);
    const playerToRemove = sourceTeam?.players.find(
      (player) => player.scorecardId === scorecardId,
    );
    if (!playerToRemove) return;

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) return team;
        const nextPlayers = team.players
          .filter((player) => player.scorecardId !== scorecardId)
          .map((player, index) => ({ ...player, playerOrder: index + 1 }));
        return { ...team, players: nextPlayers };
      }),
    );

    setUnassignedPlayers((prev) =>
      sortPlayers([...prev, { ...playerToRemove, playerOrder: null }]),
    );
  }

  function movePlayerWithinTeam(
    roundTeamId: number,
    scorecardId: number,
    direction: "up" | "down",
  ): void {
    markDirty();

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.roundTeamId !== roundTeamId) return team;
        const index = team.players.findIndex(
          (player) => player.scorecardId === scorecardId,
        );
        if (index === -1) return team;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= team.players.length) return team;

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
      }),
    );
  }

  function updateScrambleSeedingRound(
    plannedRoundId: number,
    included: boolean,
  ): void {
    setScrambleSeedingRounds((prev) =>
      prev.map((round) =>
        round.plannedRoundId === plannedRoundId
          ? { ...round, included }
          : round,
      ),
    );
    markScrambleConfigDirty();
  }

  function updateScrambleTeamSize(nextSize: number): void {
    setScrambleTeamSize(nextSize);
    markScrambleConfigDirty();
  }

  function updateScrambleSeedingMethod(nextMethod: string): void {
    setScrambleSeedingMethod(nextMethod);
    markScrambleConfigDirty();
  }

  function updateScrambleHandicapDate(nextDate: string): void {
    setScrambleHandicapDate(nextDate);
    markScrambleConfigDirty();
  }

  async function handleSaveScrambleConfig(): Promise<void> {
    if (!roundId) return;

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (!canEditScrambleSetup) {
        throw new Error(
          capabilities?.editScrambleSetupReason ??
            "Scramble setup changes are not allowed.",
        );
      }

      const payload: SaveRoundScrambleSeedingRequest = {
        scrambleTeamSize: scrambleTeamSize ?? 4,
        seedingMethod: scrambleSeedingMethod,
        scrambleHandicapDate: scrambleHandicapDate || null,
        includedPlannedRoundIds: scrambleSeedingRounds
          .filter((round) => Boolean(round.included) && Boolean(round.eligible))
          .map((round) => round.plannedRoundId),
      };

      const response = await saveRoundScrambleSeeding(Number(roundId), payload);
      setCapabilities(response.capabilities ?? capabilities);
      setScrambleTeamSize(response.scrambleTeamSize ?? scrambleTeamSize ?? 4);
      setScrambleSeedingMethod(
        response.scrambleSeedingMethod ?? "CURRENT_HANDICAP_INDEX",
      );
      setScrambleHandicapDate(
        response.scrambleHandicapDate ??
          response.seedingAsOfDate ??
          scrambleHandicapDate,
      );
      setScrambleSeedingRounds(response.scrambleSeedingRounds ?? []);
      setSeedingLabel(response.seedingLabel ?? null);

      const mergedPlayers = mergeServerPlayerDetails(
        teams,
        unassignedPlayers,
        response,
      );
      setTeams(mergedPlayers.teams);
      setUnassignedPlayers(mergedPlayers.unassignedPlayers);

      const teeSnapshot: Record<number, number> = {};
      for (const player of collectPlayers(
        mergedPlayers.teams,
        mergedPlayers.unassignedPlayers,
      )) {
        const teeId = getPlayerTeeId(
          player,
          response.defaultRoundTeeId ?? defaultRoundTeeId,
        );
        if (teeId !== "") teeSnapshot[player.scorecardId] = Number(teeId);
      }
      setOriginalTeeByScorecardId(teeSnapshot);

      setScrambleConfigDirty(false);
      setMessage(
        "Scramble setup saved. Seed values were refreshed. Use Suggest Teams to reseed with the updated setup.",
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save Scramble setup.",
      );
    } finally {
      setSaving(false);
    }
  }

  function hasExistingTeamAssignments(): boolean {
    return teams.some((team) => team.players.length > 0);
  }

  function applySuggestedScrambleTeams(): void {
    const allPlayers = collectPlayers(teams, unassignedPlayers);
    if (allPlayers.length === 0) {
      return;
    }

    setTeams(
      buildSerpentineTeams(allPlayers, status?.format, scrambleTeamSize),
    );
    setUnassignedPlayers([]);
    setConfirmSuggestTeams(false);
    markDirty();
    setMessage(
      hasScrambleEvent
        ? "Suggested scramble teams by serpentine seeding using the current Scramble setup. Review and save assignments."
        : "Suggested teams by serpentine seeding using current player indexes. Review and save assignments.",
    );
  }

  function suggestScrambleTeams(): void {
    if (!canAssignTeams) {
      setError(
        capabilities?.assignTeamsReason ??
          "Team suggestions are not allowed for this round.",
      );
      return;
    }
    if (hasScrambleEvent && scrambleConfigDirty) {
      setError("Save Scramble Setup before suggesting teams.");
      return;
    }

    const allPlayers = collectPlayers(teams, unassignedPlayers);
    if (allPlayers.length === 0) {
      return;
    }

    if (hasExistingTeamAssignments()) {
      setConfirmSuggestTeams(true);
      setMessage(null);
      setError(null);
      return;
    }

    applySuggestedScrambleTeams();
  }

  async function saveFinalizedRoundTeeCorrections(): Promise<void> {
    const changedPlayers = getAllVisiblePlayers().filter((player) => {
      const currentTeeId = getPlayerTeeId(player, defaultRoundTeeId);
      if (currentTeeId === "") return false;
      return (
        originalTeeByScorecardId[player.scorecardId] !== Number(currentTeeId)
      );
    });

    const payload: RoundTeeCorrectionRequest[] = changedPlayers.map(
      (player) => ({
        scorecardId: player.scorecardId,
        roundTeeId: Number(getPlayerTeeId(player, defaultRoundTeeId)),
      }),
    );

    await saveRoundTeeCorrections(Number(roundId), payload);

    const nextSnapshot = { ...originalTeeByScorecardId };
    for (const player of changedPlayers) {
      nextSnapshot[player.scorecardId] = Number(
        getPlayerTeeId(player, defaultRoundTeeId),
      );
    }
    setOriginalTeeByScorecardId(nextSnapshot);

    setMessage(
      changedPlayers.length === 1
        ? "Tee correction saved. Recalculation completed."
        : `Tee corrections saved for ${changedPlayers.length} players. Recalculation completed.`,
    );
  }

  async function saveEditableRoundTeamAssignments(): Promise<void> {
    const overfilledTeam = teams.find(
      (team) => team.players.length > expectedTeamSize,
    );
    if (overfilledTeam) {
      throw new Error(
        `${overfilledTeam.teamName} has ${overfilledTeam.players.length} players. This format allows ${getTeamCapacityLabel(status?.format, scrambleTeamSize)} per team.`,
      );
    }

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
            roundTeeId: Number(getPlayerTeeId(player, defaultRoundTeeId)),
          })),
        })),
    };

    await saveRoundTeams(Number(roundId), payload);

    const refreshedAssignmentPage = await getRoundTeamAssignmentPage(
      Number(roundId),
    );
    applyAssignmentPageResponse(refreshedAssignmentPage);

    setMessage(
      hasTwoManLowNetEvent
        ? "Team assignments saved. Tee-sheet groups were rebuilt from team order. Open Derived Groups to generate or adjust tee times."
        : hasScrambleEvent
          ? "Scramble teams saved. Tee-sheet groups were rebuilt from team order. Open Derived Groups to generate or adjust tee times."
          : "Team assignments saved.",
    );
  }

  async function handleSave(): Promise<boolean> {
    if (!roundId) return false;

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (tripIsLocked) {
        throw new Error(
          "This event is complete and locked. Team assignment and tee correction changes are not allowed.",
        );
      }

      if (status?.finalized) {
        if (!canCorrectTeeAfterFinalization) {
          throw new Error(
            capabilities?.correctTeeAfterFinalizationReason ??
              "Tee corrections are not allowed for this round.",
          );
        }
        await saveFinalizedRoundTeeCorrections();
      } else {
        if (!canAssignTeams) {
          throw new Error(
            capabilities?.assignTeamsReason ??
              "Team assignments are not allowed for this round.",
          );
        }
        await saveEditableRoundTeamAssignments();
      }

      const nextReadiness = await getRoundReadiness(Number(roundId));
      setReadiness(nextReadiness);
      setDirty(false);
      return true;
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save team assignments.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function reloadReadinessAndExceptions(): Promise<void> {
    if (!roundId) return;
    const [nextReadiness, nextExceptions] = await Promise.all([
      getRoundReadiness(Number(roundId)),
      getRoundTeamExceptions(Number(roundId)),
    ]);
    setReadiness(nextReadiness);
    setTeamExceptions(nextExceptions.exceptions ?? []);
  }

  async function handleSaveGhostException(
    team: RoundTeam,
    ghostPlayerIdValue: string,
    indexMinValue: string,
    indexMaxValue: string,
  ): Promise<void> {
    if (!roundId) return;
    if (team.roundTeamId < 1) {
      setError(
        "Save team assignments before configuring a ghost player for this team.",
      );
      return;
    }
    const ghostPlayerId = Number(ghostPlayerIdValue);
    if (!ghostPlayerId) {
      setError("Select a ghost player before saving the exception.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const existing = getActiveExceptionForTeam(
        teamExceptions,
        team.roundTeamId,
        "GHOST_PLAYER",
      );
      await saveRoundTeamException(Number(roundId), {
        id: existing?.id ?? null,
        roundTeamId: team.roundTeamId,
        exceptionType: "GHOST_PLAYER",
        ghostPlayerId,
        indexMin: indexMinValue.trim() === "" ? null : Number(indexMinValue),
        indexMax: indexMaxValue.trim() === "" ? null : Number(indexMaxValue),
        selectionMethod: "MANUAL",
        active: true,
      });
      await reloadReadinessAndExceptions();
      setMessage(`${team.teamName} ghost player exception saved.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save ghost player exception.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRotationException(team: RoundTeam): Promise<void> {
    if (!roundId) return;
    if (team.roundTeamId < 1) {
      setError(
        "Save team assignments before configuring an extra-shot rotation for this team.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const playerNames = sortPlayers(team.players).map(
        (player) => player.playerName,
      );
      const rotationPattern =
        playerNames.length === 3
          ? `${playerNames[0]}: holes 1,4,7,10,13,16; ${playerNames[1]}: holes 2,5,8,11,14,17; ${playerNames[2]}: holes 3,6,9,12,15,18`
          : "Extra shot rotates by player order every hole.";
      const existing = getActiveExceptionForTeam(
        teamExceptions,
        team.roundTeamId,
        "EXTRA_SHOT_ROTATION",
      );
      await saveRoundTeamException(Number(roundId), {
        id: existing?.id ?? null,
        roundTeamId: team.roundTeamId,
        exceptionType: "EXTRA_SHOT_ROTATION",
        rotationPattern,
        active: true,
      });
      await reloadReadinessAndExceptions();
      setMessage(`${team.teamName} extra-shot rotation saved.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save extra-shot rotation.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteException(exceptionId: number): Promise<void> {
    if (!roundId) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await deleteRoundTeamException(Number(roundId), exceptionId);
      await reloadReadinessAndExceptions();
      setMessage("Team exception removed.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to remove team exception.",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderTeamExceptionControl(team: RoundTeam): React.ReactNode {
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
          <div
            style={{ ...mutedTextStyle, fontSize: "13px", marginTop: "4px" }}
          >
            This threesome needs an extra-shot rotation. Twosomes are not
            allowed; move a player from a foursome instead.
          </div>
          {existingRotation ? (
            <div style={{ marginTop: "8px", fontSize: "13px" }}>
              <strong>Configured:</strong> {existingRotation.rotationPattern}
            </div>
          ) : null}
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              style={buttonStyle}
              disabled={saving || team.roundTeamId < 1}
              onClick={() => void handleSaveRotationException(team)}
            >
              {existingRotation ? "Refresh Rotation" : "Configure Rotation"}
            </button>
            {existingRotation ? (
              <button
                type="button"
                style={smallButtonStyle}
                disabled={saving}
                onClick={() => void handleDeleteException(existingRotation.id)}
              >
                Remove
              </button>
            ) : null}
          </div>
          {team.roundTeamId < 1 ? (
            <div
              style={{ color: "#9a3412", fontSize: "12px", marginTop: "6px" }}
            >
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
        onSave={handleSaveGhostException}
        onDelete={handleDeleteException}
      />
    );
  }

  const assignedCount = useMemo(
    () => teams.reduce((sum, team) => sum + team.players.length, 0),
    [teams],
  );

  const totalPlayers = assignedCount + unassignedPlayers.length;
  const inactiveCount = inactivePlayers.length;
  const hasScrambleEvent = roundHasScrambleEvent(readiness, status?.format);
  const hasTwoManLowNetEvent = roundHasTwoManLowNetEvent(
    readiness,
    status?.format,
  );
  const expectedTeamSize = getExpectedTeamSize(
    hasScrambleEvent
      ? "TEAM_SCRAMBLE"
      : hasTwoManLowNetEvent
        ? "TWO_MAN_LOW_NET"
        : status?.format,
    scrambleTeamSize,
  );
  const expectedTeamCount = Math.max(
    1,
    Math.ceil(totalPlayers / expectedTeamSize),
  );
  const isFinalizedRound =
    capabilities?.roundFinalized === true || status?.finalized === true;
  const tripIsLocked =
    capabilities?.tripLocked === true || status?.tripLocked === true;
  const canAssignTeams =
    capabilities?.canAssignTeams ?? (!isFinalizedRound && !tripIsLocked);
  const canSuggestTeamAssignments = canAssignTeams && expectedTeamSize > 1;
  const canEditScrambleSetup =
    capabilities?.canEditScrambleSetup ?? canAssignTeams;
  const canCorrectTeeAfterFinalization =
    capabilities?.canCorrectTeeAfterFinalization ??
    (isFinalizedRound && !tripIsLocked);
  const teeCorrectionsAllowed = canCorrectTeeAfterFinalization;
  const teamStructureLocked = !canAssignTeams;
  const shortFourManTeams = teams.filter(
    (team) => expectedTeamSize === 4 && team.players.length === 3,
  );
  const shortFourManTeamsNeedingException = shortFourManTeams.filter(
    (team) =>
      !teamHasAllowedShortTeamException(
        team,
        teamExceptions,
        expectedTeamSize,
        hasScrambleEvent,
      ),
  );
  const localAssignmentsReady = calculateLocalAssignmentsReady(
    teams,
    unassignedPlayers,
    status?.format,
    expectedTeamSize,
    teamExceptions,
    hasScrambleEvent,
  );
  const serverReadinessReady =
    readiness?.ready ?? readiness?.readyForScoring ?? false;
  const isReadyForScoring =
    (isFinalizedRound || (serverReadinessReady && localAssignmentsReady)) &&
    !dirty &&
    !scrambleConfigDirty;
  const scoringBlockedReason = isFinalizedRound
    ? null
    : dirty || scrambleConfigDirty
      ? "Save assignments before going to scoring."
      : !localAssignmentsReady
        ? "Finish all team/group assignments before going to scoring."
        : !serverReadinessReady
          ? "Round is not ready for scoring. Fix the blocking readiness issues first."
          : null;
  const usesDerivedTeeSheetGroups = hasTwoManLowNetEvent || hasScrambleEvent;
  const derivedGroupsButtonLabel = dirty
    ? "Save & Set Tee Times"
    : "Set Tee Times / Derived Groups";

  const confirmIfNeeded = useUnsavedChangesWarning(
    (dirty || scrambleConfigDirty) && !saving,
    "You have unsaved team assignment or Scramble setup changes. Leave without saving?",
  );

  function renderTeeControl(player: RoundTeamPlayer): React.ReactNode {
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

  async function navigateIfClean(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) return;
    navigate(path);
  }

  async function handleOpenDerivedGroups(): Promise<void> {
    if (!roundId) return;

    if (scrambleConfigDirty) {
      setError(
        "Save Scramble Setup before setting tee times so groups use the current Scramble configuration.",
      );
      setMessage(null);
      return;
    }

    if (dirty) {
      const saved = await handleSave();
      if (!saved) return;
    } else if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(`/rounds/${roundId}/groups`);
  }

  function renderCompactPlayerRow(
    player: RoundTeamPlayer,
    team: RoundTeam | null,
    index: number | null,
  ): React.ReactNode {
    const canMoveUp = team != null && index != null && index > 0;
    const canMoveDown =
      team != null && index != null && index < (team.players?.length ?? 0) - 1;

    return (
      <tr key={`${team?.roundTeamId ?? "unassigned"}-${player.scorecardId}`}>
        <td style={tdStyle}>{team ? index! + 1 : "—"}</td>
        <td style={tdStyle}>
          <div style={{ fontWeight: 600 }}>{player.playerName}</div>
          <div style={{ fontSize: "11px", color: "#666" }}>
            Index:{" "}
            {player.tripIndex == null
              ? "—"
              : Number(player.tripIndex).toFixed(1)}
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
                  movePlayerWithinTeam(
                    team.roundTeamId,
                    player.scorecardId,
                    "up",
                  )
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
                  movePlayerWithinTeam(
                    team.roundTeamId,
                    player.scorecardId,
                    "down",
                  )
                }
                disabled={teamStructureLocked || !canMoveDown}
              >
                Down
              </button>
              <button
                type="button"
                style={
                  teamStructureLocked
                    ? disabledSmallButtonStyle
                    : smallButtonStyle
                }
                onClick={() =>
                  removePlayerFromTeam(player.scorecardId, team.roundTeamId)
                }
                disabled={teamStructureLocked}
              >
                Remove
              </button>
            </div>
          ) : (
            <div style={assignmentButtonWrapStyle}>
              {teams.map((targetTeam) => {
                const teamIsFull =
                  targetTeam.players.length >= expectedTeamSize;
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
                    title={
                      teamIsFull ? `${targetTeam.teamName} is full` : undefined
                    }
                  >
                    {targetTeam.teamName}
                  </button>
                );
              })}
              <button
                type="button"
                style={
                  teamStructureLocked
                    ? disabledSmallButtonStyle
                    : smallButtonStyle
                }
                onClick={() =>
                  void handleParticipationChange(player, "NO_SHOW")
                }
                disabled={teamStructureLocked || saving}
                title="Player did not show up for this round"
              >
                No-Show
              </button>
              <button
                type="button"
                style={
                  teamStructureLocked
                    ? disabledSmallButtonStyle
                    : smallButtonStyle
                }
                onClick={() =>
                  void handleParticipationChange(player, "WITHDRAWN")
                }
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

  const saveButtonLabel = saving
    ? "Saving..."
    : dirty
      ? isFinalizedRound
        ? "Save Tee Corrections"
        : "Save Assignments"
      : "Saved";

  if (loading) {
    return (
      <div style={pageContainerMediumStyle}>
        <h1 style={{ marginTop: 0 }}>Round Team Assignment</h1>
        <div>Loading team assignment...</div>
      </div>
    );
  }

  const eventRoundLabel = formatEventRoundLabel(
    eventRoundNumber,
    Number(roundId),
  );

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Round Team Assignment"
        subtitle={
          <>
            <div>
              {eventRoundLabel}
              {status?.format
                ? ` • ${getRoundFormatLabel(status.format, scrambleTeamSize)}`
                : ""}
              {status?.courseName ? ` • ${status.courseName}` : ""}
              {status?.roundDate ? ` • ${status.roundDate}` : ""}
            </div>
            <div style={{ marginTop: "6px" }}>
              Assigned: {assignedCount} • Unassigned: {unassignedPlayers.length}{" "}
              • Total Active: {totalPlayers} • Unavailable: {inactiveCount} •
              Teams: {teams.length}/{expectedTeamCount} • Max/team:{" "}
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
            {status?.tripId ? (
              <TripDetailButton
                tripId={status.tripId}
                onBeforeNavigate={confirmIfNeeded}
              />
            ) : null}
            <WorkflowBackButton
              label="Back to Round Setup"
              to={`/rounds/${roundId}`}
              onBeforeNavigate={confirmIfNeeded}
            />
            {canSuggestTeamAssignments ? (
              <button
                type="button"
                style={buttonStyle}
                onClick={suggestScrambleTeams}
                disabled={saving || (hasScrambleEvent && scrambleConfigDirty)}
              >
                Suggest Teams
              </button>
            ) : null}
            {usesDerivedTeeSheetGroups ? (
              <button
                type="button"
                style={dirty ? primaryButtonStyle : buttonStyle}
                onClick={() => void handleOpenDerivedGroups()}
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
                void navigateIfClean(`/rounds/${roundId}/tee-sheet`)
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
                  setError(
                    scoringBlockedReason ?? "Round is not ready for scoring.",
                  );
                  return;
                }
                navigateIfClean(`/rounds/${roundId}/scoring`);
              }}
            >
              Continue to Scoring
            </button>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void navigateIfClean(`/rounds/${roundId}/results`)}
            >
              Results
            </button>
            {!tripIsLocked ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
              >
                {saveButtonLabel}
              </button>
            ) : null}
          </>
        }
      />

      {readiness ? <RoundReadinessPanel readiness={readiness} compact /> : null}
      {status ? (
        <RoundProgressBar
          roundId={status.roundId}
          currentStep="teams"
          format={status.format}
          finalized={status.finalized}
        />
      ) : null}

      {usesDerivedTeeSheetGroups ? (
        <div style={warningBoxStyle}>
          {hasScrambleEvent
            ? "Scramble teams define the competition teams. Tee times and starting holes are managed from derived tee-sheet groups."
            : "2-Man teams define the competition teams. Tee times and starting holes are managed from derived tee-sheet groups."}{" "}
          Use <strong>{derivedGroupsButtonLabel}</strong> after suggesting or
          editing teams to generate or adjust tee times before scoring.
        </div>
      ) : null}

      {shortFourManTeamsNeedingException.length > 0 ? (
        <div style={warningBoxStyle}>
          One or more 4-man teams have only 3 players. Configure a valid
          short-team exception below: ghost player for 4-Man 2-Low Net, or
          extra-shot rotation for Scramble.
        </div>
      ) : shortFourManTeams.length > 0 ? (
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
              onClick={() => setConfirmSuggestTeams(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {hasScrambleEvent ? (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "10px" }}>Scramble Setup</h2>
          <div style={{ ...mutedTextStyle, marginBottom: "12px" }}>
            Configure this Scramble round independently. Pick the team size,
            seeding method, handicap date, and the prior non-Scramble rounds
            that should feed the team seed ranking. After saving setup changes,
            click Suggest Teams to rebuild the team suggestion.
          </div>

          <div style={configGridStyle}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                Team Size
              </div>
              <select
                value={scrambleTeamSize ?? 4}
                onChange={(event) =>
                  updateScrambleTeamSize(Number(event.target.value))
                }
                style={formSelectStyle}
                disabled={saving || !canEditScrambleSetup}
              >
                <option value={2}>2-Person Scramble</option>
                <option value={3}>3-Person Scramble</option>
                <option value={4}>4-Person Scramble</option>
              </select>
            </label>

            <label>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                Seeding Method
              </div>
              <select
                value={scrambleSeedingMethod}
                onChange={(event) =>
                  updateScrambleSeedingMethod(event.target.value)
                }
                style={formSelectStyle}
                disabled={saving || !canEditScrambleSetup}
              >
                <option value="CURRENT_HANDICAP_INDEX">
                  Current Handicap Index
                </option>
                <option value="AVERAGE_GROSS_SCORE">Average Gross Score</option>
                <option value="AVERAGE_NET_SCORE">Average Net Score</option>
              </select>
            </label>

            <label>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                Handicap Date
              </div>
              <input
                type="date"
                value={scrambleHandicapDate}
                onChange={(event) =>
                  updateScrambleHandicapDate(event.target.value)
                }
                style={formSelectStyle}
                disabled={saving || !canEditScrambleSetup}
              />
            </label>

            <div>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                Current Method
              </div>
              <div
                style={{
                  ...mutedTextStyle,
                  minHeight: "32px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {getScrambleSeedingMethodLabel(scrambleSeedingMethod)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            <div style={{ fontWeight: 600, marginBottom: "6px" }}>
              Source Rounds for This Scramble
            </div>
            {scrambleSeedingRounds.length === 0 ? (
              <div style={mutedTextStyle}>
                No prior non-Scramble rounds are available for this Scramble.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "4px" }}>
                {scrambleSeedingRounds.map((round) => (
                  <label
                    key={round.plannedRoundId}
                    style={{
                      ...checkboxRowStyle,
                      color: round.eligible ? undefined : "#888",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        Boolean(round.included) && Boolean(round.eligible)
                      }
                      disabled={
                        saving || !canEditScrambleSetup || !round.eligible
                      }
                      onChange={(event) =>
                        updateScrambleSeedingRound(
                          round.plannedRoundId,
                          event.target.checked,
                        )
                      }
                    />
                    <span>{formatSeedingRoundLabel(round)}</span>
                    {!round.eligible ? (
                      <span style={{ fontSize: "12px" }}>Not eligible</span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </div>

          {canEditScrambleSetup ? (
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSaveScrambleConfig()}
                disabled={saving || !scrambleConfigDirty}
              >
                {saving
                  ? "Saving..."
                  : scrambleConfigDirty
                    ? "Save Scramble Setup"
                    : "Scramble Setup Saved"}
              </button>
              <button
                type="button"
                style={
                  scrambleConfigDirty ? disabledSmallButtonStyle : buttonStyle
                }
                onClick={suggestScrambleTeams}
                disabled={saving || scrambleConfigDirty}
              >
                Suggest Teams
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div style={{ display: "grid", gap: "16px" }}>
        <section style={compactSectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "8px" }}>
            Unassigned Players
          </h2>
          <div
            style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}
          >
            Assign players with the team buttons. If a player cancelled or is a
            no-show for this round, mark them unavailable so readiness ignores
            them.
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
                {unassignedPlayers.map((player) =>
                  renderCompactPlayerRow(player, null, null),
                )}
              </tbody>
            </table>
          )}
        </section>

        {inactivePlayers.length > 0 ? (
          <section style={compactSectionStyle}>
            <h2 style={{ marginTop: 0, marginBottom: "8px" }}>
              Unavailable / No-Shows / Withdrawals
            </h2>
            <div
              style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}
            >
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
                        Index:{" "}
                        {player.tripIndex == null
                          ? "—"
                          : Number(player.tripIndex).toFixed(1)}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {formatParticipationStatus(player.participationStatus)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={
                          teamStructureLocked
                            ? disabledSmallButtonStyle
                            : smallButtonStyle
                        }
                        onClick={() =>
                          void handleParticipationChange(player, "ACTIVE")
                        }
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
          <div
            style={{ color: "#666", fontSize: "13px", marginBottom: "10px" }}
          >
            Compact assignment grid for larger trips. Use Up/Down to reorder
            within a team, Remove to move a player back to Unassigned, and Save
            when finished.
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
                        <td style={tdStyle} colSpan={3}>
                          No players assigned.
                        </td>
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
                              color:
                                team.players.length > expectedTeamSize
                                  ? "#b91c1c"
                                  : "#666",
                              fontSize: "11px",
                              fontWeight:
                                team.players.length > expectedTeamSize
                                  ? 700
                                  : 400,
                            }}
                          >
                            {team.players.length}/{expectedTeamSize} players
                          </div>
                          {renderTeamExceptionControl(team)}
                        </td>
                      ) : null}
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>
                          {player.playerName}
                        </div>
                        <div style={{ fontSize: "11px", color: "#666" }}>
                          Index:{" "}
                          {player.tripIndex == null
                            ? "—"
                            : Number(player.tripIndex).toFixed(1)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ maxWidth: "170px" }}>
                          {renderTeeControl(player)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={assignmentButtonWrapStyle}>
                          <button
                            type="button"
                            style={
                              teamStructureLocked || index === 0
                                ? disabledSmallButtonStyle
                                : smallButtonStyle
                            }
                            onClick={() =>
                              movePlayerWithinTeam(
                                team.roundTeamId,
                                player.scorecardId,
                                "up",
                              )
                            }
                            disabled={teamStructureLocked || index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            style={
                              teamStructureLocked ||
                              index === sortedPlayers.length - 1
                                ? disabledSmallButtonStyle
                                : smallButtonStyle
                            }
                            onClick={() =>
                              movePlayerWithinTeam(
                                team.roundTeamId,
                                player.scorecardId,
                                "down",
                              )
                            }
                            disabled={
                              teamStructureLocked ||
                              index === sortedPlayers.length - 1
                            }
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            style={
                              teamStructureLocked
                                ? disabledSmallButtonStyle
                                : smallButtonStyle
                            }
                            onClick={() =>
                              removePlayerFromTeam(
                                player.scorecardId,
                                team.roundTeamId,
                              )
                            }
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

      {!tripIsLocked ? (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            {saveButtonLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
