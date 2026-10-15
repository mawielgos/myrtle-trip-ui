import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import TripPlayerMaintenancePage from "./TripPlayerMaintenancePage";

const mocks = vi.hoisted(() => ({
  tripId: "7" as string | undefined,
  navigate: vi.fn(),
  getTripDetail: vi.fn(),
  getTripPlayers: vi.fn(),
  getTripRounds: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/tripApi", () => ({
  getTripDetail: mocks.getTripDetail,
  getTripPlayers: mocks.getTripPlayers,
  getTripRounds: mocks.getTripRounds,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/trip/TripRosterPanel", () => ({
  default: (props: {
    players: Array<{ displayName: string }>;
    activePlayers: Array<{ displayName: string }>;
    participationLocked: boolean;
    participationLockReason: string;
    tripLocked: boolean;
    tripId: number;
    unresolvedGhinFixCount: number;
    handicapsEnabled: boolean;
    handicapMethod: string;
    showPlayerMaintenanceButton: boolean;
    onNavigate: (path: string) => void;
    onPlayerHandicapSaved: () => void;
    onPlayersUpdated: (players: Array<{ displayName: string }>) => void;
  }) => (
    <section data-testid="roster"
      data-trip-id={props.tripId}
      data-locked={String(props.participationLocked)}
      data-lock-reason={props.participationLockReason}
      data-trip-locked={String(props.tripLocked)}
      data-ghin-fixes={props.unresolvedGhinFixCount}
      data-handicaps-enabled={String(props.handicapsEnabled)}
      data-handicap-method={props.handicapMethod}
      data-show-maintenance={String(props.showPlayerMaintenanceButton)}>
      <div>Players: {props.players.map(p => p.displayName).join(", ")}</div>
      <div>Active: {props.activePlayers.map(p => p.displayName).join(", ")}</div>
      <button onClick={() => props.onNavigate("/players/3")}>Roster navigate</button>
      <button onClick={() => props.onPlayerHandicapSaved()}>Saved handicap</button>
      <button onClick={() => props.onPlayersUpdated([{ displayName: "Updated Player" }])}>Update players</button>
    </section>
  ),
}));

const trip = (overrides: Record<string, unknown> = {}) => ({
  tripId: 7, tripName: "Autumn Open", status: "IN_PROGRESS", correctionMode: false,
  unresolvedGhinFixCount: 2, handicapsEnabled: true, handicapMethod: "USGA",
  ...overrides,
});
const players = () => [
  { playerId: 1, displayName: "Alice", active: true, participationStatus: "ACTIVE" },
  { playerId: 2, displayName: "Bob", active: false, participationStatus: "ACTIVE" },
  { playerId: 3, displayName: "Chris", active: true, participationStatus: "WITHDRAWN" },
  { playerId: 4, displayName: "Dana", active: true, participationStatus: null },
];
const rounds = (finalized = false) => [{ roundId: 10, finalized }, { roundId: 11, finalized: false }];
const roster = () => screen.getByTestId("roster");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "7";
  mocks.getTripDetail.mockResolvedValue(trip());
  mocks.getTripPlayers.mockResolvedValue(players());
  mocks.getTripRounds.mockResolvedValue(rounds());
});
afterEach(cleanup);

async function loaded() {
  render(<TripPlayerMaintenancePage />);
  await screen.findByRole("heading", { name: "Event Player Maintenance" });
}

describe("Trip player maintenance characterization (before extraction)", () => {
  it("shows loading then loads event, players, and rounds for the route id", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getTripDetail.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<TripPlayerMaintenancePage />);
    expect(screen.getByText("Loading event player maintenance...")).toBeInTheDocument();
    resolve(trip());
    await screen.findByRole("heading", { name: "Event Player Maintenance" });
    expect(mocks.getTripDetail).toHaveBeenCalledWith(7);
    expect(mocks.getTripPlayers).toHaveBeenCalledWith(7);
    expect(mocks.getTripRounds).toHaveBeenCalledWith(7);
  });

  it("shows active and total counts and excludes inactive or withdrawn players", async () => {
    await loaded();
    expect(screen.getByText("Autumn Open · 2 active / 4 total")).toBeInTheDocument();
    expect(roster()).toHaveTextContent("Active: Alice, Dana");
    expect(roster()).toHaveTextContent("Players: Alice, Bob, Chris, Dana");
  });

  it("passes handicap and GHIN settings to the roster and hides redundant maintenance button", async () => {
    await loaded();
    expect(roster()).toHaveAttribute("data-trip-id", "7");
    expect(roster()).toHaveAttribute("data-ghin-fixes", "2");
    expect(roster()).toHaveAttribute("data-handicaps-enabled", "true");
    expect(roster()).toHaveAttribute("data-handicap-method", "USGA");
    expect(roster()).toHaveAttribute("data-show-maintenance", "false");
  });

  it("keeps participation editable when event is in progress and some rounds remain open", async () => {
    await loaded();
    expect(roster()).toHaveAttribute("data-locked", "false");
    expect(roster()).toHaveAttribute("data-trip-locked", "false");
  });

  it("locks participation when all created rounds are finalized", async () => {
    mocks.getTripRounds.mockResolvedValue([{ roundId: 10, finalized: true }, { roundId: 11, finalized: true }]);
    await loaded();
    expect(roster()).toHaveAttribute("data-locked", "true");
    expect(roster().getAttribute("data-lock-reason")).toContain("all created rounds are finalized");
  });

  it("locks a complete event unless correction mode is enabled", async () => {
    mocks.getTripDetail.mockResolvedValueOnce(trip({ status: "COMPLETE" }));
    await loaded();
    expect(roster()).toHaveAttribute("data-locked", "true");
    expect(roster()).toHaveAttribute("data-trip-locked", "true");
    expect(roster().getAttribute("data-lock-reason")).toContain("event is complete");
    cleanup();
    mocks.getTripDetail.mockResolvedValue(trip({ status: "COMPLETE", correctionMode: true }));
    await loaded();
    expect(roster()).toHaveAttribute("data-locked", "false");
    expect(roster()).toHaveAttribute("data-trip-locked", "false");
  });

  it("provides event navigation, roster navigation, and player update callbacks", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Event Detail" }));
    fireEvent.click(screen.getByRole("button", { name: "Roster navigate" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/trips/7");
    expect(mocks.navigate).toHaveBeenCalledWith("/players/3");
    fireEvent.click(screen.getByRole("button", { name: "Update players" }));
    expect(roster()).toHaveTextContent("Players: Updated Player");
    expect(roster()).toHaveTextContent("Active: ");
  });

  it("reloads event data after saving a roster handicap", async () => {
    await loaded();
    mocks.getTripPlayers.mockResolvedValueOnce([{ displayName: "New Roster", active: true, participationStatus: "ACTIVE" }]);
    fireEvent.click(screen.getByRole("button", { name: "Saved handicap" }));
    await waitFor(() => expect(mocks.getTripPlayers).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Autumn Open · 1 active / 1 total")).toBeInTheDocument();
  });

  it("handles invalid event ids and API error message precedence", async () => {
    mocks.tripId = undefined;
    render(<TripPlayerMaintenancePage />);
    expect(await screen.findByText("Invalid event id.")).toBeInTheDocument();
    expect(mocks.getTripDetail).not.toHaveBeenCalled();
    cleanup();
    mocks.tripId = "7";
    mocks.getTripPlayers.mockRejectedValueOnce({ response: { data: { message: "Roster unavailable" } } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(<TripPlayerMaintenancePage />);
      expect(await screen.findByText("Roster unavailable")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Event Detail" }));
      expect(mocks.navigate).toHaveBeenCalledWith("/trips/7");
    } finally { spy.mockRestore(); }
  });
});
