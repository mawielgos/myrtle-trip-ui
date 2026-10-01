export interface CourseSummary {
  courseId: number;
  legacyCourseNumber: number | null;
  courseName: string;
  location: string | null;
  teeCount: number;
  active: boolean | null;
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
  active: boolean | null;
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
  active: boolean | null;
}

export type TeeType = "REGULAR" | "COMBO";

export interface CourseTee {
  teeId: number;
  courseId: number;
  teeName: string;
  teeType: TeeType | string | null;
  effectiveDate: string | null;
  retiredDate: string | null;
  courseRating: number | null;
  slope: number | null;
  parTotal: number;
  yardageTotal: number | null;
  womenCourseRating: number | null;
  womenSlope: number | null;
  womenParTotal: number | null;
  active: boolean;
}

export interface SaveCourseTeeRequest {
  teeName: string;
  teeType: TeeType;
  effectiveDate: string | null;
  retiredDate: string | null;
  courseRating: number | null;
  slope: number | null;
  parTotal: number;
  yardageTotal: number | null;
  womenCourseRating: number | null;
  womenSlope: number | null;
  womenParTotal: number | null;
  active: boolean | null;
}

export interface CourseHole {
  holeId: number;
  holeNumber: number;
  par: number | null;
  handicap: number | null;
  yardage: number | null;
  womenPar: number | null;
  womenHandicap: number | null;
}

export interface SaveCourseHoleRequest {
  holeNumber: number;
  par: number | null;
  handicap: number | null;
  yardage: number | null;
  womenPar: number | null;
  womenHandicap: number | null;
}


export interface CourseTeeComboHole {
  comboHoleId: number;
  holeNumber: number;
  sourceTeeId: number;
  sourceTeeName: string | null;
}

export interface SaveCourseTeeComboHoleRequest {
  holeNumber: number;
  sourceTeeId: number;
}
