import type { CourseSummary } from "../types/courseAdmin";
import { buttonStyle, dangerButtonStyle, sectionStyle } from "../styles/uiStyles";
import { buildStatusBadgeStyle, formatValue, emptyCourseListMessage } from "./courseAdminLogic";

type CourseAdminListProps = {
  visibleCourses: CourseSummary[];
  searchText: string;
  onlyActiveCourses: boolean;
  handleToggleActive: (course: CourseSummary) => void | Promise<void>;
  navigateToEditCourse: (courseId: number) => void;
  navigateToAddTee: (courseId: number) => void;
};

export default function CourseAdminList({
  visibleCourses, searchText, onlyActiveCourses, handleToggleActive,
  navigateToEditCourse, navigateToAddTee,
}: CourseAdminListProps) {
  return (
<div
          style={{
            display: "grid",
            gap: "12px",
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {visibleCourses.length === 0 ? (
            <div style={sectionStyle}>
              {emptyCourseListMessage(searchText, onlyActiveCourses)}
            </div>
          ) : (
            visibleCourses.map((course) => (
              <div
                key={course.courseId}
                style={{
                  ...sectionStyle,
                  marginBottom: 0,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 420px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "4px",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "15px" }}>{course.courseName}</div>
                      <span style={buildStatusBadgeStyle(course.active)}>
                        {course.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {formatValue(course.location)}
                      {course.legacyCourseNumber != null ? <> • Course #{course.legacyCourseNumber}</> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button style={buttonStyle} onClick={() => navigateToEditCourse(course.courseId)}>
                      Edit
                    </button>
                    <button style={buttonStyle} onClick={() => navigateToAddTee(course.courseId)}>
                      Add Tee
                    </button>
                    <button style={course.active ? dangerButtonStyle : buttonStyle} onClick={() => void handleToggleActive(course)}>
                      {course.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "8px 14px",
                    fontSize: "13px",
                    color: "#444",
                  }}
                >
                  <div>
                    Tees: <strong>{course.teeCount}</strong>
                  </div>
                  <div>
                    Course ID: <strong>{course.courseId}</strong>
                  </div>
                  <div>
                    Location: <strong>{formatValue(course.location)}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
  );
}
