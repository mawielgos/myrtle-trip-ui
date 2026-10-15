import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RoundSetupPage from "./RoundSetupPage";

const mocks = vi.hoisted(() => ({
  tripId: "7" as string | undefined,
  navigate: vi.fn(),
  getTrips: vi.fn(),
  getCourses: vi.fn(),
  getCourseTees: vi.fn(),
  startRound: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ tripId: mocks.tripId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/tripApi", () => ({ getTrips: mocks.getTrips }));
vi.mock("../api/courseApi", () => ({ getCourses: mocks.getCourses, getCourseTees: mocks.getCourseTees }));
vi.mock("../api/roundApi", () => ({ startRound: mocks.startRound }));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: (dirty: boolean) => async () => !dirty || mocks.confirm(),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));
vi.mock("../components/common/TripDetailButton", () => ({
  default: () => <button type="button">Event Detail</button>,
}));

const trips = [
  { tripId: 7, tripName: "Autumn Open", tripYear: 2026 },
  { tripId: 8, tripName: "Spring Classic", tripYear: 2027 },
];
const courses = [
  { courseId: 3, courseName: "Lake Course", location: "North Hills" },
  { courseId: 4, courseName: "Pine Course", location: null },
];
const singleTee = [{
  courseTeeId: 21, courseId: 3, teeName: "Blue", yardageTotal: 6300,
  courseRating: 71.4, slope: 128, effectiveDate: "2026-01-01",
}];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tripId = "7";
  mocks.getTrips.mockResolvedValue(trips);
  mocks.getCourses.mockResolvedValue(courses);
  mocks.getCourseTees.mockResolvedValue(singleTee);
  mocks.startRound.mockResolvedValue(42);
  mocks.confirm.mockResolvedValue(true);
});
afterEach(() => cleanup());

async function loadPage(): Promise<void> {
  render(<RoundSetupPage />);
  await screen.findByRole("combobox", { name: "Event" });
  await waitFor(() => expect(mocks.getTrips).toHaveBeenCalledTimes(1));
}
async function chooseCourse(): Promise<void> {
  fireEvent.change(screen.getByRole("combobox", { name: "Course" }), { target: { value: "3" } });
  await waitFor(() => expect(mocks.getCourseTees).toHaveBeenCalledWith(3));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Default Tee" })).toHaveValue("21"));
}

describe("Round setup page characterization (before extraction)", () => {
  it("loads event and course lookups and selects the matching route event", async () => {
    await loadPage();
    expect(mocks.getCourses).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("combobox", { name: "Event" })).toHaveValue("7");
    expect(screen.getByRole("option", { name: "Autumn Open (2026)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Lake Course — North Hills" })).toBeInTheDocument();
  });

  it("loads course tees and automatically selects the only available tee", async () => {
    await loadPage();
    expect(screen.getByRole("combobox", { name: "Default Tee" })).toBeDisabled();
    await chooseCourse();
    expect(screen.getByRole("option", { name: /Blue.*Rating 71\.4 \/ Slope 128/ })).toBeInTheDocument();
  });

  it("requires a course before starting a round", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    expect(await screen.findByText("Course is required.")).toBeInTheDocument();
    expect(mocks.startRound).not.toHaveBeenCalled();
  });

  it("requires a default tee when multiple tees are available", async () => {
    mocks.getCourseTees.mockResolvedValue([
      ...singleTee,
      { ...singleTee[0], courseTeeId: 22, teeName: "White" },
    ]);
    await loadPage();
    fireEvent.change(screen.getByRole("combobox", { name: "Course" }), { target: { value: "3" } });
    await waitFor(() => expect(mocks.getCourseTees).toHaveBeenCalledWith(3));
    await screen.findByRole("option", { name: /White/ });
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    expect(await screen.findByText("Default tee is required.")).toBeInTheDocument();
  });

  it("forces zero handicap percent for scramble and restores 100 for another format", async () => {
    await loadPage();
    fireEvent.change(screen.getByRole("combobox", { name: "Format" }), { target: { value: "TEAM_SCRAMBLE" } });
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Handicap Percent" })).toHaveValue(0));
    expect(screen.getByRole("spinbutton", { name: "Handicap Percent" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Format" }), { target: { value: "STROKE_PLAY" } });
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Handicap Percent" })).toHaveValue(100));
  });

  it("rejects a nonintegral handicap percentage", async () => {
    await loadPage();
    await chooseCourse();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Handicap Percent" }), { target: { value: "75.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    expect(await screen.findByText("Handicap percent must be a whole number.")).toBeInTheDocument();
    expect(mocks.startRound).not.toHaveBeenCalled();
  });

  it("saves a normalized setup request and navigates to the new round", async () => {
    await loadPage();
    await chooseCourse();
    fireEvent.change(document.querySelector<HTMLInputElement>("#roundDate")!, { target: { value: "2026-11-12" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Format" }), { target: { value: "STROKE_PLAY" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Handicap Percent" }), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
    await waitFor(() => expect(mocks.startRound).toHaveBeenCalledWith({
      tripId: 7, courseId: 3, defaultCourseTeeId: 21,
      roundDate: "2026-11-12", format: "STROKE_PLAY", handicapPercent: 80,
    }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/rounds/42/open"));
  });

  it("asks before canceling with unsaved changes", async () => {
    await loadPage();
    fireEvent.change(screen.getByRole("combobox", { name: "Format" }), { target: { value: "STROKE_PLAY" } });
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/trips/7"));
  });

  it("displays lookup failures without attempting to start a round", async () => {
    mocks.getCourses.mockRejectedValue(new Error("Course lookup unavailable"));
    render(<RoundSetupPage />);
    expect(await screen.findByText("Course lookup unavailable")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Course" })).toBeInTheDocument();
    expect(mocks.startRound).not.toHaveBeenCalled();
  });
});
