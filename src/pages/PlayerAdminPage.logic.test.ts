import { describe, expect, it } from "vitest";
import type { PlayerDetail, PlayerListItem, SavePlayerRequest } from "../types/player";
import { playerAdminTestApi as api } from "./PlayerAdminPage";

function player(overrides: Partial<PlayerListItem> = {}): PlayerListItem {
  return {
    playerId: 1,
    displayName: "Mike Smith",
    firstName: "Mike",
    lastName: "Smith",
    ghinNumber: "1234567",
    active: true,
    handicapMethod: "GHIN",
    email: "mike@example.com",
    cell: "555-1000",
    gender: "M",
    ...overrides,
  };
}

function detail(overrides: Partial<PlayerDetail> = {}): PlayerDetail {
  return {
    playerId: 7,
    displayName: "Jane Doe",
    firstName: " Jane ",
    lastName: " Doe ",
    ghinNumber: " 7654321 ",
    active: true,
    email: " jane@example.com ",
    cell: " 555-2000 ",
    venmoId: " @jane ",
    zelleId: " jane@zelle ",
    handicapMethod: "GHIN",
    gender: "F",
    ...overrides,
  };
}

function form(overrides: Partial<SavePlayerRequest> = {}): SavePlayerRequest {
  return {
    firstName: "Mike",
    lastName: "Smith",
    displayName: "Mike Smith",
    ghinNumber: "123",
    active: true,
    email: "mike@example.com",
    cell: "555",
    venmoId: "@mike",
    zelleId: "mike@zelle",
    handicapMethod: "GHIN",
    gender: "M",
    ...overrides,
  };
}

describe("Player admin pure logic", () => {
  it("builds the default new-player form", () => {
    expect(api.emptyForm()).toEqual({
      firstName: "",
      lastName: "",
      displayName: "",
      ghinNumber: "",
      active: true,
      email: "",
      cell: "",
      venmoId: "",
      zelleId: "",
      handicapMethod: "",
      gender: "M",
    });
  });

  it("formats blank values, display names, and gender fallbacks", () => {
    expect(api.formatValue("   ")).toBe("—");
    expect(api.formatValue(" abc ")).toBe(" abc ");
    expect(api.buildDisplayName("  Mike ", " Smith  ")).toBe("Mike Smith");
    expect(api.normalizeGender("F")).toBe("F");
    expect(api.normalizeGender("X")).toBe("M");
    expect(api.formatGender("F")).toBe("Female");
    expect(api.formatGender(undefined)).toBe("Male");
  });

  it("builds the player sub-label without duplicating the display name", () => {
    expect(api.buildSubLabel(player())).toBe("GHIN History");
    expect(api.buildSubLabel(player({ displayName: "M. Smith" }))).toBe("Mike Smith • GHIN History");
    expect(api.buildSubLabel(player({ handicapMethod: "" }))).toBe("");
  });

  it("hydrates an edit form from player detail with normalized method and gender", () => {
    expect(api.buildFormFromPlayer(detail())).toEqual({
      firstName: " Jane ",
      lastName: " Doe ",
      displayName: "Jane Doe",
      ghinNumber: " 7654321 ",
      active: true,
      email: " jane@example.com ",
      cell: " 555-2000 ",
      venmoId: " @jane ",
      zelleId: " jane@zelle ",
      handicapMethod: "GHIN_HISTORY",
      gender: "F",
    });
  });

  it("normalizes comparable forms before dirty checking", () => {
    const normalized = api.buildComparableForm(
      form({ firstName: " Mike ", lastName: " Smith ", displayName: "ignored", handicapMethod: "GHIN", gender: "X" }),
    );
    expect(normalized.firstName).toBe("Mike");
    expect(normalized.lastName).toBe("Smith");
    expect(normalized.displayName).toBe("Mike Smith");
    expect(normalized.handicapMethod).toBe("GHIN_HISTORY");
    expect(normalized.gender).toBe("M");
  });

  it("ignores whitespace-only edits and loading state when detecting changes", () => {
    const initial = form();
    expect(api.hasFormChanges(form({ firstName: " Mike ", email: " mike@example.com " }), initial, false)).toBe(false);
    expect(api.hasFormChanges(form({ cell: "999" }), initial, false)).toBe(true);
    expect(api.hasFormChanges(form({ cell: "999" }), initial, true)).toBe(false);
  });

  it("counts active players", () => {
    const players = [player({ playerId: 1 }), player({ playerId: 2, active: false }), player({ playerId: 3 })];
    expect(api.countActivePlayers(players)).toBe(2);
  });

  it("filters inactive players when Only Active Players is enabled", () => {
    const players = [player({ playerId: 1 }), player({ playerId: 2, displayName: "Inactive One", active: false })];
    expect(api.filterVisiblePlayers(players, true, "").map((p) => p.playerId)).toEqual([1]);
    expect(api.filterVisiblePlayers(players, false, "").map((p) => p.playerId)).toEqual([1, 2]);
  });

  it("searches across names, contact fields, handicap method, gender label, and player id", () => {
    const players = [
      player({ playerId: 17, displayName: "Mike Smith", handicapMethod: "GHIN", gender: "M" }),
      player({ playerId: 42, displayName: "Jane Doe", firstName: "Jane", lastName: "Doe", email: "jane@sample.com", ghinNumber: "998877", cell: "312-555-2000", handicapMethod: "DB_SCORE_HISTORY", gender: "F" }),
    ];
    expect(api.filterVisiblePlayers(players, false, "female").map((p) => p.playerId)).toEqual([42]);
    expect(api.filterVisiblePlayers(players, false, "db_score_history").map((p) => p.playerId)).toEqual([42]);
    expect(api.filterVisiblePlayers(players, false, "998877").map((p) => p.playerId)).toEqual([42]);
    expect(api.filterVisiblePlayers(players, false, "312-555").map((p) => p.playerId)).toEqual([42]);
    expect(api.filterVisiblePlayers(players, false, "42").map((p) => p.playerId)).toEqual([42]);
    expect(api.filterVisiblePlayers(players, false, "  JANE  ").map((p) => p.playerId)).toEqual([42]);
  });
});
