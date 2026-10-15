import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PlayerEditPage from "./PlayerEditPage";
import type { PlayerDetail } from "../types/player";

const mocks = vi.hoisted(() => ({
  playerId: "42" as string | undefined,
  locationState: null as { saveMessage?: string } | null,
  navigate: vi.fn(),
  alert: vi.fn(),
  confirm: vi.fn(),
  getPlayer: vi.fn(),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  setPlayerActive: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ playerId: mocks.playerId }),
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ pathname: "/admin/players/42", state: mocks.locationState }),
}));
vi.mock("../api/playerApi", () => ({
  getPlayer: mocks.getPlayer,
  createPlayer: mocks.createPlayer,
  updatePlayer: mocks.updatePlayer,
  setPlayerActive: mocks.setPlayerActive,
}));
vi.mock("../components/common/AppDialog", () => ({
  useAppDialog: () => ({ alertDialog: mocks.alert }),
}));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: (dirty: boolean) => async () => !dirty || mocks.confirm(),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle: string; actions: React.ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));

const player = (overrides: Partial<PlayerDetail> = {}): PlayerDetail => ({
  playerId: 42, firstName: "Alex", lastName: "Golfer", displayName: "Alex Golfer",
  ghinNumber: "123456", active: true, email: "alex@example.com", cell: "555-1234",
  venmoId: "@alex", zelleId: "alex-z", handicapMethod: "GHIN", gender: "M",
  ...overrides,
});
const textbox = (label: string) =>
  within(screen.getByText(label, { selector: "div" }).parentElement!).getByRole("textbox") as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.playerId = "42";
  mocks.locationState = null;
  mocks.getPlayer.mockResolvedValue(player());
  mocks.createPlayer.mockResolvedValue(player());
  mocks.updatePlayer.mockResolvedValue(player());
  mocks.setPlayerActive.mockResolvedValue(undefined);
  mocks.alert.mockResolvedValue(undefined);
  mocks.confirm.mockResolvedValue(true);
});
afterEach(() => cleanup());
async function loadExisting() {
  render(<PlayerEditPage />);
  await screen.findByRole("heading", { name: "Player Info" });
  await waitFor(() => expect(mocks.getPlayer).toHaveBeenCalledWith(42));
  await screen.findByDisplayValue("Alex");
}

describe("Player edit page characterization (before extraction)", () => {
  it("loads an existing player and populates identity and contact fields", async () => {
    await loadExisting();
    expect(screen.getByRole("heading", { name: "Edit Player" })).toBeInTheDocument();
    expect(textbox("First Name").value).toBe("Alex");
    expect(textbox("Last Name").value).toBe("Golfer");
    expect(textbox("Email").value).toBe("alex@example.com");
    expect(screen.getByText("Active • GHIN 123456")).toBeInTheDocument();
  });

  it("recomputes the read-only display name and summary when names change", async () => {
    await loadExisting();
    fireEvent.change(textbox("First Name"), { target: { value: "  Taylor  " } });
    expect(textbox("Display Name")).toHaveValue("Taylor Golfer");
    expect(textbox("Display Name")).toHaveAttribute("readonly");
    const summary = screen.getByRole("heading", { name: "Summary" }).parentElement!;
    expect(within(summary).getByText(/Display Name:/).textContent).toContain("Taylor Golfer");
  });

  it("saves an existing player with normalized values", async () => {
    await loadExisting();
    fireEvent.change(textbox("First Name"), { target: { value: "  Taylor  " } });
    fireEvent.change(textbox("Email"), { target: { value: "  taylor@example.com  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Player" }));
    await waitFor(() => expect(mocks.updatePlayer).toHaveBeenCalledWith(42, expect.objectContaining({
      firstName: "Taylor", lastName: "Golfer", displayName: "Taylor Golfer", email: "taylor@example.com",
    })));
    expect(await screen.findByText("Player saved successfully.")).toBeInTheDocument();
  });

  it("requires a first name before saving", async () => {
    await loadExisting();
    fireEvent.change(textbox("First Name"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Player" }));
    await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith(expect.objectContaining({ title: "First Name Required" })));
    expect(mocks.updatePlayer).not.toHaveBeenCalled();
  });

  it("requires a last name before saving", async () => {
    await loadExisting();
    fireEvent.change(textbox("Last Name"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Player" }));
    await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith(expect.objectContaining({ title: "Last Name Required" })));
    expect(mocks.updatePlayer).not.toHaveBeenCalled();
  });

  it("creates a new player and navigates to its edit page", async () => {
    mocks.playerId = undefined;
    render(<PlayerEditPage />);
    expect(screen.getByRole("heading", { name: "Add Player" })).toBeInTheDocument();
    expect(mocks.getPlayer).not.toHaveBeenCalled();
    fireEvent.change(textbox("First Name"), { target: { value: "  Alex " } });
    fireEvent.change(textbox("Last Name"), { target: { value: " Golfer  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Player" }));
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledWith(expect.objectContaining({
      firstName: "Alex", lastName: "Golfer", displayName: "Alex Golfer",
    })));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/admin/players/42", {
      state: { saveMessage: "Player created successfully." },
    }));
  });

  it("deactivates the current player then reloads player detail", async () => {
    await loadExisting();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.setPlayerActive).toHaveBeenCalledWith(42, false));
    await waitFor(() => expect(mocks.getPlayer).toHaveBeenCalledTimes(2));
  });

  it("requires confirmation before leaving with unsaved changes", async () => {
    await loadExisting();
    fireEvent.change(textbox("First Name"), { target: { value: "Changed" } });
    mocks.confirm.mockResolvedValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalledWith("/admin/players");
    mocks.confirm.mockResolvedValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/admin/players"));
  });

  it("shows the API error when loading a player fails", async () => {
    mocks.getPlayer.mockRejectedValue({ response: { data: { message: "Player unavailable" } } });
    render(<PlayerEditPage />);
    expect(await screen.findByText("Player unavailable")).toBeInTheDocument();
  });
});
