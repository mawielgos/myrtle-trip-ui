import axios from "axios";
import type {
  CourseDetail,
  CourseHole,
  CourseSummary,
  CourseTee,
  SaveCourseHoleRequest,
  SaveCourseRequest,
  SaveCourseTeeRequest,
} from "../types/courseAdmin";

const api = axios.create({
  baseURL: "/api",
});

export async function getAdminCourses(): Promise<CourseSummary[]> {
  const response = await api.get<CourseSummary[]>("/admin/courses");
  return response.data;
}

export async function getAdminCourse(courseId: number): Promise<CourseDetail> {
  const response = await api.get<CourseDetail>(`/admin/courses/${courseId}`);
  return response.data;
}

export async function createAdminCourse(payload: SaveCourseRequest): Promise<CourseDetail> {
  const response = await api.post<CourseDetail>("/admin/courses", payload);
  return response.data;
}

export async function updateAdminCourse(
  courseId: number,
  payload: SaveCourseRequest
): Promise<CourseDetail> {
  const response = await api.put<CourseDetail>(`/admin/courses/${courseId}`, payload);
  return response.data;
}

export async function setAdminCourseActive(
  courseId: number,
  active: boolean
): Promise<CourseDetail> {
  const response = await api.put<CourseDetail>(
    `/admin/courses/${courseId}/active?active=${active}`
  );
  return response.data;
}

export async function getCourseTees(courseId: number): Promise<CourseTee[]> {
  const response = await api.get<CourseTee[]>(`/admin/courses/${courseId}/tees`);
  return response.data;
}

export async function getCourseTee(teeId: number): Promise<CourseTee> {
  const response = await api.get<CourseTee>(`/admin/courses/tees/${teeId}`);
  return response.data;
}

export async function createCourseTee(
  courseId: number,
  payload: SaveCourseTeeRequest
): Promise<CourseTee> {
  const response = await api.post<CourseTee>(`/admin/courses/${courseId}/tees`, payload);
  return response.data;
}

export async function updateCourseTee(
  teeId: number,
  payload: SaveCourseTeeRequest
): Promise<CourseTee> {
  const response = await api.put<CourseTee>(`/admin/courses/tees/${teeId}`, payload);
  return response.data;
}

export async function setCourseTeeActive(
  teeId: number,
  active: boolean
): Promise<CourseTee> {
  const response = await api.put<CourseTee>(
    `/admin/courses/tees/${teeId}/active?active=${active}`
  );
  return response.data;
}

export async function getCourseTeeHoles(teeId: number): Promise<CourseHole[]> {
  const response = await api.get<CourseHole[]>(`/admin/courses/tees/${teeId}/holes`);
  return response.data;
}

export async function saveCourseTeeHoles(
  teeId: number,
  payload: SaveCourseHoleRequest[]
): Promise<CourseHole[]> {
  const response = await api.put<CourseHole[]>(
    `/admin/courses/tees/${teeId}/holes`,
    payload
  );
  return response.data;
}