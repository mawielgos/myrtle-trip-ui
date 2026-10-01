import api from "./api";
import type {
  CourseListItem,
  CourseTeeListItem,
} from "../types/course";

/**
 * Round/trip setup course lookup endpoints.
 *
 * Course Master admin CRUD lives in courseAdminApi.ts so there is only one
 * admin API path and one source of truth for admin endpoint names.
 */
export async function getCourses(): Promise<CourseListItem[]> {
  const response = await api.get<CourseListItem[]>("/courses");
  return response.data;
}

function ratingForSort(tee: CourseTeeListItem): number {
  return tee.courseRating ?? tee.womenCourseRating ?? -999;
}

export async function getCourseTees(
  courseId: number
): Promise<CourseTeeListItem[]> {
  const response = await api.get<CourseTeeListItem[]>(`/courses/${courseId}/tees`);
  return [...response.data].sort((a, b) => {
    const ratingDiff = ratingForSort(b) - ratingForSort(a);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.teeName.localeCompare(b.teeName);
  });
}
