import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CoursesPage from "./CoursesPage";
import type { CourseSummary } from "../types/courseAdmin";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getAdminCourses: vi.fn(),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("../api/courseAdminApi", () => ({ getAdminCourses: mocks.getAdminCourses }));

const course = (overrides: Partial<CourseSummary> = {}): CourseSummary => ({
  courseId: 11,
  legacyCourseNumber: 8,
  courseName: "Oak Ridge",
  location: "North Hills",
  teeCount: 3,
  active: true,
  ...overrides,
});
const sampleCourses = () => [
  course(),
  course({ courseId: 22, legacyCourseNumber: 14, courseName: "Willow Creek", location: "South Valley", teeCount: 2, active: false }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminCourses.mockResolvedValue(sampleCourses());
});
afterEach(() => cleanup());

async function loadPage() {
  render(<CoursesPage />);
  expect(await screen.findByText("Oak Ridge")).toBeInTheDocument();
  await waitFor(() => expect(mocks.getAdminCourses).toHaveBeenCalledTimes(1));
}

describe("Courses page characterization (before changes)", () => {
  it("loads the course catalog and displays the master page header", async () => {
    await loadPage();
    expect(screen.getByRole("heading", { name: "Course Master" })).toBeInTheDocument();
    expect(screen.getByText("2 courses")).toBeInTheDocument();
  });

  it("displays a loading indicator until the catalog request resolves", async () => {
    let resolveRequest!: (courses: CourseSummary[]) => void;
    mocks.getAdminCourses.mockImplementationOnce(() => new Promise<CourseSummary[]>((resolve) => { resolveRequest = resolve; }));
    render(<CoursesPage />);
    expect(screen.getByText("Loading courses...")).toBeInTheDocument();
    expect(screen.queryByText("Oak Ridge")).not.toBeInTheDocument();
    resolveRequest(sampleCourses());
    expect(await screen.findByText("Oak Ridge")).toBeInTheDocument();
    expect(screen.queryByText("Loading courses...")).not.toBeInTheDocument();
  });

  it("renders both active and inactive courses with their statuses", async () => {
    await loadPage();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("Yes")).toBeInTheDocument();
    expect(within(rows[2]).getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Willow Creek")).toBeInTheDocument();
  });

  it("shows course number, location, and tee count in their columns", async () => {
    await loadPage();
    const headings = screen.getAllByRole("columnheader").map((el) => el.textContent);
    expect(headings).toEqual(["Course #", "Course", "Location", "Tees", "Active", "Actions"]);
    const firstRow = screen.getAllByRole("row")[1];
    expect(within(firstRow).getAllByRole("cell").map((el) => el.textContent)).toEqual(["8", "Oak Ridge", "North Hills", "3", "Yes", "Open"]);
  });

  it("renders missing course number and location as empty cells", async () => {
    mocks.getAdminCourses.mockResolvedValueOnce([course({ legacyCourseNumber: null, location: null })]);
    await loadPage();
    expect(screen.getByText("1 course")).toBeInTheDocument();
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[0]).toBeEmptyDOMElement();
    expect(cells[2]).toBeEmptyDOMElement();
  });

  it("shows an empty-state message when the server returns no courses", async () => {
    mocks.getAdminCourses.mockResolvedValueOnce([]);
    render(<CoursesPage />);
    expect(await screen.findByText("No courses found.")).toBeInTheDocument();
    expect(screen.getByText("0 courses")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("navigates to the events list and the create-course form", async () => {
    await loadPage();
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/trips");
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/admin/courses/new");
  });

  it("opens the matching detail page when a course row's Open button is selected", async () => {
    await loadPage();
    const rows = screen.getAllByRole("row");
    fireEvent.click(within(rows[1]).getByRole("button", { name: "Open" }));
    expect(mocks.navigate).toHaveBeenLastCalledWith("/admin/courses/11");
    fireEvent.click(within(rows[2]).getByRole("button", { name: "Open" }));
    expect(mocks.navigate).toHaveBeenLastCalledWith("/admin/courses/22");
  });

  it("displays a load error without showing a catalog or empty-state message", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.getAdminCourses.mockRejectedValueOnce(new Error("API unavailable"));
      render(<CoursesPage />);
      expect(await screen.findByText("Failed to load courses.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.queryByText("No courses found.")).not.toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
