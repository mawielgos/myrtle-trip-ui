import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminCourses, setAdminCourseActive } from "../api/courseAdminApi";
import {
  buttonStyle,
  dangerButtonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import type { CourseSummary } from "../types/courseAdmin";

export default function CourseAdminPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  async function loadCourses() {
    setLoading(true);
    setError("");
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
    try {
      await setAdminCourseActive(course.courseId, !course.active);
      await loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update course active status.");
    }
  }

  return (
    <div style={pageContainerMediumStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>Course Master</h1>
        <button style={buttonStyle} onClick={() => navigate("/admin/courses/new")}>
          Add Course
        </button>
      </div>

      {loading && <p>Loading courses...</p>}
      {error && <div style={errorBoxStyle}>{error}</div>}

      {!loading && !error && (
        <div style={sectionStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Legacy #</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Tees</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.courseId}>
                  <td style={tdStyle}>{course.courseName}</td>
                  <td style={tdStyle}>{course.legacyCourseNumber ?? ""}</td>
                  <td style={tdStyle}>{course.location ?? ""}</td>
                  <td style={tdStyle}>{course.teeCount}</td>
                  <td style={tdStyle}>{course.active ? "Yes" : "No"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        style={buttonStyle}
                        onClick={() => navigate(`/admin/courses/${course.courseId}`)}
                      >
                        Edit
                      </button>
                      <button
                        style={course.active ? dangerButtonStyle : buttonStyle}
                        onClick={() => handleToggleActive(course)}
                      >
                        {course.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={6}>
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}