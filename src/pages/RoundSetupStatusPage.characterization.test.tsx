import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import RoundSetupStatusPage from "./RoundSetupStatusPage";

const mocks = vi.hoisted(() => ({
  roundId: "42" as string | undefined,
  navigate: vi.fn(),
  getRoundSetupStatus: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ roundId: mocks.roundId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/roundSetupApi", () => ({ getRoundSetupStatus: mocks.getRoundSetupStatus }));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: ({ tripId }: { tripId: number }) => <button type="button">Event {tripId}</button>,
}));
vi.mock("../components/round/RoundProgressBar", () => ({
  default: ({ currentStep }: { currentStep: string }) => <div data-testid="round-progress">{currentStep}</div>,
}));

function response(overrides: Record<string, unknown> = {}) {
  return {
    round: {
      roundId: 42, tripId: 7, courseName: "Lake Course", teeName: "Blue",
      roundDate: "2026-10-20", format: "STROKE_PLAY", finalized: false, tripLocked: false,
      players: [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }],
      ...(overrides.round as Record<string, unknown> ?? {}),
    },
    readiness: {
      ready: true, groupsReady: true, teamsReady: true, teesReady: true, scorecardsReady: true,
      ...(overrides.readiness as Record<string, unknown> ?? {}),
    },
    groups: {
      groups: [{ groupId: 1, players: [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }] }],
      ...(overrides.groups as Record<string, unknown> ?? {}),
    },
    teamAssignment: {
      teams: [], unassignedPlayers: [],
      ...(overrides.teamAssignment as Record<string, unknown> ?? {}),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roundId = "42";
  mocks.getRoundSetupStatus.mockResolvedValue(response());
});
afterEach(cleanup);

async function loadPage() {
  render(<RoundSetupStatusPage />);
  await screen.findByRole("heading", { name: "Round Workflow" });
}
function section(name: string) {
  return screen.getByRole("heading", { name }).closest("section")!;
}

describe("Round setup status page characterization (before extraction)", () => {
  it("shows a loading indicator until round setup data arrives", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getRoundSetupStatus.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<RoundSetupStatusPage />);
    expect(screen.getByText("Loading round setup...")).toBeInTheDocument();
    resolve(response());
    await screen.findByRole("heading", { name: "Round Workflow" });
    expect(mocks.getRoundSetupStatus).toHaveBeenCalledWith(42);
  });

  it("renders the course, tee, format, player count and round readiness", async () => {
    await loadPage();
    expect(mocks.getRoundSetupStatus).toHaveBeenCalledWith(42);
    expect(screen.getByText(/Lake Course.*2026|Lake Course.*10\/20/)).toBeInTheDocument();
    const info = section("Round Information");
    expect(within(info).getByText("Blue")).toBeInTheDocument();
    expect(within(info).getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Ready for Scoring")).toBeInTheDocument();
    expect(screen.getByTestId("round-progress")).toHaveTextContent("setup");
  });

  it("navigates through Continue, Tee Sheet and Groups for a non-team format", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Tee Sheet" }));
    fireEvent.click(screen.getByRole("button", { name: "Groups" }));
    expect(mocks.navigate).toHaveBeenNthCalledWith(1, "/rounds/42/open");
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, "/rounds/42/tee-sheet");
    expect(mocks.navigate).toHaveBeenNthCalledWith(3, "/rounds/42/groups");
    expect(section("Format Notes")).toHaveTextContent("Separate team assignment is not required");
    expect(section("Setup Summary")).toHaveTextContent("Derived from groups for this format");
  });

  it("shows unassigned group counts and disables scoring when readiness is false", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      groups: { groups: [{ groupId: 1, players: [{ playerId: 1 }] }] },
      readiness: { ready: false, groupsReady: false, blockingIssues: ["Groups are incomplete"] },
    }));
    await loadPage();
    const summary = section("Setup Summary");
    expect(summary).toHaveTextContent("Players Unassigned from Groups");
    expect(summary).toHaveTextContent("2");
    expect(summary).toHaveTextContent("Groups Complete");
    expect(screen.getByText("Groups are incomplete")).toBeInTheDocument();
    const scoring = screen.getByRole("button", { name: "Scoring" });
    expect(scoring).toBeDisabled();
    fireEvent.click(scoring);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("shows scramble team actions, derived groups and team assignment counts", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { format: "TEAM_SCRAMBLE" },
      readiness: { requiresTeams: true, hasScrambleEvent: true },
      teamAssignment: { teams: [{ players: [{ playerId: 1 }, { playerId: 2 }] }], unassignedPlayers: [{ playerId: 3 }] },
    }));
    await loadPage();
    expect(section("Format Notes")).toHaveTextContent("For Scramble, teams are entered first");
    expect(section("Setup Summary")).toHaveTextContent("Players Assigned to Teams");
    expect(section("Setup Summary")).toHaveTextContent("Players Unassigned from Teams");
    fireEvent.click(screen.getByRole("button", { name: "Teams" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Tee Times / Derived Groups" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/teams");
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/groups");
  });

  it("uses two-man low-net explanatory text and derived groups action", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { format: "TWO_MAN_LOW_NET" },
      readiness: { requiresTeams: true, hasTwoManLowNetEvent: true },
    }));
    await loadPage();
    expect(section("Format Notes")).toHaveTextContent("For 2-Man Low Net, teams are entered first");
    expect(screen.getByRole("button", { name: "Set Tee Times / Derived Groups" })).toBeInTheDocument();
  });

  it("permits scoring for a finalized round but labels it as corrections", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { finalized: true }, readiness: { ready: true },
    }));
    await loadPage();
    const action = screen.getByRole("button", { name: "Edit Corrections" });
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/scoring");
  });

  it("rejects missing round ids without requesting round data", async () => {
    mocks.roundId = undefined;
    render(<RoundSetupStatusPage />);
    expect(await screen.findByText("Missing round id.")).toBeInTheDocument();
    expect(mocks.getRoundSetupStatus).not.toHaveBeenCalled();
  });

  it("renders the server failure and incomplete response states", async () => {
    mocks.getRoundSetupStatus.mockRejectedValueOnce(new Error("Unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = render(<RoundSetupStatusPage />);
    expect(await screen.findByText("Failed to load round setup status.")).toBeInTheDocument();
    first.unmount();
    mocks.getRoundSetupStatus.mockResolvedValueOnce({ round: null });
    render(<RoundSetupStatusPage />);
    expect(await screen.findByText("Round setup data was not found.")).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
