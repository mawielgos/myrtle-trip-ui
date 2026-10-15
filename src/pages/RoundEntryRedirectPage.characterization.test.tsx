import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import RoundEntryRedirectPage from "./RoundEntryRedirectPage";

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

function response(overrides: {
  round?: Record<string, unknown>;
  readiness?: Record<string, unknown>;
} = {}) {
  return {
    round: {
      roundId: 42,
      format: "STROKE_PLAY",
      finalized: false,
      players: [{ playerId: 1 }, { playerId: 2 }],
      ...overrides.round,
    },
    readiness: {
      requiresTeams: false,
      hasScrambleEvent: false,
      teamsReady: true,
      groupsReady: true,
      ...overrides.readiness,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roundId = "42";
  mocks.getRoundSetupStatus.mockResolvedValue(response());
});
afterEach(cleanup);

async function expectDestination(path: string) {
  render(<RoundEntryRedirectPage />);
  await waitFor(() => {
    expect(mocks.navigate).toHaveBeenCalledWith(path, { replace: true });
  });
  expect(mocks.navigate).toHaveBeenCalledTimes(1);
  expect(mocks.getRoundSetupStatus).toHaveBeenCalledWith(42);
}

describe("Round entry redirect page characterization (before extraction)", () => {
  it("shows a status message while the round setup request is pending", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getRoundSetupStatus.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<RoundEntryRedirectPage />);
    expect(screen.getByRole("heading", { name: "Opening Round..." })).toBeInTheDocument();
    expect(screen.getByText("Checking round setup status.")).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
    resolve(response());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/scoring", { replace: true }));
  });

  it("opens scoring for finalized rounds regardless of team or group readiness", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { finalized: true, format: "TEAM_SCRAMBLE" },
      readiness: { requiresTeams: true, hasScrambleEvent: true, teamsReady: false, groupsReady: false },
    }));
    await expectDestination("/rounds/42/scoring");
  });

  it("opens groups when an individual round has incomplete groups", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({ readiness: { groupsReady: false } }));
    await expectDestination("/rounds/42/groups");
  });

  it("opens scoring when an individual round has complete groups", async () => {
    await expectDestination("/rounds/42/scoring");
  });

  it("opens team assignment when required teams are not ready", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { format: "TWO_MAN_LOW_NET" },
      readiness: { requiresTeams: true, teamsReady: false, groupsReady: false },
    }));
    await expectDestination("/rounds/42/teams");
  });

  it("opens groups when non-scramble teams are ready but groups are not", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { format: "TWO_MAN_LOW_NET" },
      readiness: { requiresTeams: true, teamsReady: true, groupsReady: false },
    }));
    await expectDestination("/rounds/42/groups");
  });

  it("opens scoring when non-scramble teams and groups are ready", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { format: "TWO_MAN_LOW_NET" },
      readiness: { requiresTeams: true, teamsReady: true, groupsReady: true },
    }));
    await expectDestination("/rounds/42/scoring");
  });

  it("keeps an unscored scramble on teams even after teams and groups are ready", async () => {
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      round: { format: "TEAM_SCRAMBLE" },
      readiness: { requiresTeams: true, hasScrambleEvent: true, teamsReady: true, groupsReady: true },
    }));
    await expectDestination("/rounds/42/teams");
  });

  it("routes a scored scramble according to group readiness and displays input or API errors", async () => {
    const scored = {
      round: { format: "TEAM_SCRAMBLE", players: [{ playerId: 1, adjustedGrossScore: 75 }] },
      readiness: { requiresTeams: true, hasScrambleEvent: true, teamsReady: true, groupsReady: false },
    };
    mocks.getRoundSetupStatus.mockResolvedValue(response(scored));
    const first = render(<RoundEntryRedirectPage />);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/teams", { replace: true }));
    first.unmount();

    mocks.navigate.mockClear();
    mocks.getRoundSetupStatus.mockResolvedValue(response({
      ...scored, readiness: { ...scored.readiness, groupsReady: true },
    }));
    const second = render(<RoundEntryRedirectPage />);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/scoring", { replace: true }));
    second.unmount();

    mocks.navigate.mockClear();
    mocks.getRoundSetupStatus.mockClear();
    mocks.roundId = undefined;
    const missing = render(<RoundEntryRedirectPage />);
    expect(await screen.findByText("Missing round id.")).toBeInTheDocument();
    expect(mocks.getRoundSetupStatus).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    missing.unmount();

    mocks.roundId = "42";
    mocks.getRoundSetupStatus.mockRejectedValue(new Error("Network failure"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(<RoundEntryRedirectPage />);
      expect(await screen.findByText("Unable to determine the next step for this round.")).toBeInTheDocument();
      expect(mocks.navigate).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
