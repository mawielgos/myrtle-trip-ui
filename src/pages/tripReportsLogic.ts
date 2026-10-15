import type { TripRoundListItem, TripTournamentSetup } from "../types/trip";

export type TournamentCompetitionReportLink = {
  competition: "LOW_NET" | "LOW_GROSS";
  label: string;
};

export function cleanCompetitionName(
  value: string | null | undefined,
  fallback: string,
): string {
  const configured = value?.trim();
  return configured && configured.length > 0 ? configured : fallback;
}

export function getTournamentCompetitionLinks(
  setup: TripTournamentSetup | null,
): TournamentCompetitionReportLink[] {
  if (setup?.enabled !== true) return [];

  const links: TournamentCompetitionReportLink[] = [];
  if (setup.lowNetEnabled !== false) {
    links.push({ competition: "LOW_NET", label: cleanCompetitionName(setup.lowNetName, "Low Net") });
  }
  if (setup.lowGrossEnabled === true) {
    links.push({ competition: "LOW_GROSS", label: cleanCompetitionName(setup.lowGrossName, "Low Gross") });
  }
  return links;
}

export function getFinalizedRounds(rounds: TripRoundListItem[]): TripRoundListItem[] {
  return rounds.filter((round) => round.finalized === true);
}

export function shouldShowTournamentReports(
  setup: TripTournamentSetup | null,
  links: TournamentCompetitionReportLink[],
): boolean {
  if (setup?.enabled !== true || links.length === 0) return false;
  return (setup.rounds ?? []).some((round) => round.included === true);
}

export function roundStatusLabel(round: TripRoundListItem): "Finalized" | "Open" {
  return round.finalized ? "Finalized" : "Open";
}
