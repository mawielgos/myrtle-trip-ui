import type { RoundSetupStatusResponse } from "../types/round";
import { formatGameDescription } from "../utils/gameFormat";
import { buildScoreEntryAction, getGroupsActionLabel, getTeamsActionLabel } from "../utils/roundNavigation";
import {
  roundHasScrambleEvent,
  roundHasTwoManLowNetEvent,
  roundRequiresTeams,
} from "../utils/roundEventCapabilities";

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function formatRoundSetupFormat(format: string | undefined | null): string {
  return formatGameDescription(format);
}

export function formatRoundSetupDate(value: string | undefined | null): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function buildRoundSetupSummary(data: RoundSetupStatusResponse) {
  const { round, readiness, groups, teamAssignment } = data;
  const totalPlayers = safeArray(round.players).length;
  const totalGroupedPlayers = safeArray(groups.groups).reduce(
    (sum, group) => sum + safeArray(group.players).length, 0,
  );
  const totalTeamedPlayers = safeArray(teamAssignment.teams).reduce(
    (sum, team) => sum + safeArray(team.players).length, 0,
  );
  const teamUnassignedCount = safeArray(teamAssignment.unassignedPlayers).length;
  const groupUnassignedCount = Math.max(totalPlayers - totalGroupedPlayers, 0);
  const usesTeamAssignment = roundRequiresTeams(readiness, round.format);
  const scramble = roundHasScrambleEvent(readiness, round.format);
  const twoManLowNet = roundHasTwoManLowNetEvent(readiness, round.format);
  const groupsReady = totalPlayers > 0 && groupUnassignedCount === 0;
  const teamsReady = usesTeamAssignment
    ? totalPlayers > 0 && teamUnassignedCount === 0
    : groupsReady;
  const scoringReady = Boolean(readiness.ready ?? readiness.readyForScoring) && !round.finalized;
  const scoreEntryAction = buildScoreEntryAction(round.roundId, round);
  const groupsActionLabel = getGroupsActionLabel(round);
  const teamsActionLabel = getTeamsActionLabel(round);
  const teamButtonLabel = scramble && teamsReady && !round.finalized && !round.tripLocked
    ? "Edit Scramble Teams"
    : teamsActionLabel;
  const derivedGroupsLabel = round.finalized || round.tripLocked
    ? "View Derived Groups"
    : twoManLowNet || scramble
      ? "Set Tee Times / Derived Groups"
      : "Derived Groups";

  return {
    totalPlayers,
    totalGroupedPlayers,
    totalTeamedPlayers,
    teamUnassignedCount,
    groupUnassignedCount,
    usesTeamAssignment,
    scramble,
    twoManLowNet,
    groupsReady,
    teamsReady,
    scoringReady,
    scoreEntryAction,
    groupsActionLabel,
    teamsActionLabel,
    teamButtonLabel,
    derivedGroupsLabel,
  };
}
