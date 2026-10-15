import type { CourseDetail, CourseTee, SaveCourseRequest } from "../types/courseAdmin";

export function emptyForm(): SaveCourseRequest {
  return {
    legacyCourseNumber: null,
    courseName: "",
    location: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    phoneNumber: "",
    websiteUrl: "",
    active: true,
  };
}

export function formatValue(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return "—";
  }
  return value;
}

export function formatCourseRating(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return String(value);
}

export function sortTeesForScorecardDisplay(tees: CourseTee[]): CourseTee[] {
  return [...tees].sort((a, b) => {
    const bYardage = b.yardageTotal ?? -1;
    const aYardage = a.yardageTotal ?? -1;

    if (bYardage !== aYardage) {
      return bYardage - aYardage;
    }

    return a.teeName.localeCompare(b.teeName);
  });
}

export function hasMenRatingData(tee: CourseTee): boolean {
  return tee.courseRating != null || tee.slope != null;
}

export function hasWomenRatingData(tee: CourseTee): boolean {
  return tee.womenCourseRating != null || tee.womenSlope != null;
}

export function normalizeCourseForm(form: SaveCourseRequest): SaveCourseRequest {
  return {
    ...form,
    courseName: form.courseName.trim(),
    location: form.location.trim(),
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    phoneNumber: form.phoneNumber.trim(),
    websiteUrl: form.websiteUrl.trim(),
    legacyCourseNumber:
      form.legacyCourseNumber === null || Number.isNaN(form.legacyCourseNumber)
        ? null
        : Number(form.legacyCourseNumber),
  };
}

export function courseFormFromDetail(course: CourseDetail): SaveCourseRequest {
  return {
    legacyCourseNumber: course.legacyCourseNumber,
    courseName: course.courseName ?? "",
    location: course.location ?? "",
    addressLine1: course.addressLine1 ?? "",
    addressLine2: course.addressLine2 ?? "",
    city: course.city ?? "",
    state: course.state ?? "",
    postalCode: course.postalCode ?? "",
    phoneNumber: course.phoneNumber ?? "",
    websiteUrl: course.websiteUrl ?? "",
    active: course.active ?? true,
  };
}

export function countActiveTees(tees: CourseTee[]): number {
  return tees.filter((tee) => tee.active).length;
}
