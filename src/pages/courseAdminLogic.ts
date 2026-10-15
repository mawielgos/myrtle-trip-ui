import type { CSSProperties } from "react";
import type { CourseSummary } from "../types/courseAdmin";

export function buildStatusBadgeStyle(active: boolean | null | undefined): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: active ? "#edf8f0" : "#f7f7f7",
    color: active ? "#1f6b2a" : "#666",
    border: active ? "1px solid #b7d7c0" : "1px solid #d5d9de",
  };
}

export function formatValue(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "—";
  }
  return String(value);
}

export function countActiveCourses(courses: readonly CourseSummary[]): number {
  let total = 0;
  for (const course of courses) {
    if (course.active) total += 1;
  }
  return total;
}

export function filterAdminCourses(
  courses: readonly CourseSummary[],
  onlyActiveCourses: boolean,
  searchText: string,
): CourseSummary[] {
  const normalizedSearch = searchText.trim().toLowerCase();
  return courses.filter((course) => {
    if (onlyActiveCourses && !course.active) return false;
    if (normalizedSearch.length === 0) return true;
    const searchableText = [
      course.courseName,
      course.location,
      course.legacyCourseNumber == null ? "" : String(course.legacyCourseNumber),
      String(course.courseId),
    ].join(" ").toLowerCase();
    return searchableText.includes(normalizedSearch);
  });
}

export function emptyCourseListMessage(searchText: string, onlyActiveCourses: boolean): string {
  if (searchText.trim().length > 0) return "No courses match the current search.";
  return onlyActiveCourses ? "No active courses found." : "No courses found.";
}
