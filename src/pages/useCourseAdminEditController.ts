import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createAdminCourse, getAdminCourse, getCourseTees,
  setCourseTeeActive, updateAdminCourse,
} from "../api/courseAdminApi";
import type { CourseDetail, CourseTee, SaveCourseRequest } from "../types/courseAdmin";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { useAppDialog } from "../components/common/AppDialog";
import {
  emptyForm, sortTeesForScorecardDisplay, normalizeCourseForm,
  courseFormFromDetail, countActiveTees,
} from "./courseAdminEditLogic";

export function useCourseAdminEditController() {

  const navigate = useNavigate();
  const { alertDialog } = useAppDialog();
  const params = useParams();
  const courseIdParam = params.courseId;
  const isNew = !courseIdParam || courseIdParam === "new";
  const courseId = !isNew && courseIdParam ? Number(courseIdParam) : null;

  const [form, setForm] = useState<SaveCourseRequest>(emptyForm());
  const [initialForm, setInitialForm] = useState<SaveCourseRequest>(emptyForm());
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [tees, setTees] = useState<CourseTee[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const comparableForm = useMemo(() => normalizeCourseForm(form), [form]);
  const initialComparableForm = useMemo(() => normalizeCourseForm(initialForm), [initialForm]);

  const hasChanges =
    !loading &&
    JSON.stringify(comparableForm) !== JSON.stringify(initialComparableForm);

  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }

  async function loadCourse() {
    if (!courseId) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const [course, teeList] = await Promise.all([
        getAdminCourse(courseId),
        getCourseTees(courseId),
      ]);

      setCourseDetail(course);
      setTees(teeList);
      const loadedForm = courseFormFromDetail(course);
      setForm(loadedForm);
      setInitialForm(loadedForm);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load course.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isNew) {
      void loadCourse();
    }
  }, [isNew, courseId]);

  function updateField<K extends keyof SaveCourseRequest>(
    field: K,
    value: SaveCourseRequest[K]
  ) {
    setSuccessMessage("");
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!form.courseName.trim()) {
      await alertDialog({
        title: "Course Name Required",
        message: "Course name is required.",
        severity: "warning",
      });
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      let saved: CourseDetail;

      const payload = normalizeCourseForm(form);

      if (isNew) {
        saved = await createAdminCourse(payload);
      } else {
        saved = await updateAdminCourse(courseId as number, payload);
      }

      setInitialForm(payload);
      setCourseDetail(saved);
      setSuccessMessage("Course changes saved successfully.");

      if (isNew) {
        navigate(`/admin/courses/${saved.courseId}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTeeActive(tee: CourseTee) {
    try {
      await setCourseTeeActive(tee.teeId, !tee.active);
      await loadCourse();
    } catch (err: any) {
      await alertDialog({
        title: "Unable to Update Tee",
        message: err?.response?.data?.message || "Failed to update tee active status.",
        severity: "danger",
      });
    }
  }

  const activeTeeCount = useMemo(() => countActiveTees(tees), [tees]);

  const sortedTees = useMemo(() => sortTeesForScorecardDisplay(tees), [tees]);

  return {
    isNew, courseDetail, tees, form, loading, saving, error, successMessage,
    activeTeeCount, sortedTees, navigateIfConfirmed, updateField,
    handleSave, handleToggleTeeActive,
  };
}
