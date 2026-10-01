export function formatGameDescription(value: string | null | undefined, scrambleTeamSize?: number | null): string {
  if (!value) {
    return "—";
  }

  switch (value) {
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
      return `${scrambleTeamSize ?? 4}-Person Scramble`;
    case "STROKE_PLAY":
      return "Stroke Play";
    case "FOUR_DAY_INDIVIDUAL":
      return "Multi-Round Tournament";
    default:
      return value
        .toLowerCase()
        .split("_")
        .map((part) => {
          if (part.length === 0) {
            return part;
          }
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(" ");
  }
}
