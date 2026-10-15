import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { HandicapCardDetailResponse, HandicapCardScore } from "../types/handicapCard";
import HandicapCardPage from "./HandicapCardPage";

const mocks = vi.hoisted(() => ({
  tripId: "17" as string | undefined,
  playerId: "42" as string | undefined,
  getHandicapCardDetail: vi.fn(),
  printWithReportTitle: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId, playerId: mocks.playerId }),
  useNavigate: () => vi.fn(),
}));
vi.mock("../api/handicapCardApi", () => ({ getHandicapCardDetail: mocks.getHandicapCardDetail }));
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
vi.mock("../components/common/WorkflowBackButton", () => ({ default: () => <span>Back to Handicap Cards</span> }));

const score = (overrides: Partial<HandicapCardScore> = {}): HandicapCardScore => ({
  scoreHistoryEntryId: 1, displaySortOrder: 1, scoreSection: null, pendingForCalculationDate: false,
  usedInPendingIndex: false, scoreDate: "2026-10-09", courseName: "North Course", grossScore: 84,
  adjustedGrossScore: 83, courseRating: 71.2, slope: 125, differential: 10.4, holesPlayed: 18,
  sourceType: "TRIP_ROUND", scoreType: null, postingOrder: null, manualDifferentialRequired: false,
  eligibleForWindow: true, usedInIndex: true, exclusionReason: null, ...overrides,
});
const detail = (overrides: Partial<HandicapCardDetailResponse> = {}): HandicapCardDetailResponse => ({
  tripId: 17, tripName: "Autumn Open", tripCode: "AUT", tripYear: 2026, asOfDate: "2026-10-14",
  playerId: 42, playerName: "Alex Golfer", handicapMethod: null, tripIndex: 12.3,
  pendingTripIndex: null, pendingIndexDelta: null, pendingScoreCount: 0,
  calculationLabel: "Current calculation", pendingCalculationLabel: null,
  eligibleScoreCount: 1, windowScoreCount: 1, usedScoreCount: 1, scores: [score()], ...overrides,
});

afterEach(() => cleanup());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "17";
  mocks.playerId = "42";
  mocks.getHandicapCardDetail.mockResolvedValue(detail());
});
async function loadPage() {
  const rendered = render(<HandicapCardPage />);
  await screen.findByRole("heading", { name: "Calculation Date" });
  await waitFor(() => expect(mocks.getHandicapCardDetail).toHaveBeenCalled());
  return rendered;
}

describe("Handicap card page characterization (before extraction)", () => {
  it("loads the card for the route's event and player with today's calculation date", async () => {
    await loadPage();
    expect(mocks.getHandicapCardDetail).toHaveBeenCalledWith(17, 42, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(screen.getAllByRole("heading", { name: "Alex Golfer Handicap Card" })).toHaveLength(2);
    expect(screen.getByText("Current calculation")).toBeInTheDocument();
  });

  it("displays index totals and the source and status of a used event score", async () => {
    await loadPage();
    expect(screen.getByText("12.3")).toBeInTheDocument();
    const row = screen.getByText("North Course").closest("tr")!;
    expect(within(row).getByText("Event")).toBeInTheDocument();
    expect(within(row).getByText("Used")).toBeInTheDocument();
    expect(within(row).getByText("10.4")).toBeInTheDocument();
  });

  it("separates same-day pending scores from the current calculation window", async () => {
    mocks.getHandicapCardDetail.mockResolvedValue(detail({ scores: [
      score({ scoreHistoryEntryId: 2, sourceType: "GHIN_FROZEN", postingOrder: 2, courseName: "Pending Course", pendingForCalculationDate: true, usedInPendingIndex: true, usedInIndex: false }),
      score(),
    ] }));
    await loadPage();
    const pendingPanel = screen.getByRole("heading", { name: "Pending Posted Scores" }).parentElement!.parentElement!.parentElement!;
    expect(within(pendingPanel).getByText("GHIN #2")).toBeInTheDocument();
    expect(within(pendingPanel).getByText("Pending Used")).toBeInTheDocument();
    expect(screen.getByText("North Course")).toBeInTheDocument();
  });

  it("shows the pending handicap index and downward delta", async () => {
    mocks.getHandicapCardDetail.mockResolvedValue(detail({ pendingTripIndex: 11.8, pendingIndexDelta: -0.5 }));
    await loadPage();
    expect(screen.getAllByText("11.8").length).toBeGreaterThan(0);
    expect(screen.getAllByTitle("Pending score lowers the index").length).toBeGreaterThan(0);
  });

  it("shows excluded and window-only score labels without treating them as used", async () => {
    mocks.getHandicapCardDetail.mockResolvedValue(detail({ scores: [
      score({ scoreHistoryEntryId: 3, courseName: "Window Course", usedInIndex: false }),
      score({ scoreHistoryEntryId: 4, courseName: "Old Course", usedInIndex: false, eligibleForWindow: false, exclusionReason: "Out of window" }),
    ] }));
    await loadPage();
    expect(within(screen.getByText("Window Course").closest("tr")!).getByText("Window")).toBeInTheDocument();
    expect(within(screen.getByText("Old Course").closest("tr")!).getByText("Excluded")).toBeInTheDocument();
    expect(screen.getByText("Out of window")).toBeInTheDocument();
  });

  it("requests the previous calculation date when navigating backwards", async () => {
    await loadPage();
    const input = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement;
    const original = input.value;
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() => expect(mocks.getHandicapCardDetail).toHaveBeenCalledTimes(2));
    expect(input.value).not.toBe(original);
  });

  it("rejects invalid route ids without calling the API", async () => {
    mocks.playerId = "not-a-player";
    render(<HandicapCardPage />);
    expect(await screen.findByText("Invalid event or player id.")).toBeInTheDocument();
    expect(mocks.getHandicapCardDetail).not.toHaveBeenCalled();
  });

  it("shows an API error when the card request fails", async () => {
    mocks.getHandicapCardDetail.mockRejectedValue(new Error("Card unavailable"));
    render(<HandicapCardPage />);
    expect(await screen.findByText("Card unavailable")).toBeInTheDocument();
  });

  it("displays an empty current-window table when no scores are returned", async () => {
    mocks.getHandicapCardDetail.mockResolvedValue(detail({ scores: [], windowScoreCount: 0, eligibleScoreCount: 0, usedScoreCount: 0 }));
    await loadPage();
    expect(screen.getByText("No scores to display for this calculation date.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pending Posted Scores" })).not.toBeInTheDocument();
  });
});
