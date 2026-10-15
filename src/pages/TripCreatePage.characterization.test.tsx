import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TripCreatePage from "./TripCreatePage";

const mocks = vi.hoisted(() => ({
  tripId: undefined as string | undefined,
  navigate: vi.fn(), getPlayers: vi.fn(), getTrip: vi.fn(), getTripPlayers: vi.fn(),
  saveTripSetup: vi.fn(), confirm: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }), useNavigate: () => mocks.navigate,
}));
vi.mock("../api/playerApi", () => ({ getPlayers: mocks.getPlayers }));
vi.mock("../api/tripApi", () => ({
  getTrip: mocks.getTrip, getTripPlayers: mocks.getTripPlayers, saveTripSetup: mocks.saveTripSetup,
}));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: (dirty: boolean) => async () => !dirty || mocks.confirm(),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, actions }: { title: string; actions?: React.ReactNode }) =>
    <header><h1>{title}</h1>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: () => <button type="button">Event Detail</button>,
}));

const players = [
  { playerId: 3, displayName: "Zoe", active: true, ghinNumber: "303" },
  { playerId: 2, displayName: "Inactive", active: false, ghinNumber: "202" },
  { playerId: 1, displayName: "Alex", active: true, ghinNumber: "101" },
];
const trip = {
  tripId: 7, tripName: "Autumn Open", tripYear: 2026, tripCode: "AUTUMN_2026", entryFee: 150,
  tripStartDate: "2026-11-01", tripEndDate: "2026-11-03", plannedRoundCount: 3,
  handicapsEnabled: true, handicapMethod: "GHIN_HISTORY", initialized: false,
};
const tripPlayers = [
  { playerId: 3, frozenHandicapIndex: null, ghinHistoryCount: 4, dbScoreHistoryCount: 2, tripScoreCount: 1, usableHandicapIndex: true },
  { playerId: 1, frozenHandicapIndex: 12.5, ghinHistoryCount: 8, dbScoreHistoryCount: 0, tripScoreCount: 2, usableHandicapIndex: true },
  { playerId: 2, frozenHandicapIndex: 11, ghinHistoryCount: 2, dbScoreHistoryCount: 0, tripScoreCount: 0, usableHandicapIndex: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = undefined;
  mocks.getPlayers.mockResolvedValue(players);
  mocks.getTrip.mockResolvedValue(trip);
  mocks.getTripPlayers.mockResolvedValue(tripPlayers);
  mocks.saveTripSetup.mockResolvedValue(7);
  mocks.confirm.mockResolvedValue(true);
});
afterEach(() => cleanup());

async function loadCreate() {
  render(<TripCreatePage />);
  await screen.findByRole("heading", { name: "Create Event" });
  await waitFor(() => expect(screen.queryByText("Loading players...")).not.toBeInTheDocument());
}
async function loadEdit() {
  mocks.tripId = "7";
  render(<TripCreatePage />);
  await screen.findByRole("heading", { name: "Edit Event" });
  await waitFor(() => expect(mocks.getTripPlayers).toHaveBeenCalledWith(7));
  await waitFor(() => expect(screen.getByLabelText("Event Name")).toHaveValue("Autumn Open"));
}
function enterRequiredFields() {
  fireEvent.change(screen.getByLabelText("Event Name"), { target: { value: "  Fall Cup  " } });
  fireEvent.change(screen.getByLabelText("Event Code"), { target: { value: "fall_2026" } });
  fireEvent.change(screen.getByLabelText("Event Start Date"), { target: { value: "2026-11-01" } });
  fireEvent.change(screen.getByLabelText("Event End Date"), { target: { value: "2026-11-03" } });
}

describe("Trip create/edit page characterization (before extraction)", () => {
  it("loads active players, alphabetizes the list, and defaults to an empty event", async () => {
    await loadCreate();
    expect(mocks.getPlayers).toHaveBeenCalledTimes(1);
    expect(mocks.getTrip).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Event Name")).toHaveValue("");
    expect(screen.getByLabelText("Number of Rounds")).toHaveValue(1);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Alex")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Zoe")).toBeInTheDocument();
  });

  it("loads existing event configuration and excludes inactive roster entries", async () => {
    await loadEdit();
    expect(mocks.getTrip).toHaveBeenCalledWith(7);
    expect(screen.getByLabelText("Event Year")).toHaveValue(2026);
    expect(screen.getByLabelText("Entry Fee")).toHaveValue(150);
    expect(screen.getByLabelText("Number of Rounds")).toHaveValue(3);
    expect(screen.getByLabelText("Event Handicap Method")).toHaveValue("GHIN_HISTORY");
    expect(screen.getByText("Selected Players:").parentElement).toHaveTextContent("2");
    expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
    expect(screen.getByText(/GHIN 8 · DB 0 · Event 2/)).toBeInTheDocument();
  });

  it("builds an uppercase event code from name and year", async () => {
    await loadCreate();
    fireEvent.change(screen.getByLabelText("Event Name"), { target: { value: "Myrtle Beach!" } });
    fireEvent.change(screen.getByLabelText("Event Year"), { target: { value: "2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Build Event Code" }));
    expect(screen.getByLabelText("Event Code")).toHaveValue("MYRTLE_BEACH_2027");
  });

  it("filters active players and supports select-all and clear actions", async () => {
    await loadCreate();
    fireEvent.click(screen.getByRole("button", { name: "Select All Active" }));
    expect(screen.getByText("Selected Players:").parentElement).toHaveTextContent("2");
    fireEvent.change(screen.getByLabelText("Search Players"), { target: { value: "zo" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Zoe")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("Selected Players:").parentElement).toHaveTextContent("0");
  });

  it("switches scratch mode and disables handicap-method selection", async () => {
    await loadCreate();
    fireEvent.click(screen.getByRole("checkbox", { name: /Scratch \/ no handicaps/ }));
    expect(screen.getByLabelText("Event Handicap Method")).toBeDisabled();
    expect(screen.getByText(/Everyone will be treated as scratch/)).toBeInTheDocument();
  });

  it("requires mandatory event fields before calling save", async () => {
    await loadCreate();
    fireEvent.click(screen.getByRole("button", { name: "Save Event" }));
    expect(await screen.findByText("Event name is required.")).toBeInTheDocument();
    expect(mocks.saveTripSetup).not.toHaveBeenCalled();
  });

  it("creates an event with normalized data and navigates to its detail", async () => {
    await loadCreate();
    enterRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Select All Active" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Event" }));
    await waitFor(() => expect(mocks.saveTripSetup).toHaveBeenCalledWith(expect.objectContaining({
      tripId: null, name: "Fall Cup", tripCode: "FALL_2026",
      tripStartDate: "2026-11-01", tripEndDate: "2026-11-03",
      plannedRoundCount: 1, playerIds: [3, 1],
    })));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/trips/7"));
  });

  it("blocks editing of initialized events", async () => {
    mocks.getTrip.mockResolvedValue({ ...trip, initialized: true });
    await loadEdit();
    expect(screen.getByText(/already initialized/)).toBeInTheDocument();
    expect(screen.getByLabelText("Event Name")).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Save Event Changes" }).every((el) => (el as HTMLButtonElement).disabled)).toBe(true);
  });

  it("confirms cancellation of unsaved create changes and honors rejection", async () => {
    await loadCreate();
    fireEvent.change(screen.getByLabelText("Event Name"), { target: { value: "New Event" } });
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/trips"));
  });
});
