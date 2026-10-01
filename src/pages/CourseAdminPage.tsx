import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminCourses, setAdminCourseActive } from "../api/courseAdminApi";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";
import {
  buttonStyle,
  dangerButtonStyle,
  errorBoxStyle,
  inputStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import type { CourseSummary } from "../types/courseAdmin";

function buildStatusBadgeStyle(active: boolean | null | undefined): CSSProperties {
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

function formatValue(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "—";
  }
  return String(value);
}

export default function CourseAdminPage() {
  const navigate = useNavigate();
  const { confirmDialog } = useAppDialog();

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [onlyActiveCourses, setOnlyActiveCourses] = useState(true);
  const [searchText, setSearchText] = useState("");

  async function loadCourses() {
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const data = await getAdminCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  async function handleToggleActive(course: CourseSummary) {
    const action = course.active ? "deactivate" : "activate";
    const confirmed = await confirmDialog({
      title: `${action === "deactivate" ? "Deactivate" : "Activate"} Course`,
      message: `${action === "deactivate" ? "Deactivate" : "Activate"} ${course.courseName}?`,
      severity: action === "deactivate" ? "warning" : "info",
      confirmText: action === "deactivate" ? "Deactivate" : "Activate",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setStatusMessage("");
      await setAdminCourseActive(course.courseId, !course.active);
      await loadCourses();
      setStatusMessage(`${course.courseName} was ${course.active ? "deactivated" : "activated"}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update course active status.");
    }
  }

  const activeCount = useMemo(() => {
    let total = 0;
    for (const course of courses) {
      if (course.active) {
        total += 1;
      }
    }
    return total;
  }, [courses]);

  const visibleCourses = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return courses.filter((course) => {
      if (onlyActiveCourses && !course.active) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const searchableText = [
        course.courseName,
        course.location,
        course.legacyCourseNumber == null ? "" : String(course.legacyCourseNumber),
        String(course.courseId),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [courses, onlyActiveCourses, searchText]);

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Course Master"
        subtitle={`${visibleCourses.length} showing • ${courses.length} total • ${activeCount} active`}
        actions={
          <>
            <button style={buttonStyle} onClick={() => void loadCourses()}>
              Refresh
            </button>
            <button style={primaryButtonStyle} onClick={() => navigate("/admin/courses/new")}>
              Add Course
            </button>
          </>
        }
      />

      <div style={{ ...sectionStyle, padding: "12px", marginBottom: "14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) auto",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            style={inputStyle}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search courses by name, location, course number, or ID"
          />

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#333",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={onlyActiveCourses}
              onChange={(event) => setOnlyActiveCourses(event.target.checked)}
            />
            Only Active Courses
          </label>
        </div>
      </div>

      {loading ? <div style={sectionStyle}>Loading courses...</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {!loading && !error && statusMessage ? <div style={successBoxStyle}>{statusMessage}</div> : null}

      {!loading && !error ? (
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
              {searchText.trim().length > 0
                ? "No courses match the current search."
                : onlyActiveCourses
                  ? "No active courses found."
                  : "No courses found."}
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
                    <button style={buttonStyle} onClick={() => navigate(`/admin/courses/${course.courseId}`)}>
                      Edit
                    </button>
                    <button style={buttonStyle} onClick={() => navigate(`/admin/courses/${course.courseId}/tees/new`)}>
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
      ) : null}
    </div>
  );
}
