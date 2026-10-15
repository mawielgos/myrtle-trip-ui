import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RoundTeamAssignmentPage from "./RoundTeamAssignmentPage";

// Characterize the page's orchestration; domain rules and data hooks already have separate coverage.
const mocks = vi.hoisted(() => ({
  roundId: "17" as string | undefined,
  navigate: vi.fn(), confirmLeave: vi.fn(), save: vi.fn(), suggest: vi.fn(),
  applySuggestion: vi.fn(), setConfirmSuggestion: vi.fn(), setError: vi.fn(), setMessage: vi.fn(),
  setDirty: vi.fn(), updateTee: vi.fn(), saveScramble: vi.fn(),
  data: {} as Record<string, any>, view: {} as Record<string, any>,
  interaction: {} as Record<string, any>, command: {} as Record<string, any>,
  completion: {} as Record<string, any>,
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ roundId: mocks.roundId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../hooks/useRoundTeamAssignmentPageData", () => ({
  useRoundTeamAssignmentPageData: () => mocks.data,
}));
vi.mock("../hooks/useRoundTeamAssignmentViewState", () => ({
  useRoundTeamAssignmentBaseViewState: () => mocks.view,
  getRoundTeamAssignmentCompletionState: () => mocks.completion,
}));
vi.mock("../hooks/useRoundTeamAssignmentInteractions", () => ({
  useRoundTeamAssignmentInteractions: () => mocks.interaction,
}));
vi.mock("../hooks/useRoundTeamAssignmentCommands", () => ({
  useRoundTeamAssignmentCommands: () => mocks.command,
}));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: () => mocks.confirmLeave,
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle: React.ReactNode; actions: React.ReactNode }) =>
    <header><h1>{title}</h1><div data-testid="subtitle">{subtitle}</div><div data-testid="actions">{actions}</div></header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({ default: () => <div>Trip Detail Action</div> }));
vi.mock("../components/common/WorkflowBackButton", () => ({ default: () => <div>Back to Round Setup</div> }));
vi.mock("../components/round/RoundProgressBar", () => ({ default: () => <div>Progress Indicator</div> }));
vi.mock("../components/round/RoundReadinessPanel", () => ({ default: () => <div>Readiness Indicator</div> }));
vi.mock("../components/round/RoundTeamAssignmentTables", () => ({
  default: ({ teams, unassignedPlayers }: { teams: unknown[]; unassignedPlayers: unknown[] }) =>
    <div data-testid="assignment-tables">{teams.length} teams; {unassignedPlayers.length} unassigned</div>,
}));
vi.mock("../components/round/RoundTeamAssignmentScrambleSetup", () => ({
  default: () => <div data-testid="scramble-setup">Scramble Setup</div>,
}));
vi.mock("../components/round/RoundTeamAssignmentExceptionControl", () => ({ default: () => <div>Exception Control</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roundId = "17";
  mocks.confirmLeave.mockResolvedValue(true);
  mocks.save.mockResolvedValue(true);
  mocks.data = {
    status: { roundId: 17, tripId: 5, roundNumber: 2, format: "TWO_MAN_LOW_NET", courseName: "Pine Hills", roundDate: "2026-10-20" },
    eventRoundNumber: 2, readiness: null, capabilities: {}, loading: false,
    error: null, setError: mocks.setError, message: null, setMessage: mocks.setMessage,
    defaultRoundTeeId: null, teeOptions: [], teams: [], setTeams: vi.fn(),
    unassignedPlayers: [], setUnassignedPlayers: vi.fn(), inactivePlayers: [],
    teamExceptions: [], setTeamExceptions: vi.fn(), originalTeeByScorecardId: {},
    setOriginalTeeByScorecardId: vi.fn(), seedingLabel: null, setSeedingLabel: vi.fn(),
    scrambleTeamSize: null, setScrambleTeamSize: vi.fn(),
    scrambleSeedingMethod: "CURRENT_HANDICAP_INDEX", setScrambleSeedingMethod: vi.fn(),
    scrambleHandicapDate: "", setScrambleHandicapDate: vi.fn(),
    scrambleSeedingRounds: [], setScrambleSeedingRounds: vi.fn(),
    scrambleConfigDirty: false, setScrambleConfigDirty: vi.fn(),
    setReadiness: vi.fn(), setCapabilities: vi.fn(), applyAssignmentPageResponse: vi.fn(),
  };
  mocks.view = {
    assignedCount: 0, totalPlayers: 0, inactiveCount: 0, hasScrambleEvent: false,
    hasTwoManLowNetEvent: true, expectedTeamSize: 2, expectedTeamCount: 0,
    isFinalizedRound: false, tripIsLocked: false, canAssignTeams: true,
    canSuggestTeamAssignments: true, canEditScrambleSetup: false,
    canCorrectTeeAfterFinalization: false, teeCorrectionsAllowed: false, teamStructureLocked: false,
  };
  mocks.interaction = {
    dirty: false, setDirty: mocks.setDirty, confirmSuggestTeams: false,
    setConfirmSuggestTeams: mocks.setConfirmSuggestion,
    updatePlayerTee: mocks.updateTee, moveUnassignedPlayerToTeam: vi.fn(),
    removePlayerFromTeam: vi.fn(), movePlayerWithinTeam: vi.fn(),
    updateScrambleSeedingRound: vi.fn(), updateScrambleTeamSize: vi.fn(),
    updateScrambleSeedingMethod: vi.fn(), updateScrambleHandicapDate: vi.fn(),
    applySuggestedScrambleTeams: mocks.applySuggestion, suggestScrambleTeams: mocks.suggest,
  };
  mocks.command = {
    saving: false, handleParticipationChange: vi.fn(),
    handleSaveScrambleConfig: mocks.saveScramble, handleSave: mocks.save,
    handleSaveGhostException: vi.fn(), handleSaveRotationException: vi.fn(),
    handleDeleteException: vi.fn(),
  };
  mocks.completion = {
    shortFourManTeams: [], shortFourManTeamsNeedingException: [],
    isReadyForScoring: false, scoringBlockedReason: "Assignments incomplete",
    usesDerivedTeeSheetGroups: false, derivedGroupsButtonLabel: "Set Tee Times",
    saveButtonLabel: "Save Teams",
  };
});
afterEach(() => cleanup());

describe("Round team assignment page characterization (before page composition extraction)", () => {
  it("shows loading state without rendering assignment controls", () => {
    mocks.data.loading = true;
    render(<RoundTeamAssignmentPage />);
    expect(screen.getByText("Loading team assignment...")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-tables")).not.toBeInTheDocument();
  });
  it("shows round identity, assignment totals and saved state", () => {
    mocks.view.assignedCount = 4;
    mocks.view.totalPlayers = 5;
    mocks.view.expectedTeamCount = 3;
    mocks.data.unassignedPlayers = [{}];
    render(<RoundTeamAssignmentPage />);
    expect(screen.getByRole("heading", { name: "Round Team Assignment" })).toBeInTheDocument();
    expect(screen.getByTestId("subtitle").textContent).toContain("Pine Hills");
    expect(screen.getByTestId("subtitle").textContent).toContain("Assigned: 4");
    expect(screen.getByTestId("subtitle").textContent).toContain("Unassigned: 1");
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });
  it("exposes an enabled save action only when assignments are dirty", () => {
    const { rerender } = render(<RoundTeamAssignmentPage />);
    expect(screen.getAllByRole("button", { name: "Save Teams" })[0]).toBeDisabled();
    mocks.interaction.dirty = true;
    rerender(<RoundTeamAssignmentPage />);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Save Teams" })[0]);
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it("asks before leaving for the tee sheet and honors cancellation", async () => {
    mocks.confirmLeave.mockResolvedValue(false);
    render(<RoundTeamAssignmentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Tee Sheet" }));
    await waitFor(() => expect(mocks.confirmLeave).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("navigates to results when the navigation guard approves", async () => {
    render(<RoundTeamAssignmentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Results" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/rounds/17/results"));
  });
  it("prevents scoring navigation when readiness is incomplete", () => {
    render(<RoundTeamAssignmentPage />);
    const button = screen.getByRole("button", { name: "Continue to Scoring" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Assignments incomplete");
  });
  it("requires saving scramble setup before opening derived tee-sheet groups", () => {
    mocks.completion.usesDerivedTeeSheetGroups = true;
    mocks.data.scrambleConfigDirty = true;
    render(<RoundTeamAssignmentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Set Tee Times" }));
    expect(mocks.setError).toHaveBeenCalledWith(expect.stringContaining("Save Scramble Setup"));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("saves dirty team assignments before navigating to derived groups", async () => {
    mocks.completion.usesDerivedTeeSheetGroups = true;
    mocks.interaction.dirty = true;
    render(<RoundTeamAssignmentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Set Tee Times" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/rounds/17/groups"));
  });
  it("shows locked status and hides saving when event is complete", () => {
    mocks.view.tripIsLocked = true;
    render(<RoundTeamAssignmentPage />);
    expect(screen.getByText(/This event is complete and locked/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Teams" })).not.toBeInTheDocument();
  });
});
