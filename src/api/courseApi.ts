import api from "./api";
import type {
  CourseDetail,
  CourseListItem,
  CourseSummary,
  CourseTee,
  CourseTeeListItem,
  SaveCourseRequest,
  SaveCourseTeeRequest,
} from "../types/course";

/**
 * Existing round-setup consumer shape.
 * Leave these on the old endpoints.
 */
export async function getCourses(): Promise<CourseListItem[]> {
  const response = await api.get<CourseListItem[]>("/courses");
  return response.data;
}

export async function getCourseTees(
  courseId: number
): Promise<CourseTeeListItem[]> {
  const response = await api.get<CourseTeeListItem[]>(`/courses/${courseId}/tees`);
  return response.data;
}

/**
 * New Course Master admin endpoints.
 */
export async function getCourseSummaries(): Promise<CourseSummary[]> {
  const response = await api.get<CourseSummary[]>("/admin/courses");
  return response.data;
}

export async function getCourse(courseId: number): Promise<CourseDetail> {
  const response = await api.get<CourseDetail>(`/admin/courses/${courseId}`);
  return response.data;
}

export async function createCourse(payload: SaveCourseRequest): Promise<void> {
  await api.post("/admin/courses", payload);
}

export async function updateCourse(
  courseId: number,
  payload: SaveCourseRequest
): Promise<void> {
  await api.put(`/admin/courses/${courseId}`, payload);
}

export async function getAdminCourseTees(courseId: number): Promise<CourseTee[]> {
  const response = await api.get<CourseTee[]>(`/admin/courses/${courseId}/tees`);
  return response.data;
}

export async function createCourseTee(
  courseId: number,
  payload: SaveCourseTeeRequest
): Promise<void> {
  await api.post(`/admin/courses/${courseId}/tees`, payload);
}

export async function updateCourseTee(
  teeId: number,
  payload: SaveCourseTeeRequest
): Promise<void> {
  await api.put(`/admin/course-tees/${teeId}`, payload);
}