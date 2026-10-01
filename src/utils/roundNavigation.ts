import type { RoundStatus } from "../types/round";

export type RoundWorkflowAction = {
  label: string;
  path: string;
};

export function getScoreEntryActionLabel(status?: Pick<RoundStatus, "finalized" | "tripLocked"> | null): string {
  if (status?.finalized && status.tripLocked) {
    return "View Scores";
  }

  if (status?.finalized) {
    return "Edit Corrections";
  }

  return "Scoring";
}

export function buildScoreEntryAction(
  roundId: number | string,
  status?: Pick<RoundStatus, "finalized" | "tripLocked"> | null,
): RoundWorkflowAction {
  return {
    label: getScoreEntryActionLabel(status),
    path: `/rounds/${roundId}/scoring`,
  };
}

export function getSetupActionLabel(status?: Pick<RoundStatus, "finalized" | "tripLocked"> | null): string {
  if (status?.finalized || status?.tripLocked) {
    return "View Round";
  }

  return "Open Round";
}

export function getGroupsActionLabel(status?: Pick<RoundStatus, "finalized" | "tripLocked"> | null): string {
  if (status?.finalized || status?.tripLocked) {
    return "View Groups";
  }

  return "Groups";
}

export function getTeamsActionLabel(status?: Pick<RoundStatus, "finalized" | "tripLocked"> | null): string {
  if (status?.finalized || status?.tripLocked) {
    return "View Teams";
  }

  return "Teams";
}
