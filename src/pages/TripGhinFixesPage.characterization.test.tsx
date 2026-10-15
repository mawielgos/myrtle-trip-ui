import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TripGhinFixesPage from "./TripGhinFixesPage";
import type { GhinFixRow } from "../types/ghinFix";

const mocks = vi.hoisted(() => ({
  tripId: "7" as string | undefined,
  navigate: vi.fn(),
  getTripDetail: vi.fn(),
  getTripGhinFixes: vi.fn(),
  saveTripGhinFix: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/tripApi", () => ({
  getTripDetail: mocks.getTripDetail,
  getTripGhinFixes: mocks.getTripGhinFixes,
  saveTripGhinFix: mocks.saveTripGhinFix,
}));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: (dirty: boolean) => async () => !dirty || mocks.confirm(),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: () => <button type="button">Trip Detail</button>,
}));

const fix = (id: number, playerName: string, overrides: Partial<GhinFixRow> = {}): GhinFixRow => ({
  scoreHistoryEntryId: id,
  playerId: id,
  playerName,
  ghinNumber: `GHIN-${id}`,
  postingOrder: 2,
  scoreType: "A",
  holesPlayed: 18,
  grossScore: 86,
  courseRating: 71.4,
  slope: 128,
  differential: null,
  manualDifferentialRequired: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "7";
  mocks.getTripDetail.mockResolvedValue({ tripName: "Fall Event" });
  mocks.getTripGhinFixes.mockResolvedValue([fix(20, "Zoe"), fix(10, "Alex")]);
  mocks.saveTripGhinFix.mockImplementation(async (_tripId: number, rowId: number, payload: { differential: number }) =>
    fix(rowId, rowId === 10 ? "Alex" : "Zoe", { differential: payload.differential }));
  mocks.confirm.mockResolvedValue(true);
});
afterEach(() => cleanup());

async function loadPage(): Promise<void> {
  render(<TripGhinFixesPage />);
  await screen.findByRole("heading", { name: "GHIN Fixes Review" });
  await waitFor(() => expect(mocks.getTripGhinFixes).toHaveBeenCalledWith(7));
  await screen.findByText("Alex");
}

function playerRow(name: string): HTMLElement {
  const cell = screen.getByText(name).closest("tr");
  if (!cell) throw new Error(`Missing row for ${name}`);
  return cell;
}

describe("Trip GHIN fixes page characterization (before extraction)", () => {
  it("loads the event and outstanding GHIN fixes for the route id", async () => {
    await loadPage();
    expect(mocks.getTripDetail).toHaveBeenCalledWith(7);
    expect(screen.getByText(/Fall Event.*review unresolved frozen GHIN differentials/)).toBeInTheDocument();
    expect(screen.getByText("Outstanding: 2")).toBeInTheDocument();
  });

  it("sorts by player name then posting order, regardless of API order", async () => {
    mocks.getTripGhinFixes.mockResolvedValue([
      fix(30, "Zoe"), fix(12, "Alex", { postingOrder: 3 }),
      fix(11, "Alex", { postingOrder: 1 }),
    ]);
    render(<TripGhinFixesPage />);
    await screen.findByText("Outstanding: 3");
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText(/Posting 1/).textContent).toContain("Posting 1");
    expect(within(bodyRows[1]).getByText(/Posting 3/)).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText("Zoe")).toBeInTheDocument();
  });

  it("shows score context, nullable values, and initial manual differential", async () => {
    mocks.getTripGhinFixes.mockResolvedValue([fix(10, "Alex", {
      scoreType: null, holesPlayed: null, postingOrder: null,
      ghinNumber: null, grossScore: null, courseRating: null, slope: null,
      differential: 12.345,
    })]);
    await loadPage();
    const row = playerRow("Alex");
    expect(within(row).getByText("Manual differential required")).toBeInTheDocument();
    expect(within(row).getByDisplayValue("12.345")).toBeInTheDocument();
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows a completed state and return action when no fixes remain", async () => {
    mocks.getTripGhinFixes.mockResolvedValue([]);
    render(<TripGhinFixesPage />);
    expect(await screen.findByText("No outstanding GHIN fixes.")).toBeInTheDocument();
    expect(screen.getByText("Outstanding: 0")).toBeInTheDocument();
    expect(screen.getByText(/All GHIN manual fixes are complete/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return to Event" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/trips/7"));
  });

  it("rejects an invalid trip id without calling the API", async () => {
    mocks.tripId = "bad";
    render(<TripGhinFixesPage />);
    expect(await screen.findByText("Invalid event id.")).toBeInTheDocument();
    expect(mocks.getTripDetail).not.toHaveBeenCalled();
    expect(mocks.getTripGhinFixes).not.toHaveBeenCalled();
  });

  it("shows the API error when loading fixes fails", async () => {
    mocks.getTripGhinFixes.mockRejectedValue({ response: { data: { message: "GHIN service unavailable" } } });
    render(<TripGhinFixesPage />);
    expect(await screen.findByText("GHIN service unavailable")).toBeInTheDocument();
    expect(mocks.saveTripGhinFix).not.toHaveBeenCalled();
  });

  it("requires a manual differential before saving an individual row", async () => {
    await loadPage();
    fireEvent.click(within(playerRow("Alex")).getByRole("button", { name: "Save Fix" }));
    expect(await screen.findByText("Enter a differential for Alex.")).toBeInTheDocument();
    expect(mocks.saveTripGhinFix).not.toHaveBeenCalled();
  });

  it("saves a single normalized differential and removes its outstanding row", async () => {
    await loadPage();
    const row = playerRow("Alex");
    fireEvent.change(within(row).getByPlaceholderText("Enter diff"), { target: { value: " 13.25 " } });
    fireEvent.click(within(row).getByRole("button", { name: "Save Fix" }));
    await waitFor(() => expect(mocks.saveTripGhinFix).toHaveBeenCalledWith(7, 10, { differential: 13.25 }));
    await waitFor(() => expect(screen.queryByText("Alex")).not.toBeInTheDocument());
    expect(screen.getByText("Outstanding: 1")).toBeInTheDocument();
    expect(screen.getByText(/Alex fix saved/)).toBeInTheDocument();
  });

  it("saves all entered differentials in display order and reloads the outstanding list", async () => {
    await loadPage();
    fireEvent.change(within(playerRow("Alex")).getByPlaceholderText("Enter diff"), { target: { value: "10.1" } });
    fireEvent.change(within(playerRow("Zoe")).getByPlaceholderText("Enter diff"), { target: { value: "11.2" } });
    mocks.getTripGhinFixes.mockResolvedValueOnce([]);
    fireEvent.click(screen.getAllByRole("button", { name: "Save All Fixes" })[0]);
    await waitFor(() => expect(mocks.saveTripGhinFix).toHaveBeenCalledTimes(2));
    expect(mocks.saveTripGhinFix).toHaveBeenNthCalledWith(1, 7, 10, { differential: 10.1 });
    expect(mocks.saveTripGhinFix).toHaveBeenNthCalledWith(2, 7, 20, { differential: 11.2 });
    await waitFor(() => expect(screen.getByText("Outstanding: 0")).toBeInTheDocument());
  });
});
