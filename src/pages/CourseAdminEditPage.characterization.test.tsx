import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CourseAdminEditPage from "./CourseAdminEditPage";
import type { CourseDetail, CourseTee } from "../types/courseAdmin";

const mocks = vi.hoisted(() => ({
  courseId: "11" as string | undefined,
  navigate: vi.fn(),
  confirm: vi.fn(),
  alert: vi.fn(),
  getAdminCourse: vi.fn(),
  getCourseTees: vi.fn(),
  createAdminCourse: vi.fn(),
  updateAdminCourse: vi.fn(),
  setCourseTeeActive: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ courseId: mocks.courseId }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("../api/courseAdminApi", () => ({
  getAdminCourse: mocks.getAdminCourse,
  getCourseTees: mocks.getCourseTees,
  createAdminCourse: mocks.createAdminCourse,
  updateAdminCourse: mocks.updateAdminCourse,
  setCourseTeeActive: mocks.setCourseTeeActive,
}));
vi.mock("../components/common/AppDialog", () => ({
  useAppDialog: () => ({ alertDialog: mocks.alert, confirmDialog: mocks.confirm }),
}));
vi.mock("../hooks/useUnsavedChangesWarning", () => ({
  useUnsavedChangesWarning: (dirty: boolean) => async () => !dirty || mocks.confirm(),
}));
vi.mock("../components/common/PageHeader", () => ({
  default: ({ title, subtitle, actions }: { title: string; subtitle: string; actions: React.ReactNode }) =>
    <header><h1>{title}</h1><p>{subtitle}</p>{actions}</header>,
}));

const course = (overrides: Partial<CourseDetail> = {}): CourseDetail => ({
  courseId: 11, legacyCourseNumber: 8, courseName: "Oak Ridge", location: "North Hills",
  addressLine1: "123 Fairway", addressLine2: null, city: "Chicago", state: "IL",
  postalCode: "60601", phoneNumber: null, websiteUrl: null, active: true, ...overrides,
});
const tee = (overrides: Partial<CourseTee> = {}): CourseTee => ({
  teeId: 21, courseId: 11, teeName: "Blue", teeType: "REGULAR",
  effectiveDate: "2026-01-01", retiredDate: null, courseRating: 72.3,
  slope: 131, parTotal: 72, yardageTotal: 6500,
  womenCourseRating: null, womenSlope: null, womenParTotal: null, active: true,
  ...overrides,
});
const input = (label: string) => within(screen.getByText(label).parentElement!).getByRole("textbox") as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.courseId = "11";
  mocks.getAdminCourse.mockResolvedValue(course());
  mocks.getCourseTees.mockResolvedValue([tee()]);
  mocks.updateAdminCourse.mockResolvedValue(course());
  mocks.createAdminCourse.mockResolvedValue(course());
  mocks.setCourseTeeActive.mockResolvedValue(undefined);
  mocks.confirm.mockResolvedValue(true);
  mocks.alert.mockResolvedValue(undefined);
});
afterEach(() => cleanup());
async function loadExisting() {
  render(<CourseAdminEditPage />);
  await screen.findByRole("heading", { name: "Course Info" });
  await waitFor(() => expect(mocks.getAdminCourse).toHaveBeenCalledWith(11));
  await screen.findByDisplayValue("Oak Ridge");
}

describe("Course administration edit page characterization (before extraction)", () => {
  it("loads the selected course and its tees", async () => {
    await loadExisting();
    expect(mocks.getCourseTees).toHaveBeenCalledWith(11);
    expect(screen.getByRole("heading", { name: "Edit Course" })).toBeInTheDocument();
    expect(input("Course Name").value).toBe("Oak Ridge");
    expect(input("City").value).toBe("Chicago");
  });
  it("shows course summary and the number of active tees", async () => {
    mocks.getCourseTees.mockResolvedValue([tee(), tee({ teeId: 22, teeName: "Red", active: false })]);
    await loadExisting();
    const summary = screen.getByRole("heading", { name: "Summary" }).parentElement!;
    expect(within(summary).getByText(/Active Tees:/).textContent).toContain("1");
    expect(within(summary).getByText(/^Tees:/).textContent).toContain("2");
  });
  it("sorts tees by descending yardage rather than API order", async () => {
    mocks.getCourseTees.mockResolvedValue([tee({ teeId: 22, teeName: "Red", yardageTotal: 5100 }), tee({ teeId: 21, teeName: "Blue", yardageTotal: 6500 })]);
    await loadExisting();
    const blue = screen.getByText("Blue");
    const red = screen.getByText("Red");
    expect(blue.compareDocumentPosition(red) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("renders men's and women's tee ratings and inactive combo badges", async () => {
    mocks.getCourseTees.mockResolvedValue([tee({ teeType: "COMBO", active: false, womenCourseRating: 74.1, womenSlope: 132 })]);
    await loadExisting();
    expect(screen.getByText("Combo")).toBeInTheDocument();
    expect(screen.getByText("Inactive", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/CR 72\.3/)).toBeInTheDocument();
    expect(screen.getByText(/CR 74\.1/)).toBeInTheDocument();
  });
  it("saves edited course fields with whitespace trimmed", async () => {
    await loadExisting();
    fireEvent.change(input("Course Name"), { target: { value: "  New Name  " } });
    fireEvent.change(input("Location"), { target: { value: "  East  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Course" }));
    await waitFor(() => expect(mocks.updateAdminCourse).toHaveBeenCalledWith(11, expect.objectContaining({ courseName: "New Name", location: "East" })));
    expect(await screen.findByText("Course changes saved successfully.")).toBeInTheDocument();
  });
  it("rejects saving a blank course name", async () => {
    await loadExisting();
    fireEvent.change(input("Course Name"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Course" }));
    await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith(expect.objectContaining({ title: "Course Name Required" })));
    expect(mocks.updateAdminCourse).not.toHaveBeenCalled();
  });
  it("creates a new course and navigates to its edit page", async () => {
    mocks.courseId = "new";
    render(<CourseAdminEditPage />);
    expect(screen.getByRole("heading", { name: "Add Course" })).toBeInTheDocument();
    expect(mocks.getAdminCourse).not.toHaveBeenCalled();
    fireEvent.change(input("Course Name"), { target: { value: "  New Course  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Course" }));
    await waitFor(() => expect(mocks.createAdminCourse).toHaveBeenCalledWith(expect.objectContaining({ courseName: "New Course" })));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/admin/courses/11"));
  });
  it("toggles tee active status and reloads course data", async () => {
    await loadExisting();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(mocks.setCourseTeeActive).toHaveBeenCalledWith(21, false));
    await waitFor(() => expect(mocks.getCourseTees).toHaveBeenCalledTimes(2));
  });
  it("shows a load error when the course API fails", async () => {
    mocks.getAdminCourse.mockRejectedValue({ response: { data: { message: "Course unavailable" } } });
    render(<CourseAdminEditPage />);
    expect(await screen.findByText("Course unavailable")).toBeInTheDocument();
  });
});
