import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminCourses, setAdminCourseActive } from "../api/courseAdminApi";
import { useAppDialog } from "../components/common/AppDialog";
import type { CourseSummary } from "../types/courseAdmin";
import { countActiveCourses, filterAdminCourses } from "./courseAdminLogic";

export function useCourseAdminController() {
  const navigate = useNavigate();
  const { confirmDialog } = useAppDialog();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
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

    if (!confirmed) return;

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

  const activeCount = useMemo(() => countActiveCourses(courses), [courses]);
  const visibleCourses = useMemo(
    () => filterAdminCourses(courses, onlyActiveCourses, searchText),
    [courses, onlyActiveCourses, searchText],
  );

  return {
    courses,
    loading,
    error,
    statusMessage,
    onlyActiveCourses,
    setOnlyActiveCourses,
    searchText,
    setSearchText,
    activeCount,
    visibleCourses,
    loadCourses,
    handleToggleActive,
    navigateToAddCourse: () => navigate("/admin/courses/new"),
    navigateToEditCourse: (courseId: number) => navigate(`/admin/courses/${courseId}`),
    navigateToAddTee: (courseId: number) => navigate(`/admin/courses/${courseId}/tees/new`),
  };
}
