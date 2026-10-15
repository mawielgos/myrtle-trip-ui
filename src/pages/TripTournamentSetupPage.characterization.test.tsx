import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TripTournamentSetupPage from "./TripTournamentSetupPage";
import type { TripTournamentRound, TripTournamentSetup } from "../types/trip";

const mocks = vi.hoisted(() => ({
  tripId: "7" as string | undefined,
  navigate: vi.fn(),
  getTripDetail: vi.fn(),
  getTripTournamentSetup: vi.fn(),
  saveTripTournamentSetup: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/tripApi", () => ({
  getTripDetail: mocks.getTripDetail,
  getTripTournamentSetup: mocks.getTripTournamentSetup,
  saveTripTournamentSetup: mocks.saveTripTournamentSetup,
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

const round = (id: number, overrides: Partial<TripTournamentRound> = {}): TripTournamentRound => ({
  plannedRoundId: id,
  roundNumber: id,
  roundDate: "2026-10-10",
  format: "TWO_LOW_NET",
  courseId: 5,
  courseName: `Course ${id}`,
  configured: true,
  included: true,
  sortOrder: id,
  ...overrides,
});
const setup = (overrides: Partial<TripTournamentSetup> = {}): TripTournamentSetup => ({
  tournamentId: 12,
  tripId: 7,
  enabled: true,
  name: "Fall Championship",
  standingsLabel: "Event Standings",
  lowNetEnabled: true,
  lowGrossEnabled: false,
  lowNetName: "Net Title",
  lowGrossName: "Gross Title",
  readOnly: false,
  rounds: [round(2), round(1)],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "7";
  mocks.getTripDetail.mockResolvedValue({ tripName: "Fall Trip", status: "PLANNING" });
  mocks.getTripTournamentSetup.mockResolvedValue(setup());
  mocks.saveTripTournamentSetup.mockResolvedValue(setup());
  mocks.confirm.mockResolvedValue(true);
});
afterEach(() => cleanup());

async function loadPage() {
  render(<TripTournamentSetupPage />);
  await screen.findByRole("heading", { name: "Tournament Basics" });
  await waitFor(() => expect(mocks.getTripTournamentSetup).toHaveBeenCalledWith(7));
}
const save = () => fireEvent.click(screen.getAllByRole("button", { name: "Save Tournament Setup" })[0]);

// Characterize the existing behavior before extracting page logic or presentation.
describe("Trip tournament setup page characterization (before extraction)", () => {
  it("loads trip and tournament setup for the route id, including default competition fields", async () => {
    await loadPage();
    expect(mocks.getTripDetail).toHaveBeenCalledWith(7);
    expect(screen.getByRole("heading", { name: "Multi-Round Tournament Setup" })).toBeInTheDocument();
    expect(screen.getByText(/Fall Trip.*PLANNING/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tournament Name" })).toHaveValue("Fall Championship");
    expect(screen.getByRole("textbox", { name: "Standings Label" })).toHaveValue("Event Standings");
    expect(screen.getByRole("checkbox", { name: "Enable Low Net tournament competition" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Enable Low Gross tournament competition" })).not.toBeChecked();
  });

  it("sorts the displayed rounds by round number regardless of API order", async () => {
    await loadPage();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Round 1")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 configured non-scramble rounds included.")).toBeInTheDocument();
  });

  it("includes only configured rounds when the bulk include action is used", async () => {
    mocks.getTripTournamentSetup.mockResolvedValue(setup({ rounds: [round(1, { included: false }), round(2, { included: false }), round(3, { included: false, configured: false })] }));
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Include Configured Rounds" }));
    expect(screen.getByText("2 of 2 configured non-scramble rounds included.")).toBeInTheDocument();
    save();
    await waitFor(() => expect(mocks.saveTripTournamentSetup).toHaveBeenCalledWith(7,
      expect.objectContaining({ includedPlannedRoundIds: [1, 2] })));
  });

  it("clears included rounds and blocks save until at least two are selected", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Clear Included Rounds" }));
    expect(screen.getByText("0 of 2 configured non-scramble rounds included.")).toBeInTheDocument();
    save();
    expect(await screen.findByText("A multi-round tournament needs at least two included rounds.")).toBeInTheDocument();
    expect(mocks.saveTripTournamentSetup).not.toHaveBeenCalled();
  });

  it("requires a competition to remain enabled", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("checkbox", { name: "Enable Low Net tournament competition" }));
    save();
    expect(await screen.findByText("Select at least one tournament competition: Low Net, Low Gross, or both.")).toBeInTheDocument();
    expect(mocks.saveTripTournamentSetup).not.toHaveBeenCalled();
  });

  it("saves trimmed names and the selected rounds", async () => {
    await loadPage();
    fireEvent.change(screen.getByRole("textbox", { name: "Tournament Name" }), { target: { value: "  New Title  " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Standings Label" }), { target: { value: "  New Standings  " } });
    save();
    await waitFor(() => expect(mocks.saveTripTournamentSetup).toHaveBeenCalledWith(7,
      expect.objectContaining({ name: "New Title", standingsLabel: "New Standings", lowNetEnabled: true, lowGrossEnabled: false, includedPlannedRoundIds: [2, 1] })));
    expect(await screen.findByText("Tournament setup saved.")).toBeInTheDocument();
  });

  it("disabling the tournament saves an empty round list and default competition flags", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("checkbox", { name: "This event has a multi-round tournament" }));
    expect(screen.getByRole("textbox", { name: "Tournament Name" })).toBeDisabled();
    save();
    await waitFor(() => expect(mocks.saveTripTournamentSetup).toHaveBeenCalledWith(7,
      expect.objectContaining({ enabled: false, lowNetEnabled: true, lowGrossEnabled: false, includedPlannedRoundIds: [] })));
  });

  it("locks editing and hides save controls in read-only mode", async () => {
    mocks.getTripTournamentSetup.mockResolvedValue(setup({ readOnly: true }));
    await loadPage();
    expect(screen.getByText(/This event is complete and locked/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Tournament Setup" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tournament Name" })).toBeDisabled();
  });

  it("reports API loading failures without attempting to save", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.getTripTournamentSetup.mockRejectedValue(new Error("Unavailable"));
      render(<TripTournamentSetupPage />);
      expect(await screen.findByText("Unable to load tournament setup.")).toBeInTheDocument();
      expect(mocks.saveTripTournamentSetup).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
