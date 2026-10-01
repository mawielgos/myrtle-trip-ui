export interface CourseListItem {
  courseId: number;
  courseName: string;
  location?: string | null;
}

export interface CourseTeeListItem {
  courseTeeId: number;
  courseId: number;
  teeName: string;
  alternateTeeName?: string | null;
  courseRating?: number | null;
  slope?: number | null;
  alternateCourseRating?: number | null;
  alternateSlope?: number | null;
  parTotal?: number | null;
}

export interface CourseSummary {
  courseId: number;
  legacyCourseNumber: number | null;
  courseName: string;
  location: string | null;
  teeCount: number;
  active: boolean;
}

export interface CourseDetail {
  courseId: number;
  legacyCourseNumber: number | null;
  courseName: string;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phoneNumber: string | null;
  websiteUrl: string | null;
  active: boolean;
}

export interface SaveCourseRequest {
  legacyCourseNumber: number | null;
  courseName: string;
  location: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  websiteUrl: string;
  active: boolean;
}

export interface CourseTee {
  teeId: number;
  courseId: number;
  teeName: string;
  courseRating: number;
  slope: number;
  parTotal: number;
  active: boolean;
}

export interface SaveCourseTeeRequest {
  teeName: string;
  courseRating: number;
  slope: number;
  parTotal: number;
  active: boolean;
}