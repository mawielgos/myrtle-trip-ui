import { describe, expect, it } from "vitest";
import type { PlayerDetail, PlayerListItem } from "../types/player";
import {
  emptyForm,
  formatValue,
  buildDisplayName,
  normalizeGender,
  formatGender,
  buildSubLabel,
  buildFormFromPlayer,
  buildComparableForm,
  hasFormChanges,
  countActivePlayers,
  filterVisiblePlayers,
} from "./playerAdminLogic";

const player = (playerId: number, overrides: Partial<PlayerListItem> = {}): PlayerListItem => ({
  playerId, displayName: `Player ${playerId}`, active: true, ...overrides,
});

const detail = (overrides: Partial<PlayerDetail> = {}): PlayerDetail => ({
  playerId: 7, displayName: "Existing label", firstName: "Jane", lastName: "Doe",
  active: true, ...overrides,
});

describe("Player administration characterization", () => {
  it("starts a new player with blank editable fields, active status and male gender", () => {
    expect(emptyForm()).toEqual({
      firstName: "", lastName: "", displayName: "", ghinNumber: "", active: true,
      email: "", cell: "", venmoId: "", zelleId: "", handicapMethod: "", gender: "M",
    });
    expect(emptyForm()).not.toBe(emptyForm());
  });

  it("formats missing and whitespace-only display values as an em dash", () => {
    expect(formatValue(undefined)).toBe("—");
    expect(formatValue(null)).toBe("—");
    expect(formatValue("  ")).toBe("—");
    expect(formatValue(" Name ")).toBe(" Name ");
  });

  it("builds the display name from trimmed first and last names", () => {
    expect(buildDisplayName(" Jane ", " Doe ")).toBe("Jane Doe");
    expect(buildDisplayName(" ", "Doe")).toBe("Doe");
    expect(buildDisplayName("Jane", " ")).toBe("Jane");
    expect(buildDisplayName(" ", " ")).toBe("");
  });

  it("defaults unknown or missing gender to male, with female explicitly selected", () => {
    expect(normalizeGender("F")).toBe("F");
    for (const value of [null, undefined, "", "M", "f", "X"]) {
      expect(normalizeGender(value)).toBe("M");
    }
    expect(formatGender("F")).toBe("Female");
    expect(formatGender(null)).toBe("Male");
  });

  it("creates list subtitle with alternate full name, omitting duplicate name", () => {
    expect(buildSubLabel(player(1, { displayName: "J. Doe", firstName: "Jane", lastName: "Doe" }))).toBe("Jane Doe");
    expect(buildSubLabel(player(1, { displayName: "Jane Doe", firstName: "Jane", lastName: "Doe" }))).toBe("");
    expect(buildSubLabel(player(1))).toBe("");
  });

  it("loads editable form from player detail, recomputing name and defaulting missing fields", () => {
    expect(buildFormFromPlayer(detail({ firstName: " Jane ", lastName: " Doe ", active: false, gender: "F" }))).toEqual({
      firstName: " Jane ", lastName: " Doe ", displayName: "Jane Doe", ghinNumber: "",
      active: false, email: "", cell: "", venmoId: "", zelleId: "", handicapMethod: "", gender: "F",
    });
    expect(buildFormFromPlayer(detail({ firstName: null, lastName: null, active: true, gender: null })).displayName).toBe("");
  });

  it("normalizes comparable form without mutating user-entered values", () => {
    const form = { ...emptyForm(), firstName: " Jane ", lastName: " Doe ", displayName: "Old",
      ghinNumber: " 123 ", email: " jane@example.com ", cell: " 555 ",
      venmoId: " @janedoe ", zelleId: " zelle ", gender: "unknown" };
    expect(buildComparableForm(form)).toEqual({ ...form, firstName: "Jane", lastName: "Doe",
      displayName: "Jane Doe", ghinNumber: "123", email: "jane@example.com", cell: "555",
      venmoId: "@janedoe", zelleId: "zelle", gender: "M" });
    expect(form.firstName).toBe(" Jane ");
    expect(form.displayName).toBe("Old");
  });

  it("does not mark a loading form or whitespace-only edits as dirty", () => {
    const original = { ...emptyForm(), firstName: "Jane", lastName: "Doe", displayName: "Jane Doe" };
    expect(hasFormChanges({ ...original, firstName: "Changed" }, original, true)).toBe(false);
    expect(hasFormChanges({ ...original, firstName: " Jane ", displayName: "Different" }, original, false)).toBe(false);
    expect(hasFormChanges({ ...original, firstName: "Janet" }, original, false)).toBe(true);
    expect(hasFormChanges({ ...original, active: false }, original, false)).toBe(true);
  });

  it("counts only active players and handles an empty list", () => {
    expect(countActivePlayers([player(1), player(2, { active: false }), player(3)])).toBe(2);
    expect(countActivePlayers([])).toBe(0);
  });

  it("filters active players when requested, preserving source order", () => {
    const players = [player(1), player(2, { active: false }), player(3)];
    expect(filterVisiblePlayers(players, true, "").map(x => x.playerId)).toEqual([1, 3]);
    expect(filterVisiblePlayers(players, false, " ").map(x => x.playerId)).toEqual([1, 2, 3]);
    expect(players.map(x => x.playerId)).toEqual([1, 2, 3]);
  });

  it("matches case-insensitively against name, contact, GHIN, gender and id", () => {
    const players = [player(12, {
      displayName: "J. Smith", firstName: "Jane", lastName: "Smith", email: "Jane@Example.com",
      ghinNumber: "999123", cell: "312-555-0100", gender: "F", handicapMethod: "GHIN",
    }), player(27, { displayName: "Bob Jones", gender: "M" })];
    for (const query of ["j. smith", "JANE", "smith", "@example", "999123", "555-0100", "female", "GHIN", "12"]) {
      expect(filterVisiblePlayers(players, false, ` ${query} `).map(x => x.playerId)).toEqual([12]);
    }
    expect(filterVisiblePlayers(players, false, "not-a-player")).toEqual([]);
    expect(filterVisiblePlayers(players, true, "bob").map(x => x.playerId)).toEqual([27]);
  });

  it("does not return inactive search matches when active-only is enabled", () => {
    const players = [player(1, { displayName: "Ann", active: false }), player(2, { displayName: "Anne", active: true })];
    expect(filterVisiblePlayers(players, true, "Ann").map(x => x.playerId)).toEqual([2]);
    expect(filterVisiblePlayers(players, false, "Ann").map(x => x.playerId)).toEqual([1, 2]);
  });
});
