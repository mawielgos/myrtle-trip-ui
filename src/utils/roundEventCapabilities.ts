import type { RoundReadinessResponse, RoundStatus } from "../types/round";

type CapabilitySource =
  | RoundReadinessResponse
  | Pick<RoundStatus, "capabilities" | "format">
  | null
  | undefined;

function asReadiness(source: CapabilitySource): RoundReadinessResponse | null {
  if (!source) {
    return null;
  }

  if ("readyForScoring" in source || "requiresTeams" in source) {
    return source as RoundReadinessResponse;
  }

  return null;
}

function legacyFormatFromSource(source: CapabilitySource, fallback?: string | null): string | null {
  if (fallback != null) {
    return fallback;
  }

  if (source && "format" in source) {
    return source.format ?? null;
  }

  return null;
}

export function roundRequiresTeams(
  source?: CapabilitySource,
  legacyFormat?: string | null,
): boolean {
  const readiness = asReadiness(source);
  if (readiness?.requiresTeams != null) {
    return Boolean(readiness.requiresTeams);
  }

  const format = legacyFormatFromSource(source, legacyFormat);
  return (
    format === "MIDDLE_MAN" ||
    format === "ONE_TWO_THREE" ||
    format === "TWO_MAN_LOW_NET" ||
    format === "THREE_LOW_NET" ||
    format === "TEAM_TWO_LOW_NET" ||
    format === "TEAM_THREE_LOW_NET" ||
    format === "TEAM_SCRAMBLE"
  );
}

export function roundHasScrambleEvent(
  source?: CapabilitySource,
  legacyFormat?: string | null,
): boolean {
  const readiness = asReadiness(source);
  if (readiness?.hasScrambleEvent != null) {
    return Boolean(readiness.hasScrambleEvent);
  }

  const format = legacyFormatFromSource(source, legacyFormat);
  return format === "TEAM_SCRAMBLE";
}

export function roundHasTwoManLowNetEvent(
  source?: CapabilitySource,
  legacyFormat?: string | null,
): boolean {
  const readiness = asReadiness(source);
  if (readiness?.hasTwoManLowNetEvent != null) {
    return Boolean(readiness.hasTwoManLowNetEvent);
  }

  const format = legacyFormatFromSource(source, legacyFormat);
  return format === "TWO_MAN_LOW_NET" || format === "TEAM_TWO_MAN_LOW_NET";
}

export function roundHasTeamEvents(
  source?: CapabilitySource,
  legacyFormat?: string | null,
): boolean {
  const readiness = asReadiness(source);
  if (readiness?.hasTeamEvents != null) {
    return Boolean(readiness.hasTeamEvents);
  }

  return roundRequiresTeams(source, legacyFormat);
}

export function roundHasIndividualEvents(
  source?: CapabilitySource,
  legacyFormat?: string | null,
): boolean {
  const readiness = asReadiness(source);
  if (readiness?.hasIndividualEvents != null) {
    return Boolean(readiness.hasIndividualEvents);
  }

  const format = legacyFormatFromSource(source, legacyFormat);
  return format === "STROKE_PLAY" || format === "INDIVIDUAL_LOW_NET" || format === "INDIVIDUAL_LOW_GROSS";
}

export function roundRequiresPlayerScorecards(
  source?: CapabilitySource,
  legacyFormat?: string | null,
): boolean {
  const readiness = asReadiness(source);
  if (readiness?.requiresPlayerScorecards != null) {
    return Boolean(readiness.requiresPlayerScorecards);
  }

  return !roundHasScrambleEvent(source, legacyFormat);
}
