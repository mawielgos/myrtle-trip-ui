import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { HandicapCardsResponse, HandicapCardDetailResponse, HandicapCardPlayerSummary } from "../types/handicapCard";
import HandicapCardsPage from "./HandicapCardsPage";

const mocks = vi.hoisted(() => ({
  tripId: "17" as string | undefined,
  navigate: vi.fn(),
  getHandicapCards: vi.fn(),
  getHandicapCardDetail: vi.fn(),
  printWithReportTitle: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/handicapCardApi", () => ({
  getHandicapCards: mocks.getHandicapCards,
  getHandicapCardDetail: mocks.getHandicapCardDetail,
}));
vi.mock("../utils/printUtils", () => ({
  buildReportFileTitle: (...parts: unknown[]) => parts.join(" - "),
  printWithReportTitle: mocks.printWithReportTitle,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle: string; actions: React.ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({ default: () => <span>Event Detail</span> }));
vi.mock("../components/common/ReportsButton", () => ({ default: () => <span>Reports</span> }));

const player = (overrides: Partial<HandicapCardPlayerSummary> = {}): HandicapCardPlayerSummary => ({
  playerId: 42, playerName: "Alex Golfer", displayOrder: 2, handicapMethod: "GHIN_HISTORY",
  tripIndex: 12.3, statusCode: "READY", statusLabel: "Ready", eligibleScoreCount: 5,
  windowScoreCount: 4, usedScoreCount: 3, ...overrides,
});
const summary = (overrides: Partial<HandicapCardsResponse> = {}): HandicapCardsResponse => ({
  tripId: 17, tripName: "Autumn Open", tripCode: "AUT", tripYear: 2026,
  asOfDate: "2026-10-14", players: [player()], ...overrides,
});
const detail = (overrides: Partial<HandicapCardDetailResponse> = {}): HandicapCardDetailResponse => ({
  tripId: 17, tripName: "Autumn Open", tripCode: "AUT", tripYear: 2026,
  asOfDate: "2026-10-14", playerId: 42, playerName: "Alex Golfer",
  handicapMethod: "GHIN_HISTORY", tripIndex: 12.3, pendingTripIndex: 11.8,
  pendingScoreCount: 1, calculationLabel: "Current", pendingCalculationLabel: "Pending",
  eligibleScoreCount: 5, windowScoreCount: 4, usedScoreCount: 3, scores: [], ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "17";
  mocks.getHandicapCards.mockResolvedValue(summary());
  mocks.getHandicapCardDetail.mockResolvedValue(detail());
});
afterEach(() => cleanup());

async function loadPage() {
  render(<HandicapCardsPage />);
  await waitFor(() => expect(mocks.getHandicapCards).toHaveBeenCalled());
  await screen.findAllByRole("button", { name: "Open" });
}

describe("Handicap cards list page characterization (before extraction)", () => {
  it("loads the event's cards and displays the report subtitle", async () => {
    await loadPage();
    expect(mocks.getHandicapCards).toHaveBeenCalledWith(17);
    expect(screen.getByRole("heading", { name: "Handicap Cards" })).toBeInTheDocument();
    expect(screen.getByText("Autumn Open as of 2026-10-14 • 1 player")).toBeInTheDocument();
  });

  it("shows indexes, methods, score counts and readiness status", async () => {
    await loadPage();
    const row = screen.getByText("Alex Golfer").closest("tr")!;
    expect(within(row).getByText("GHIN History")).toBeInTheDocument();
    expect(within(row).getByText("12.3")).toBeInTheDocument();
    expect(within(row).getByText("Ready")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(row).getByText("3")).toBeInTheDocument();
  });

  it("sorts by display order, then by player name when orders match", async () => {
    mocks.getHandicapCards.mockResolvedValue(summary({ players: [
      player({ playerId: 11, playerName: "Zelda", displayOrder: 2 }),
      player({ playerId: 12, playerName: "Amy", displayOrder: 2 }),
      player({ playerId: 13, playerName: "First", displayOrder: 1 }),
    ] }));
    await loadPage();
    const names = screen.getAllByRole("button", { name: "Open" }).map(b => b.closest("tr")!.querySelectorAll("td")[1].textContent);
    expect(names).toEqual(["First", "Amy", "Zelda"]);
  });

  it("opens the selected player's detailed handicap card", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/trips/17/handicap-cards/players/42");
  });

  it("disables report actions and shows empty-state text when no players exist", async () => {
    mocks.getHandicapCards.mockResolvedValue(summary({ players: [] }));
    render(<HandicapCardsPage />);
    expect(await screen.findByText("No handicap card data found for this event.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("does not call the API for an invalid event id", async () => {
    mocks.tripId = "not-a-number";
    render(<HandicapCardsPage />);
    expect(await screen.findByText("Invalid event id.")).toBeInTheDocument();
    expect(mocks.getHandicapCards).not.toHaveBeenCalled();
  });

  it("displays a server error when card listing fails", async () => {
    mocks.getHandicapCards.mockRejectedValue({ response: { data: { error: "Event not available" } } });
    render(<HandicapCardsPage />);
    expect(await screen.findByText("Event not available")).toBeInTheDocument();
  });

  it("loads each player's detail in display order before printing", async () => {
    mocks.getHandicapCards.mockResolvedValue(summary({ players: [
      player({ playerId: 50, playerName: "Second", displayOrder: 2 }),
      player({ playerId: 42, playerName: "Alex Golfer", displayOrder: 1 }),
    ] }));
    mocks.getHandicapCardDetail.mockImplementation(async (_tripId: number, playerId: number) =>
      detail({ playerId, playerName: playerId === 42 ? "Alex Golfer" : "Second" }));
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(mocks.printWithReportTitle).toHaveBeenCalledWith("Autumn Open - Handicap Cards"));
    expect(mocks.getHandicapCardDetail.mock.calls.map((call: unknown[]) => call)).toEqual([
      [17, 42, "2026-10-14"], [17, 50, "2026-10-14"],
    ]);
    expect(document.querySelectorAll(".handicap-card-print-card")).toHaveLength(2);
  });

  it("reuses previously fetched detail cards when printing twice", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(mocks.printWithReportTitle).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(mocks.printWithReportTitle).toHaveBeenCalledTimes(2));
    expect(mocks.getHandicapCardDetail).toHaveBeenCalledTimes(1);
  });
});
