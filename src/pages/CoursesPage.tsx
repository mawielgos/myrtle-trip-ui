import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminCourses } from "../api/courseAdminApi";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerMediumStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";
import type { CourseSummary } from "../types/courseAdmin";
import PageHeader from "../components/common/PageHeader";

export default function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadCourses();
  }, []);

  async function loadCourses(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminCourses();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load courses", err);
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateCourse(): void {
    navigate("/admin/courses/new");
  }

  function handleOpenCourse(courseId: number): void {
    navigate(`/admin/courses/${courseId}`);
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Course Master"
        subtitle={`${courses.length} course${courses.length === 1 ? "" : "s"}`}
        actions={
          <>
            <button style={buttonStyle} onClick={() => navigate("/trips")}>
              Events
            </button>
            <button style={buttonStyle} onClick={handleCreateCourse}>
              Create Course
            </button>
          </>
        }
      />

      {loading && <div>Loading courses...</div>}

      {!loading && error && <div style={errorBoxStyle}>{error}</div>}

      {!loading && !error && courses.length === 0 && (
        <div style={sectionStyle}>No courses found.</div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div style={sectionStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Course #</th>
                <th style={thStyle}>Course</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Tees</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.courseId}>
                  <td style={tdStyle}>{course.legacyCourseNumber ?? ""}</td>
                  <td style={tdStyle}>{course.courseName}</td>
                  <td style={tdStyle}>{course.location ?? ""}</td>
                  <td style={tdStyle}>{course.teeCount}</td>
                  <td style={tdStyle}>{course.active ? "Yes" : "No"}</td>
                  <td style={tdStyle}>
                    <button
                      style={buttonStyle}
                      onClick={() => handleOpenCourse(course.courseId)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}