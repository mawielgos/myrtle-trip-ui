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
    active: boolean | null;
  }
  
  export interface CourseHole {
    holeId: number;
    holeNumber: number;
    par: number;
    handicap: number;
    yardage: number | null;
  }
  
  export interface SaveCourseHoleRequest {
    holeNumber: number;
    par: number;
    handicap: number;
    yardage: number | null;
  }