import type { RoundSetupStatusResponse } from "../types/round";
import { roundHasScrambleEvent, roundRequiresTeams } from "../utils/roundEventCapabilities";

/** Whether any player already has a recorded round score. */
export function hasScoringStarted(response: RoundSetupStatusResponse): boolean {
  const players = response.round.players ?? [];

  for (const player of players) {
    if (
      player.grossScore != null ||
      player.adjustedGrossScore != null ||
      player.netScore != null
    ) {
      return true;
    }
  }

  return false;
}

/** Select the initial workflow destination without performing navigation. */
export function getRoundEntryDestination(
  roundId: number,
  response: RoundSetupStatusResponse,
): string {
  const path = `/rounds/${roundId}`;
  if (response.round.finalized) {
    return `${path}/scoring`;
  }

  const usesTeamAssignment = roundRequiresTeams(response.readiness, response.round.format);
  const scramble = roundHasScrambleEvent(response.readiness, response.round.format);
  const scoringStarted = hasScoringStarted(response);

  if (usesTeamAssignment) {
    if (!response.readiness.teamsReady || (scramble && !scoringStarted)) {
      return `${path}/teams`;
    }
    if (!response.readiness.groupsReady) {
      return scramble ? `${path}/teams` : `${path}/groups`;
    }
    return `${path}/scoring`;
  }

  return response.readiness.groupsReady ? `${path}/scoring` : `${path}/groups`;
}
