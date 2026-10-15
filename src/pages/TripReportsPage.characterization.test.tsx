import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import TripReportsPage from "./TripReportsPage";

const mocks = vi.hoisted(() => ({
  tripId: "7" as string | undefined,
  navigate: vi.fn(),
  getTripDetail: vi.fn(),
  getTripRounds: vi.fn(),
  getTripTournamentSetup: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/tripApi", () => ({
  getTripDetail: mocks.getTripDetail,
  getTripRounds: mocks.getTripRounds,
  getTripTournamentSetup: mocks.getTripTournamentSetup,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: ({ tripId }: { tripId: number }) => <button type="button">Event {tripId}</button>,
}));

function trip() {
  return { tripId: 7, tripName: "Autumn Open", tripYear: 2026 };
}
function rounds() {
  return [
    { roundId: 41, roundNumber: 1, roundDate: "2026-10-20", courseName: "Lake Course", teeName: "Blue", gameFormat: "STROKE_PLAY", finalized: false, events: [] },
    { roundId: 42, roundNumber: 2, roundDate: "2026-10-21", courseName: "Ridge Course", teeName: "White", gameFormat: "TWO_MAN_LOW_NET", finalized: true, events: [{ eventType: "INDIVIDUAL_LOW_GROSS", eventName: "Gross Challenge" }] },
  ];
}
function tournament(overrides: Record<string, unknown> = {}) {
  return {
    tripId: 7, enabled: true, lowNetEnabled: true, lowGrossEnabled: true,
    lowNetName: "Net Championship", lowGrossName: "Gross Championship",
    rounds: [{ plannedRoundId: 1, roundNumber: 1, included: true }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "7";
  mocks.getTripDetail.mockResolvedValue(trip());
  mocks.getTripRounds.mockResolvedValue(rounds());
  mocks.getTripTournamentSetup.mockResolvedValue(tournament());
});
afterEach(cleanup);

async function loadPage() {
  render(<TripReportsPage />);
  await screen.findByRole("heading", { name: "Reports & Exports" });
}

describe("Trip reports page characterization (before extraction)", () => {
  it("shows loading before fetching all three reports dependencies", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getTripDetail.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<TripReportsPage />);
    expect(screen.getByText("Loading reports...")).toBeInTheDocument();
    resolve(trip());
    await screen.findByRole("heading", { name: "Reports & Exports" });
    expect(mocks.getTripDetail).toHaveBeenCalledWith(7);
    expect(mocks.getTripRounds).toHaveBeenCalledWith(7);
    expect(mocks.getTripTournamentSetup).toHaveBeenCalledWith(7);
    expect(screen.getByText("Autumn Open - 2026")).toBeInTheDocument();
  });

  it("shows both configured tournament competitions and navigates with competition query params", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Open Net Championship" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Gross Championship" }));
    expect(mocks.navigate).toHaveBeenNthCalledWith(1, "/trips/7/tournament-standings?competition=LOW_NET");
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, "/trips/7/tournament-standings?competition=LOW_GROSS");
  });

  it("falls back to default competition labels for blank configured names", async () => {
    mocks.getTripTournamentSetup.mockResolvedValue(tournament({ lowNetName: "  ", lowGrossName: null }));
    await loadPage();
    expect(screen.getByRole("button", { name: "Open Low Net" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Low Gross" })).toBeInTheDocument();
  });

  it("hides tournament links when disabled, no competitions enabled, or no included rounds", async () => {
    const view = render(<TripReportsPage />);
    await screen.findByRole("heading", { name: "Reports & Exports" });
    view.unmount();
    for (const setup of [
      tournament({ enabled: false }),
      tournament({ lowNetEnabled: false, lowGrossEnabled: false }),
      tournament({ rounds: [{ plannedRoundId: 1, included: false }] }),
    ]) {
      mocks.getTripTournamentSetup.mockResolvedValue(setup);
      const next = render(<TripReportsPage />);
      await screen.findByRole("heading", { name: "Reports & Exports" });
      expect(screen.queryByRole("button", { name: /Open Net Championship|Open Gross Championship/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open Payout Summary" })).toBeInTheDocument();
      next.unmount();
    }
  });

  it("renders event reports and each round's status and routes to tee sheet/results", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Open Payout Summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Money Distribution" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/trips/7/winning-detail");
    expect(mocks.navigate).toHaveBeenCalledWith("/trips/7/money-distribution");
    const heading = screen.getByRole("heading", { name: "Round Reports" });
    const section = heading.closest("section")!;
    expect(within(section).getByText("Open")).toBeInTheDocument();
    expect(within(section).getByText("Finalized")).toBeInTheDocument();
    expect(within(section).getByText("Events: Gross Challenge")).toBeInTheDocument();
    const teeButtons = within(section).getAllByRole("button", { name: "Tee Sheet" });
    const resultButtons = within(section).getAllByRole("button", { name: "Results" });
    fireEvent.click(teeButtons[0]);
    fireEvent.click(resultButtons[1]);
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/41/tee-sheet");
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/results");
  });

  it("shows an empty round state when the event has no rounds", async () => {
    mocks.getTripRounds.mockResolvedValue([]);
    await loadPage();
    expect(screen.getByText("No rounds are available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tee Sheet" })).not.toBeInTheDocument();
  });

  it("shows pre-finalization guidance only while no round is finalized", async () => {
    mocks.getTripRounds.mockResolvedValue(rounds().map((round) => ({ ...round, finalized: false })));
    await loadPage();
    expect(screen.getByText(/Finalized round result reports will become more useful/)).toBeInTheDocument();
    cleanup();
    mocks.getTripRounds.mockResolvedValue(rounds());
    await loadPage();
    expect(screen.queryByText(/Finalized round result reports will become more useful/)).not.toBeInTheDocument();
  });

  it("rejects invalid route ids without calling report APIs", async () => {
    mocks.tripId = undefined;
    render(<TripReportsPage />);
    expect(await screen.findByText("Invalid event id.")).toBeInTheDocument();
    expect(mocks.getTripDetail).not.toHaveBeenCalled();
    expect(mocks.getTripRounds).not.toHaveBeenCalled();
    expect(mocks.getTripTournamentSetup).not.toHaveBeenCalled();
  });

  it("renders the generic report load error on API failure", async () => {
    mocks.getTripRounds.mockRejectedValueOnce(new Error("Unavailable"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(<TripReportsPage />);
      expect(await screen.findByText("Failed to load event reports.")).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
