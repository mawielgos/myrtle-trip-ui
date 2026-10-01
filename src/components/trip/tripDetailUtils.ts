import type { CSSProperties } from "react";
import type {
  TripDetail,
  TripPlannedRound,
  TripReadiness,
  TripRoundListItem,
} from "../../types/trip";
import { formatGameDescription } from "../../utils/roundDisplay";

export interface TripPanelAction {
  label: string;
  path: string;
}

export interface TripPanelButtonAction extends TripPanelAction {
  primary: boolean;
}

export interface ReadinessBanner {
  label: string;
  background: string;
  border: string;
  color: string;
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return "Unknown";
  }

  if (status === "NOT_STARTED") {
    return "Not Started";
  }

  if (status === "PLANNING") {
    return "Planning";
  }

  if (status === "IN_PROGRESS") {
    return "In Progress";
  }

  if (status === "COMPLETE") {
    return "Complete";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function formatGameLabel(value: string | null | undefined): string {
  return formatGameDescription(value);
}

export function formatHandicapIndex(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }

  return value.toFixed(1);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }

  return `$${value}`;
}

export function getStatusBadgeStyle(
  status: string | null | undefined,
): CSSProperties {
  if (status === "IN_PROGRESS") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
      background: "#eaf2ff",
      color: "#1f4f99",
      border: "1px solid #bfd3f2",
    };
  }

  if (status === "COMPLETE") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
      background: "#eaf7ea",
      color: "#1f6b2a",
      border: "1px solid #b9dfbf",
    };
  }

  if (status === "PLANNING" || status === "NOT_STARTED") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
      background: "#f7f3e8",
      color: "#8a6700",
      border: "1px solid #e5d7a8",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#f3f3f3",
    color: "#555",
    border: "1px solid #ddd",
  };
}

export function buildCurrentRoundAction(
  trip: TripDetail,
  rounds: TripRoundListItem[],
): TripPanelAction | null {
  if (trip.currentRound) {
    if (trip.currentRound.finalized) {
      return {
        label: "View Current Round Results",
        path: `/rounds/${trip.currentRound.roundId}/results`,
      };
    }

    return {
      label: "Go To Current Round",
      path: `/rounds/${trip.currentRound.roundId}/open`,
    };
  }

  if (trip.status === "COMPLETE" && rounds.length > 0) {
    const finalizedRounds = rounds.filter((round) => round.finalized);
    const lastFinalizedRound =
      finalizedRounds.length > 0
        ? finalizedRounds[finalizedRounds.length - 1]
        : rounds[rounds.length - 1];

    return {
      label: "View Last Round Results",
      path: `/rounds/${lastFinalizedRound.roundId}/results`,
    };
  }

  return null;
}

export function buildRoundAction(round: TripRoundListItem): TripPanelAction {
  if (round.finalized) {
    return {
      label: "Results",
      path: `/rounds/${round.roundId}/results`,
    };
  }

  return {
    label: "Open",
    path: `/rounds/${round.roundId}/open`,
  };
}

export function buildPlannedRoundAction(
  tripId: number,
  plannedRound: TripPlannedRound,
  roundsByRoundNumber: Map<number, TripRoundListItem>,
): TripPanelButtonAction {
  const initializedRound = roundsByRoundNumber.get(plannedRound.roundNumber);

  if (initializedRound) {
    if (initializedRound.finalized) {
      return {
        label: "Results",
        path: `/rounds/${initializedRound.roundId}/results`,
        primary: false,
      };
    }

    return {
      label: "Open",
      path: `/rounds/${initializedRound.roundId}/open`,
      primary: true,
    };
  }

  return {
    label: "Plan",
    path: `/trips/${tripId}/planned-rounds?round=${plannedRound.roundNumber}`,
    primary: false,
  };
}

export function buildChecklistRowStyle(isReady: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "6px 0",
    color: isReady ? "#1f6b2a" : "#8a6700",
    fontSize: "14px",
  };
}

export function buildReadinessBanner(
  tripStatus: string | null | undefined,
  readiness: TripReadiness | null,
): ReadinessBanner {
  if (tripStatus === "IN_PROGRESS") {
    return {
      label: "Event Started",
      background: "#eaf2ff",
      border: "1px solid #bfd3f2",
      color: "#1f4f99",
    };
  }

  if (tripStatus === "COMPLETE") {
    return {
      label: "Event Complete",
      background: "#eaf7ea",
      border: "1px solid #b9dfbf",
      color: "#1f6b2a",
    };
  }

  if (readiness?.canStartTrip) {
    return {
      label: "Ready to Start",
      background: "#edf8f0",
      border: "1px solid #b7d7c0",
      color: "#1f6b2a",
    };
  }

  return {
    label: "Not Ready",
    background: "#fff8e1",
    border: "1px solid #e5d7a8",
    color: "#8a6700",
  };
}
