import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import PlayerAdminPage from "./PlayerAdminPage";
import type { PlayerListItem } from "../types/player";

const mocks = vi.hoisted(() => ({
  getPlayers: vi.fn(),
  setPlayerActive: vi.fn(),
  confirmDialog: vi.fn(),
}));
vi.mock("../api/playerApi", () => ({
  getPlayers: mocks.getPlayers,
  setPlayerActive: mocks.setPlayerActive,
}));
vi.mock("../components/common/AppDialog", () => ({
  useAppDialog: () => ({ confirmDialog: mocks.confirmDialog }),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("./PlayerEditDialog", () => ({
  default: ({ editor, onClose, onSaved }: {
    editor: { mode: string; playerId: number | null };
    onClose: () => void;
    onSaved: (message: string) => void | Promise<void>;
  }) => (
    <div data-testid="player-editor" data-mode={editor.mode} data-player-id={String(editor.playerId)}>
      <button onClick={onClose}>Close Editor</button>
      <button onClick={() => void onSaved("Player saved.")}>Save Editor</button>
    </div>
  ),
}));

const player = (overrides: Partial<PlayerListItem> = {}): PlayerListItem => ({
  playerId: 11,
  displayName: "Alice Smith",
  firstName: "Alice",
  lastName: "Smith",
  ghinNumber: "12345",
  email: "alice@example.com",
  cell: "312-555-0001",
  handicapMethod: "GHIN",
  gender: "F",
  active: true,
  ...overrides,
});
const players = () => [
  player(),
  player({ playerId: 22, displayName: "Bob Jones", firstName: "Bob", lastName: "Jones", active: false,
    ghinNumber: "45678", email: "bob@example.com", cell: "312-555-0002", gender: "M" }),
];
const searchInput = () => screen.getByPlaceholderText("Search players by name, gender, email, GHIN, cell, method, or ID") as HTMLInputElement;
const activeOnly = () => screen.getByRole("checkbox", { name: "Only Active Players" }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPlayers.mockResolvedValue(players());
  mocks.setPlayerActive.mockResolvedValue({});
  mocks.confirmDialog.mockResolvedValue(true);
});
afterEach(() => cleanup());

async function loaded() {
  render(<PlayerAdminPage />);
  expect(await screen.findByText("Alice Smith")).toBeInTheDocument();
  await waitFor(() => expect(mocks.getPlayers).toHaveBeenCalledTimes(1));
}

describe("Player administration page characterization (before controller extraction)", () => {
  it("loads players, defaults to active only, and shows correct summary and details", async () => {
    await loaded();
    expect(screen.getByRole("heading", { name: "Player Master" })).toBeInTheDocument();
    expect(screen.getByText("1 showing • 2 total • 1 active")).toBeInTheDocument();
    expect(activeOnly()).toBeChecked();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
  });

  it("shows inactive players and adjusts counts when the filter is disabled", async () => {
    await loaded();
    fireEvent.click(activeOnly());
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("2 showing • 2 total • 1 active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument();
  });

  it("searches across player identity and contact fields case-insensitively", async () => {
    await loaded();
    for (const query of ["  ALICE  ", "smith", "alice@example", "12345", "555-0001", "female", "GHIN", "11"]) {
      fireEvent.change(searchInput(), { target: { value: query } });
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("1 showing • 2 total • 1 active")).toBeInTheDocument();
    }
    fireEvent.change(searchInput(), { target: { value: "bob" } });
    expect(screen.getByText("No players match the current search.")).toBeInTheDocument();
    fireEvent.click(activeOnly());
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("distinguishes search, active-only and empty-list states", async () => {
    mocks.getPlayers.mockResolvedValueOnce([player({ active: false })]);
    render(<PlayerAdminPage />);
    expect(await screen.findByText("No active players found.")).toBeInTheDocument();
    fireEvent.change(searchInput(), { target: { value: "nothing" } });
    expect(screen.getByText("No players match the current search.")).toBeInTheDocument();
    fireEvent.click(activeOnly());
    fireEvent.change(searchInput(), { target: { value: "" } });
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("refreshes the player list from the API", async () => {
    await loaded();
    mocks.getPlayers.mockResolvedValueOnce([player({ displayName: "Updated Name" })]);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Updated Name")).toBeInTheDocument();
    expect(mocks.getPlayers).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("opens new and existing player editors and can close them", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add Player" }));
    expect(screen.getByTestId("player-editor")).toHaveAttribute("data-mode", "new");
    fireEvent.click(screen.getByRole("button", { name: "Close Editor" }));
    expect(screen.queryByTestId("player-editor")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("player-editor")).toHaveAttribute("data-mode", "edit");
    expect(screen.getByTestId("player-editor")).toHaveAttribute("data-player-id", "11");
  });

  it("requires confirmation and does nothing when deactivation is cancelled", async () => {
    mocks.confirmDialog.mockResolvedValueOnce(false);
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: "Deactivate Player", message: "Deactivate Alice Smith?", confirmText: "Deactivate", severity: "warning",
    })));
    expect(mocks.setPlayerActive).not.toHaveBeenCalled();
  });

  it("updates confirmed activation and deactivation and refreshes without clearing status", async () => {
    await loaded();
    mocks.getPlayers.mockResolvedValueOnce([player({ active: false }), players()[1]]);
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.setPlayerActive).toHaveBeenCalledWith(11, false));
    expect(await screen.findByText("Alice Smith was deactivated.")).toBeInTheDocument();
    expect(mocks.getPlayers).toHaveBeenCalledTimes(2);
    fireEvent.click(activeOnly());
    expect(screen.getAllByRole("button", { name: "Activate" }).length).toBe(2);
  });

  it("handles API failures and reloads after saving an edited player", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    mocks.getPlayers.mockResolvedValueOnce([player({ displayName: "Alice Updated" })]);
    fireEvent.click(screen.getByRole("button", { name: "Save Editor" }));
    expect(await screen.findByText("Alice Updated")).toBeInTheDocument();
    expect(screen.getByText("Player saved.")).toBeInTheDocument();
    expect(screen.queryByTestId("player-editor")).not.toBeInTheDocument();
    mocks.getPlayers.mockRejectedValueOnce({ response: { data: { message: "Player service unavailable" } } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Player service unavailable")).toBeInTheDocument();
  });
});
