import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PrizeSchedule, TripDetail, TripPlayer } from "../types/trip";
import TripPrizeSetupPage from "./TripPrizeSetupPage";

const mocks = vi.hoisted(() => ({
  tripId: "17" as string | undefined,
  getTripDetail: vi.fn(),
  getTripPlayers: vi.fn(),
  getTripPrizeSchedules: vi.fn(),
  saveTripPrizeSchedules: vi.fn(),
  recalculateTripPrizeWinnings: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useParams: () => ({ tripId: mocks.tripId }) }));
vi.mock("../api/tripApi", () => ({
  getTripDetail: mocks.getTripDetail,
  getTripPlayers: mocks.getTripPlayers,
  getTripPrizeSchedules: mocks.getTripPrizeSchedules,
  saveTripPrizeSchedules: mocks.saveTripPrizeSchedules,
  recalculateTripPrizeWinnings: mocks.recalculateTripPrizeWinnings,
}));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: () => () => true,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, actions }: { title: string; actions: React.ReactNode }) => (
    <header><h1>{title}</h1>{actions}</header>
  ),
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: () => <button type="button">Event Detail</button>,
}));

const trip = (overrides: Partial<TripDetail> = {}): TripDetail => ({
  tripId: 17, tripName: "Autumn Open", tripCode: "AUT", tripYear: 2026,
  entryFee: 100, tripStartDate: null, tripEndDate: null, plannedRoundCount: 2,
  handicapsEnabled: true, handicapMethod: "TRIP", initialized: true,
  status: "IN_PROGRESS", correctionMode: false, archived: false,
  currentRound: null, readiness: null, hasFemalePlayers: false, ...overrides,
});
const player = (id: number, active = true): TripPlayer => ({
  playerId: id, displayName: `Player ${id}`, ghinNumber: null,
  handicapIndex: null, frozenHandicapIndex: null, active,
  ghinHistoryCount: 0, dbScoreHistoryCount: 0, tripScoreCount: 0,
  usableHandicapIndex: false,
});
const schedule = (overrides: Partial<PrizeSchedule> = {}): PrizeSchedule => ({
  scheduleId: 1, tripId: 17, roundId: 2, roundNumber: 1,
  gameKey: "LOW_NET", gameName: "Low Net", resultScope: "PLAYER",
  payoutUnit: "PLAYER", payouts: [
    { payoutId: 2, finishingPlace: 2, amountPerPlayer: 15 },
    { payoutId: 1, finishingPlace: 1, amountPerPlayer: 25 },
  ], ...overrides,
});

// Ensure that each test starts with a fresh DOM even when automatic cleanup is disabled.
afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "17";
  mocks.getTripDetail.mockResolvedValue(trip());
  mocks.getTripPlayers.mockResolvedValue([player(1), player(2), player(3, false)]);
  mocks.getTripPrizeSchedules.mockResolvedValue([schedule()]);
  mocks.saveTripPrizeSchedules.mockResolvedValue([schedule()]);
  mocks.recalculateTripPrizeWinnings.mockResolvedValue({ tripId: 17, winnings: [], playerTotals: [] });
});

async function loadPage() {
  const result = render(<TripPrizeSetupPage />);
  await screen.findByRole("heading", { name: "Prize Money Setup" });
  await waitFor(() => expect(mocks.getTripPrizeSchedules).toHaveBeenCalledWith(17));
  return result;
}

function prizeInputs(container: HTMLElement): HTMLInputElement[] {
  return [...container.querySelectorAll('input[type="number"]')];
}

describe("Trip prize setup page characterization (before extraction)", () => {
  it("loads trip, roster and schedules for the route's trip id", async () => {
    await loadPage();
    expect(mocks.getTripDetail).toHaveBeenCalledWith(17);
    expect(mocks.getTripPlayers).toHaveBeenCalledWith(17);
    expect(screen.getByText(/2 players/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Prize Money" })).toBeEnabled();
  });

  it("sorts payout rows by finishing place and initializes their input amounts", async () => {
    const { container } = await loadPage();
    const inputs = prizeInputs(container);
    expect(inputs.map(input => input.value)).toEqual(["2", "25", "15"]);
    expect(screen.queryByText(/unsaved prize setup changes/i)).not.toBeInTheDocument();
  });

  it("marks an edited payout as unsaved and submits the rounded amounts", async () => {
    const { container } = await loadPage();
    fireEvent.change(prizeInputs(container)[1], { target: { value: "12.345" } });
    expect(screen.getByText(/You have unsaved prize setup changes/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Prize Money" }));
    await waitFor(() => expect(mocks.saveTripPrizeSchedules).toHaveBeenCalledWith(17, {
      schedules: [{ gameKey: "LOW_NET", gameName: "Low Net", resultScope: "PLAYER",
        payoutUnit: "PLAYER", payouts: [
          { finishingPlace: 1, amountPerPlayer: 12.35 },
          { finishingPlace: 2, amountPerPlayer: 15 },
        ] }],
    }));
  });

  it("rejects a negative amount without saving", async () => {
    const { container } = await loadPage();
    fireEvent.change(prizeInputs(container)[1], { target: { value: "-4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Prize Money" }));
    expect(await screen.findByText(/Fix invalid prize amounts before saving/)).toBeInTheDocument();
    expect(mocks.saveTripPrizeSchedules).not.toHaveBeenCalled();
  });

  it("locks saving and recalculation on completed trips outside correction mode", async () => {
    mocks.getTripDetail.mockResolvedValue(trip({ status: "COMPLETE", correctionMode: false }));
    const { container } = await loadPage();
    expect(screen.getByRole("button", { name: "Prize Setup Locked" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Recalculate Prize Winnings" })).toBeDisabled();
    expect(prizeInputs(container).every(input => input.disabled)).toBe(true);
    expect(screen.getByText(/Prize setup is view-only unless/)).toBeInTheDocument();
  });

  it("allows editing and recalculation in correction mode", async () => {
    mocks.getTripDetail.mockResolvedValue(trip({ status: "COMPLETE", correctionMode: true }));
    await loadPage();
    expect(screen.getByRole("button", { name: "Save Prize Money" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Recalculate Prize Winnings" }));
    await waitFor(() => expect(mocks.recalculateTripPrizeWinnings).toHaveBeenCalledWith(17));
    expect(await screen.findByText("Prize winnings recalculated.")).toBeInTheDocument();
  });

  it("expands the places-paid count while retaining prior payouts", async () => {
    const { container } = await loadPage();
    fireEvent.change(prizeInputs(container)[0], { target: { value: "3" } });
    expect(prizeInputs(container).map(input => input.value)).toEqual(["3", "25", "15", ""]);
  });

  it("shows pending roster rather than a negative balance when no active players exist", async () => {
    mocks.getTripPlayers.mockResolvedValue([player(1, false)]);
    await loadPage();
    expect(screen.getByText("Pending roster")).toBeInTheDocument();
    expect(screen.getByText(/Add active players to calculate remaining prize money/)).toBeInTheDocument();
  });

  it("does not call prize APIs if the route has no numeric trip id", async () => {
    mocks.tripId = undefined;
    render(<TripPrizeSetupPage />);
    expect(await screen.findByText("Event id is missing.")).toBeInTheDocument();
    expect(mocks.getTripDetail).not.toHaveBeenCalled();
  });
});
