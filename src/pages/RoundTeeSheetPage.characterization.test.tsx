import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RoundTeeSheetPage from "./RoundTeeSheetPage";

const mocks = vi.hoisted(() => ({
  roundId: "42" as string | undefined,
  navigate: vi.fn(),
  getRoundSetupStatus: vi.fn(),
  downloadCsv: vi.fn(),
  printWithReportTitle: vi.fn(),
  buildReportFileTitle: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ roundId: mocks.roundId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/roundSetupApi", () => ({ getRoundSetupStatus: mocks.getRoundSetupStatus }));
vi.mock("../utils/exportUtils", () => ({
  downloadCsv: mocks.downloadCsv,
  sanitizeFileName: (value: string) => value.replace(/[^a-zA-Z0-9-]/g, "-"),
}));
vi.mock("../utils/printUtils", () => ({
  buildReportFileTitle: mocks.buildReportFileTitle,
  printWithReportTitle: mocks.printWithReportTitle,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: () => <button type="button">Event Detail</button>,
}));
vi.mock("../components/common/ReportsButton", () => ({
  default: () => <button type="button">Reports</button>,
}));
vi.mock("../components/common/WorkflowBackButton", () => ({
  default: () => <button type="button">Back</button>,
}));

const player = (playerId: number, playerName: string, overrides: Record<string, unknown> = {}) => ({
  scorecardId: playerId + 100,
  playerId,
  playerName,
  roundTeeName: "Blue",
  courseHandicap: 11,
  playingHandicap: 9,
  ...overrides,
});
const group = (groupNumber: number, teeTime: string | null, startingHole: number | null, members: Array<{ playerId: number; playerName: string }>) => ({
  groupId: groupNumber + 200,
  groupNumber,
  teeTime,
  startingHole,
  players: members.map((member, index) => ({ ...member, seatOrder: index + 1 })),
});
const alex = { playerId: 1, playerName: "Alex Golfer" };
const blair = { playerId: 2, playerName: "Blair Player" };

function response(overrides: Record<string, unknown> = {}) {
  return {
    roundId: 42,
    round: {
      roundId: 42, tripId: 7, courseName: "Lake Course", teeName: "Blue",
      roundDate: "2026-11-12", format: "STROKE_PLAY", finalized: false, tripLocked: false,
      players: [player(1, "Alex Golfer"), player(2, "Blair Player", { courseHandicap: null, playingHandicap: null })],
    },
    readiness: { ready: true, readyForScoring: true },
    groups: { roundId: 42, groups: [group(1, "08:00", 1, [alex]), group(2, "08:10", 1, [blair])] },
    teamAssignment: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roundId = "42";
  mocks.getRoundSetupStatus.mockResolvedValue(response());
  mocks.buildReportFileTitle.mockReturnValue("Printable Tee Sheet");
});
afterEach(() => cleanup());

async function loadPage() {
  render(<RoundTeeSheetPage />);
  await screen.findByRole("heading", { name: "Tee Sheet" });
  await waitFor(() => expect(mocks.getRoundSetupStatus).toHaveBeenCalledWith(42));
}

describe("Round tee sheet page characterization (before extraction)", () => {
  it("loads the round status and renders its course, format, tee and player handicaps", async () => {
    await loadPage();
    expect(screen.getByRole("heading", { name: "Round Information" })).toBeInTheDocument();
    expect(screen.getAllByText("Lake Course").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stroke Play").length).toBeGreaterThan(0);
    const alexRow = screen.getByText("Alex Golfer").closest("tr")!;
    expect(within(alexRow).getByText("Blue")).toBeInTheDocument();
    expect(within(alexRow).getByText("11")).toBeInTheDocument();
    expect(within(alexRow).getByText("9")).toBeInTheDocument();
    expect(within(screen.getByText("Blair Player").closest("tr")!).getAllByText("—")).toHaveLength(2);
  });

  it("reports a missing round id without requesting the API", async () => {
    mocks.roundId = undefined;
    render(<RoundTeeSheetPage />);
    expect(await screen.findByText("Missing round id.")).toBeInTheDocument();
    expect(mocks.getRoundSetupStatus).not.toHaveBeenCalled();
  });

  it("shows an error if the round status request fails", async () => {
    mocks.getRoundSetupStatus.mockRejectedValue(new Error("Unavailable"));
    render(<RoundTeeSheetPage />);
    expect(await screen.findByText("Failed to load tee sheet.")).toBeInTheDocument();
  });

  it("shows the unconfigured start type and empty-state text with no groups", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({ groups: { roundId: 42, groups: [] } }));
    await loadPage();
    expect(screen.getByText("Start Type: Not Configured")).toBeInTheDocument();
    expect(screen.getByText("No groups have been created for this round.")).toBeInTheDocument();
  });

  it("sorts groups by tee time before group number", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({ groups: { roundId: 42, groups: [
      group(3, "09:00", 1, [blair]), group(2, null, 1, []), group(1, "08:10", 1, [alex]),
    ] } }));
    await loadPage();
    expect(screen.getAllByText(/^Group [123]$/).map((element) => element.textContent)).toEqual(["Group 1", "Group 3", "Group 2"]);
  });

  it("describes a split-tee start when groups begin on holes one and ten", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({ groups: { roundId: 42, groups: [
      group(1, "08:00", 1, [alex]), group(2, "08:00", 10, [blair]),
    ] } }));
    await loadPage();
    expect(screen.getByText("Start Type: Split Tees")).toBeInTheDocument();
    expect(screen.getByText("Groups start on Holes #1 and #10.")).toBeInTheDocument();
  });

  it("disables scoring until ready but permits viewing scores for a finalized locked round", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({ readiness: { ready: false, readyForScoring: false } }));
    await loadPage();
    expect(screen.getByRole("button", { name: "Scoring" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit Groups" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/groups");
    cleanup();
    mocks.navigate.mockClear();
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { ...response().round, finalized: true, tripLocked: true },
      readiness: { ready: false, readyForScoring: false },
    }));
    await loadPage();
    expect(screen.getByRole("button", { name: "View Groups" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Scores" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/scoring");
  });

  it("exports sorted group assignments with the corresponding handicap values", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(mocks.downloadCsv).toHaveBeenCalledTimes(1);
    const [fileName, rows] = mocks.downloadCsv.mock.calls[0];
    expect(fileName).toMatch(/tee-sheet\.csv$/);
    expect(rows[0]).toEqual(["Group", "Tee Time", "Starting Hole", "Player", "Tee", "Course Handicap", "Playing Handicap"]);
    expect(rows[1]).toEqual([1, expect.any(String), "#1", "Alex Golfer", "Blue", 11, 9]);
    expect(rows[2]).toEqual([2, expect.any(String), "#1", "Blair Player", "Blue", "", ""]);
  });

  it("prints with a report title containing the round name and date", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(mocks.buildReportFileTitle).toHaveBeenCalledWith("Lake Course", "Tee Sheet", "2026-11-12");
    expect(mocks.printWithReportTitle).toHaveBeenCalledWith("Printable Tee Sheet");
  });
});
