import type {
  RoundScorecardSummary,
  RoundScrambleTeamScoreResponse,
  RoundStatus,
  SaveRoundScrambleScoresRequest,
  ScrambleScoreEntryMode,
} from "../types/round";

export type ScrambleTeamRow = {
  roundTeamId: number;
  teamNumber?: number | null;
  teamName: string;
  playerNames?: string[];
  totalScore: string;
  holes: string[];
};

export function buildScrambleRows(
  teams: RoundScrambleTeamScoreResponse[],
  roundStatus: RoundStatus,
  scorecards: RoundScorecardSummary[],
): ScrambleTeamRow[] {
  const playersByTeamId = new Map<number, string[]>();
  const playersByTeamName = new Map<string, string[]>();

  scorecards.forEach((scorecard) => {
    if (scorecard.teamId != null) {
      const current = playersByTeamId.get(scorecard.teamId) ?? [];
      current.push(scorecard.playerName);
      playersByTeamId.set(scorecard.teamId, current);
    }

    if (scorecard.teamName) {
      const normalizedTeamName = scorecard.teamName.trim().toLowerCase();
      const current = playersByTeamName.get(normalizedTeamName) ?? [];
      current.push(scorecard.playerName);
      playersByTeamName.set(normalizedTeamName, current);
    }
  });

  (roundStatus.players ?? []).forEach((player) => {
    if (player.teamName) {
      const normalizedTeamName = player.teamName.trim().toLowerCase();
      const current = playersByTeamName.get(normalizedTeamName) ?? [];

      if (!current.includes(player.playerName)) {
        current.push(player.playerName);
      }

      playersByTeamName.set(normalizedTeamName, current);
    }
  });

  return teams.map((team) => {
    const sourceHoles = team.holes ?? [];
    const holes = Array.from({ length: 18 }, (_, index) => {
      const value = sourceHoles[index];
      return value == null ? "" : String(value);
    });

    const normalizedTeamName = team.teamName.trim().toLowerCase();
    const playerNames =
      playersByTeamId.get(team.roundTeamId) ??
      playersByTeamName.get(normalizedTeamName) ??
      [];

    return {
      roundTeamId: team.roundTeamId,
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      playerNames: playerNames ?? [],
      totalScore: team.totalScore == null ? "" : String(team.totalScore),
      holes,
    };
  });
}

export function hasAnyScrambleHoleScore(team: ScrambleTeamRow): boolean {
  return team.holes.some((hole) => hole !== "");
}

export function resolveScrambleEntryMode(
  responseMode: ScrambleScoreEntryMode | null | undefined,
  roundMode: ScrambleScoreEntryMode | null | undefined,
  teams: ScrambleTeamRow[],
): ScrambleScoreEntryMode {
  if (responseMode === "HOLES" || responseMode === "TOTAL") {
    return responseMode;
  }

  if (roundMode === "HOLES" || roundMode === "TOTAL") {
    return roundMode;
  }

  return teams.some(hasAnyScrambleHoleScore) ? "HOLES" : "TOTAL";
}

export function buildScrambleSnapshot(
  entryMode: ScrambleScoreEntryMode,
  teams: ScrambleTeamRow[],
): string {
  return JSON.stringify({
    entryMode,
    teams: teams.map((team) => ({
      roundTeamId: team.roundTeamId,
      totalScore: team.totalScore.trim(),
      holes: team.holes.map((value) => value.trim()),
    })),
  });
}

export function buildScrambleSaveRequest(
  entryMode: ScrambleScoreEntryMode,
  teams: ScrambleTeamRow[],
): SaveRoundScrambleScoresRequest {
  return {
    entryMode,
    teams: teams.map((team) => ({
      roundTeamId: team.roundTeamId,
      totalScore: team.totalScore === "" ? null : Number(team.totalScore),
      holes:
        entryMode === "HOLES"
          ? team.holes.map((value) => (value === "" ? null : Number(value)))
          : [],
    })),
  };
}

export function isScrambleTeamComplete(
  team: ScrambleTeamRow,
  entryMode: ScrambleScoreEntryMode,
): boolean {
  if (entryMode === "TOTAL") {
    return team.totalScore !== "";
  }

  return team.holes.every((hole) => hole !== "");
}
