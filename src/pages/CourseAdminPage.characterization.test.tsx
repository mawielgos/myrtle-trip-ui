import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CourseAdminPage from "./CourseAdminPage";
import type { CourseSummary } from "../types/courseAdmin";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  confirmDialog: vi.fn(),
  getAdminCourses: vi.fn(),
  setAdminCourseActive: vi.fn(),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("../api/courseAdminApi", () => ({
  getAdminCourses: mocks.getAdminCourses,
  setAdminCourseActive: mocks.setAdminCourseActive,
}));
vi.mock("../components/common/AppDialog", () => ({
  useAppDialog: () => ({ confirmDialog: mocks.confirmDialog }),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle: string; actions: React.ReactNode }) => (
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>
  ),
}));

const course = (overrides: Partial<CourseSummary> = {}): CourseSummary => ({
  courseId: 11,
  legacyCourseNumber: 8,
  courseName: "Oak Ridge",
  location: "North Hills",
  teeCount: 3,
  active: true,
  ...overrides,
});
const courses = () => [
  course(),
  course({ courseId: 22, legacyCourseNumber: 14, courseName: "Willow Creek", location: "South Valley", teeCount: 2, active: false }),
];
const search = () => screen.getByPlaceholderText("Search courses by name, location, course number, or ID") as HTMLInputElement;
const onlyActive = () => screen.getByRole("checkbox", { name: "Only Active Courses" }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAdminCourses.mockResolvedValue(courses());
  mocks.confirmDialog.mockResolvedValue(true);
  mocks.setAdminCourseActive.mockResolvedValue(undefined);
});
afterEach(() => cleanup());
async function loaded() {
  render(<CourseAdminPage />);
  await screen.findByText("Oak Ridge");
  await waitFor(() => expect(mocks.getAdminCourses).toHaveBeenCalledTimes(1));
}

describe("Course master list characterization (before extraction)", () => {
  it("loads courses, shows active courses initially, and summarizes all and active totals", async () => {
    await loaded();
    expect(screen.getByRole("heading", { name: "Course Master" })).toBeInTheDocument();
    expect(screen.getByText("1 showing • 2 total • 1 active")).toBeInTheDocument();
    expect(onlyActive()).toBeChecked();
    expect(screen.queryByText("Willow Creek")).not.toBeInTheDocument();
    expect(screen.getByText("Tees:").parentElement?.textContent).toContain("3");
  });
  it("includes inactive courses when Only Active Courses is unchecked", async () => {
    await loaded();
    fireEvent.click(onlyActive());
    expect(screen.getByText("Willow Creek")).toBeInTheDocument();
    expect(screen.getByText("2 showing • 2 total • 1 active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
  it("filters by name and location without regard to letter case or surrounding whitespace", async () => {
    await loaded();
    fireEvent.click(onlyActive());
    fireEvent.change(search(), { target: { value: "  sOuTh vAlLeY  " } });
    expect(screen.getByText("Willow Creek")).toBeInTheDocument();
    expect(screen.queryByText("Oak Ridge")).not.toBeInTheDocument();
    expect(screen.getByText("1 showing • 2 total • 1 active")).toBeInTheDocument();
  });
  it("searches course number and internal course ID", async () => {
    await loaded();
    fireEvent.click(onlyActive());
    fireEvent.change(search(), { target: { value: "14" } });
    expect(screen.getByText("Willow Creek")).toBeInTheDocument();
    expect(screen.queryByText("Oak Ridge")).not.toBeInTheDocument();
    fireEvent.change(search(), { target: { value: "11" } });
    expect(screen.getByText("Oak Ridge")).toBeInTheDocument();
    expect(screen.queryByText("Willow Creek")).not.toBeInTheDocument();
  });
  it("shows distinct empty-state guidance for active filtering, searches, and an empty course list", async () => {
    mocks.getAdminCourses.mockResolvedValueOnce([course({ active: false })]);
    render(<CourseAdminPage />);
    expect(await screen.findByText("No active courses found.")).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: "missing" } });
    expect(screen.getByText("No courses match the current search.")).toBeInTheDocument();
    fireEvent.click(onlyActive());
    fireEvent.change(search(), { target: { value: "" } });
    expect(screen.getByText("Oak Ridge")).toBeInTheDocument();
  });
  it("refreshes the course list using the API", async () => {
    await loaded();
    mocks.getAdminCourses.mockResolvedValueOnce([course({ courseName: "Updated Course" })]);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Updated Course")).toBeInTheDocument();
    expect(mocks.getAdminCourses).toHaveBeenCalledTimes(2);
  });
  it("navigates to creating a course, editing a course, and adding a tee", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/admin/courses/new");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/admin/courses/11");
    fireEvent.click(screen.getByRole("button", { name: "Add Tee" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/admin/courses/11/tees/new");
  });
  it("asks before deactivating a course and leaves it unchanged if confirmation is declined", async () => {
    mocks.confirmDialog.mockResolvedValueOnce(false);
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ title: "Deactivate Course", confirmText: "Deactivate", severity: "warning" })));
    expect(mocks.setAdminCourseActive).not.toHaveBeenCalled();
  });
  it("deactivates a confirmed course, reloads the list, and surfaces server failures", async () => {
    await loaded();
    mocks.getAdminCourses.mockResolvedValueOnce([course({ active: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.setAdminCourseActive).toHaveBeenCalledWith(11, false));
    await waitFor(() => expect(mocks.getAdminCourses).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Oak Ridge was deactivated.")).toBeInTheDocument();
    mocks.getAdminCourses.mockRejectedValueOnce({ response: { data: { message: "Service unavailable" } } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Service unavailable")).toBeInTheDocument();
  });
});
