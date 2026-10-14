import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { TripBillInventory, TripDetail } from "../types/trip";
import TripMoneyDistributionPage from "./TripMoneyDistributionPage";

const mocks = vi.hoisted(() => ({
  tripId: "17" as string | undefined,
  getTripDetail: vi.fn(),
  getTripPrizeWinnings: vi.fn(),
  getTripBillInventory: vi.fn(),
  saveTripBillInventory: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => vi.fn(),
}));
vi.mock("../api/tripApi", () => ({
  getTripDetail: mocks.getTripDetail,
  getTripPrizeWinnings: mocks.getTripPrizeWinnings,
  getTripBillInventory: mocks.getTripBillInventory,
  saveTripBillInventory: mocks.saveTripBillInventory,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => <header><h1>{title}</h1><p>{subtitle}</p></header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({ default: () => <button>Event Detail</button> }));
vi.mock("../components/common/ReportsButton", () => ({ default: () => <button>Reports</button> }));

const trip = { tripId: 17, tripName: "Autumn Open" } as TripDetail;
const inventory = (overrides: Partial<TripBillInventory> = {}): TripBillInventory => ({
  tripId: 17, hundredsCount: 0, fiftiesCount: 0, twentiesCount: 3,
  tensCount: 2, fivesCount: 1, onesCount: 5, ...overrides,
});

// Explicit cleanup is needed in this project's Vitest setup to isolate DOM queries.
afterEach(() => cleanup());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "17";
  mocks.getTripDetail.mockResolvedValue(trip);
  mocks.getTripPrizeWinnings.mockResolvedValue({ playerTotals: [
    { playerId: 1, playerName: "Zoe", totalAmount: 20 },
    { playerId: 2, playerName: "Alex", totalAmount: 30 },
  ] });
  mocks.getTripBillInventory.mockResolvedValue(inventory());
  mocks.saveTripBillInventory.mockImplementation(async (_id: number, counts: TripBillInventory) => ({ tripId: 17, ...counts }));
});

async function loadPage() {
  const rendered = render(<TripMoneyDistributionPage />);
  await screen.findByRole("heading", { name: "Money Distribution" });
  await waitFor(() => expect(mocks.getTripBillInventory).toHaveBeenCalledWith(17));
  return rendered;
}
function billInputs(container: HTMLElement) {
  return Array.from(container.querySelectorAll('input[inputmode="numeric"]')) as HTMLInputElement[];
}

describe("Trip money distribution page characterization (before extraction)", () => {
  it("loads event, winnings, and inventory for the route id", async () => {
    await loadPage();
    expect(mocks.getTripDetail).toHaveBeenCalledWith(17);
    expect(mocks.getTripPrizeWinnings).toHaveBeenCalledWith(17);
    expect(screen.getByText(/Autumn Open/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bill Counts Saved" })).toBeDisabled();
  });

  it("initializes denomination inputs in descending order from saved inventory", async () => {
    const { container } = await loadPage();
    expect(billInputs(container).map(input => input.value)).toEqual(["0", "0", "3", "2", "1", "5"]);
  });

  it("orders payouts by amount descending and shows exact assignments when available", async () => {
    await loadPage();
    const table = screen.getByRole("heading", { name: "Player Bill Assignments" }).closest("section")!.querySelector("table")!;
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alex");
    expect(rows[2]).toHaveTextContent("Zoe");
    expect(screen.getByText(/every player payout can be made exactly/i)).toBeInTheDocument();
  });

  it("marks changed bill counts unsaved and sends normalized inventory on save", async () => {
    const { container } = await loadPage();
    fireEvent.change(billInputs(container)[0], { target: { value: "2abc" } });
    expect(billInputs(container)[0].value).toBe("2");
    expect(screen.getByText(/Bill counts have changed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Bill Counts" }));
    await waitFor(() => expect(mocks.saveTripBillInventory).toHaveBeenCalledWith(17, {
      hundredsCount: 2, fiftiesCount: 0, twentiesCount: 3, tensCount: 2, fivesCount: 1, onesCount: 5,
    }));
    expect(await screen.findByText(/Bill counts saved for this event/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bill Counts Saved" })).toBeDisabled();
  });

  it("reloads previously saved values after an edit", async () => {
    const { container } = await loadPage();
    fireEvent.change(billInputs(container)[2], { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Reload Saved Counts" }));
    expect(billInputs(container)[2].value).toBe("3");
    expect(screen.getByRole("button", { name: "Bill Counts Saved" })).toBeDisabled();
  });

  it("clears all bill counts without saving automatically", async () => {
    const { container } = await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Clear Counts" }));
    expect(billInputs(container).map(input => input.value)).toEqual(["0", "0", "0", "0", "0", "0"]);
    expect(mocks.saveTripBillInventory).not.toHaveBeenCalled();
    expect(screen.getByText(/Cash short/)).toBeInTheDocument();
  });

  it("shows a bill-mix shortage even if available cash is sufficient", async () => {
    mocks.getTripPrizeWinnings.mockResolvedValue({ playerTotals: [
      { playerId: 1, playerName: "Alex", totalAmount: 30 },
    ] });
    mocks.getTripBillInventory.mockResolvedValue(inventory({
      hundredsCount: 1, twentiesCount: 0, tensCount: 0, fivesCount: 0, onesCount: 0,
    }));
    await loadPage();
    expect(screen.getByText(/negative values in Remaining Bills/)).toBeInTheDocument();
  });

  it("shows no payout rows when winnings are empty", async () => {
    mocks.getTripPrizeWinnings.mockResolvedValue({ playerTotals: [] });
    await loadPage();
    expect(screen.getByText("No player payouts are available yet.")).toBeInTheDocument();
  });

  it("rejects a missing or invalid event id without contacting prize APIs", async () => {
    mocks.tripId = undefined;
    render(<TripMoneyDistributionPage />);
    expect(await screen.findByText("Invalid event id.")).toBeInTheDocument();
    expect(mocks.getTripPrizeWinnings).not.toHaveBeenCalled();
    expect(mocks.getTripBillInventory).not.toHaveBeenCalled();
  });
});
