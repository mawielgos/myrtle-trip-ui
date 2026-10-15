import type { RoundGroupResponse, RoundPlayerStatusResponse } from "../types/round";

export function formatRoundDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export function formatTeeTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const parts = value.split(":");
  if (parts.length < 2) {
    return value;
  }

  const date = new Date();
  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatHandicap(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return String(value);
}

export function formatStartingHole(value?: number | null): string {
  if (value === 10) {
    return "#10";
  }

  if (value === 1) {
    return "#1";
  }

  return "—";
}

type TeeSheetStartTypeMessage = {
  label: string;
  description: string;
};

export function getTeeSheetStartTypeMessage(
  groups: Array<{ startingHole?: number | null }>
): TeeSheetStartTypeMessage {
  const startingHoles = Array.from(
    new Set(
      groups
        .map((group) => group.startingHole)
        .filter((hole): hole is number => hole != null)
    )
  ).sort((a, b) => a - b);

  if (groups.length === 0 || startingHoles.length === 0) {
    return {
      label: "Start Type: Not Configured",
      description: "No tee sheet starting holes have been configured yet.",
    };
  }

  if (startingHoles.length === 1 && startingHoles[0] === 1) {
    return {
      label: "Start Type: Tee Times",
      description: "All groups start on Hole #1.",
    };
  }

  if (
    startingHoles.length === 2 &&
    startingHoles.includes(1) &&
    startingHoles.includes(10)
  ) {
    return {
      label: "Start Type: Split Tees",
      description: "Groups start on Holes #1 and #10.",
    };
  }

  return {
    label: "Start Type: Shotgun Start",
    description: "Groups start on assigned holes.",
  };
}

export function sortTeeSheetGroups(groups: RoundGroupResponse[]): RoundGroupResponse[] {
  return [...groups].sort((a, b) => {
    if (a.teeTime && b.teeTime && a.teeTime !== b.teeTime) {
      return a.teeTime.localeCompare(b.teeTime);
    }
    if (a.teeTime && !b.teeTime) {
      return -1;
    }
    if (!a.teeTime && b.teeTime) {
      return 1;
    }
    return a.groupNumber - b.groupNumber;
  });
}

export function buildTeeSheetCsvRows(
  groups: RoundGroupResponse[],
  playersById: Map<number, RoundPlayerStatusResponse>
): Array<Array<string | number | null | undefined>> {
  const rows: Array<Array<string | number | null | undefined>> = [
    ["Group", "Tee Time", "Starting Hole", "Player", "Tee", "Course Handicap", "Playing Handicap"],
  ];

  groups.forEach((group) => {
    (group.players ?? []).forEach((groupPlayer) => {
      const player = playersById.get(groupPlayer.playerId);
      rows.push([
        group.groupNumber,
        formatTeeTime(group.teeTime),
        formatStartingHole(group.startingHole),
        groupPlayer.playerName,
        player?.roundTeeName ?? "",
        player?.courseHandicap ?? "",
        player?.playingHandicap ?? "",
      ]);
    });
  });
  return rows;
}
