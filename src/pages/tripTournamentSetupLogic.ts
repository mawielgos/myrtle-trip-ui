import type { TripTournamentRound, TripTournamentSetup } from "../types/trip";

export const DEFAULT_TOURNAMENT_NAME = "Multi-Round Tournament";
export const DEFAULT_STANDINGS_LABEL = "Tournament Standings";
export const DEFAULT_LOW_NET_NAME = "2-Round Low Net";
export const DEFAULT_LOW_GROSS_NAME = "2-Round Low Gross";

export type TournamentSetupDraft = {
  enabled: boolean;
  tournamentName: string;
  standingsLabel: string;
  lowNetEnabled: boolean;
  lowGrossEnabled: boolean;
  lowNetName: string;
  lowGrossName: string;
  includedPlannedRoundIds: number[];
};

export function buildDraft(setup: TripTournamentSetup): TournamentSetupDraft {
  return {
    enabled: setup.enabled === true,
    tournamentName: setup.name?.trim() || DEFAULT_TOURNAMENT_NAME,
    standingsLabel: setup.standingsLabel?.trim() || DEFAULT_STANDINGS_LABEL,
    lowNetEnabled: setup.lowNetEnabled !== false,
    lowGrossEnabled: setup.lowGrossEnabled === true,
    lowNetName: setup.lowNetName?.trim() || DEFAULT_LOW_NET_NAME,
    lowGrossName: setup.lowGrossName?.trim() || DEFAULT_LOW_GROSS_NAME,
    includedPlannedRoundIds: setup.rounds
      .filter((round) => round.included === true && round.plannedRoundId != null)
      .map((round) => round.plannedRoundId),
  };
}

export function buildSnapshot(draft: TournamentSetupDraft): string {
  return JSON.stringify({
    enabled: draft.enabled,
    tournamentName: draft.tournamentName.trim(),
    standingsLabel: draft.standingsLabel.trim(),
    lowNetEnabled: draft.lowNetEnabled,
    lowGrossEnabled: draft.lowGrossEnabled,
    lowNetName: draft.lowNetName.trim(),
    lowGrossName: draft.lowGrossName.trim(),
    includedPlannedRoundIds: [...draft.includedPlannedRoundIds].sort((a, b) => a - b),
  });
}

export function isIncluded(draft: TournamentSetupDraft, plannedRoundId: number): boolean {
  return draft.includedPlannedRoundIds.includes(plannedRoundId);
}

export function getSortedRounds(setup: TripTournamentSetup | null): TripTournamentRound[] {
  return [...(setup?.rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);
}

export function getConfiguredRounds(rounds: TripTournamentRound[]): TripTournamentRound[] {
  return rounds.filter((round) => round.configured === true);
}

export function getTournamentValidationError(
  draft: TournamentSetupDraft,
  tournamentSetupAvailable: boolean,
): string | null {
  if (!tournamentSetupAvailable && draft.enabled) {
    return "Configure at least two non-scramble planned rounds before setting up a multi-round tournament.";
  }
  if (!draft.enabled) return null;
  if (!draft.tournamentName.trim()) return "Tournament name is required.";
  if (!draft.standingsLabel.trim()) return "Standings label is required.";
  if (draft.lowNetEnabled && !draft.lowNetName.trim()) return "Low Net competition name is required.";
  if (draft.lowGrossEnabled && !draft.lowGrossName.trim()) return "Low Gross competition name is required.";
  if (!draft.lowNetEnabled && !draft.lowGrossEnabled) {
    return "Select at least one tournament competition: Low Net, Low Gross, or both.";
  }
  if (draft.includedPlannedRoundIds.length < 2) {
    return "A multi-round tournament needs at least two included rounds.";
  }
  return null;
}

export function buildTournamentSavePayload(draft: TournamentSetupDraft) {
  return {
    enabled: draft.enabled,
    name: draft.tournamentName.trim() || DEFAULT_TOURNAMENT_NAME,
    standingsLabel: draft.standingsLabel.trim() || DEFAULT_STANDINGS_LABEL,
    lowNetEnabled: draft.enabled ? draft.lowNetEnabled : true,
    lowGrossEnabled: draft.enabled ? draft.lowGrossEnabled : false,
    lowNetName: draft.lowNetName.trim() || DEFAULT_LOW_NET_NAME,
    lowGrossName: draft.lowGrossName.trim() || DEFAULT_LOW_GROSS_NAME,
    includedPlannedRoundIds: draft.enabled ? draft.includedPlannedRoundIds : [],
  };
}
