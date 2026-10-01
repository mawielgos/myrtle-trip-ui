import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createAdminCourse,
  getAdminCourse,
  getCourseTees,
  setCourseTeeActive,
  updateAdminCourse,
} from "../api/courseAdminApi";
import {
  buttonStyle,
  dangerButtonStyle,
  errorBoxStyle,
  formInputStyle,
  formSelectStyle,
  labelStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../styles/uiStyles";
import type {
  CourseDetail,
  CourseTee,
  SaveCourseRequest,
} from "../types/courseAdmin";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import { useAppDialog } from "../components/common/AppDialog";

function emptyForm(): SaveCourseRequest {
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

function formatValue(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return "—";
  }
  return value;
}

function formatCourseRating(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "—";
  }

  return String(value);
}

function sortTeesForScorecardDisplay(tees: CourseTee[]): CourseTee[] {
  return [...tees].sort((a, b) => {
    const bYardage = b.yardageTotal ?? -1;
    const aYardage = a.yardageTotal ?? -1;

    if (bYardage !== aYardage) {
      return bYardage - aYardage;
    }

    return a.teeName.localeCompare(b.teeName);
  });
}

function hasMenRatingData(tee: CourseTee): boolean {
  return tee.courseRating != null || tee.slope != null;
}

function hasWomenRatingData(tee: CourseTee): boolean {
  return tee.womenCourseRating != null || tee.womenSlope != null;
}

export default function CourseAdminEditPage() {
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

  const comparableForm = useMemo(() => {
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
  }, [form]);

  const initialComparableForm = useMemo(() => {
    return {
      ...initialForm,
      courseName: initialForm.courseName.trim(),
      location: initialForm.location.trim(),
      addressLine1: initialForm.addressLine1.trim(),
      addressLine2: initialForm.addressLine2.trim(),
      city: initialForm.city.trim(),
      state: initialForm.state.trim(),
      postalCode: initialForm.postalCode.trim(),
      phoneNumber: initialForm.phoneNumber.trim(),
      websiteUrl: initialForm.websiteUrl.trim(),
      legacyCourseNumber:
        initialForm.legacyCourseNumber === null || Number.isNaN(initialForm.legacyCourseNumber)
          ? null
          : Number(initialForm.legacyCourseNumber),
    };
  }, [initialForm]);

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
      const loadedForm: SaveCourseRequest = {
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

      const payload: SaveCourseRequest = {
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

  const activeTeeCount = useMemo(() => {
    let total = 0;
    for (const tee of tees) {
      if (tee.active) {
        total += 1;
      }
    }
    return total;
  }, [tees]);

  const sortedTees = useMemo(() => sortTeesForScorecardDisplay(tees), [tees]);

  if (loading) {
    return (
      <div style={{ padding: "16px" }}>
        <p>Loading course...</p>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title={isNew ? "Add Course" : "Edit Course"}
        subtitle={
          !isNew && courseDetail
            ? `${formatValue(courseDetail.location)} • ${tees.length} tee${tees.length === 1 ? "" : "s"}`
            : "Create the course first, then add tees."
        }
        actions={
          <>
            <button style={buttonStyle} onClick={() => void navigateIfConfirmed("/admin/courses")}>
              Course Master
            </button>
            {!isNew && courseDetail ? (
              <button
                style={buttonStyle}
                onClick={() => void navigateIfConfirmed(`/admin/courses/${courseDetail.courseId}/tees/new`)}
              >
                Add Tee
              </button>
            ) : null}
          </>
        }
      />

      {error && <div style={errorBoxStyle}>{error}</div>}
      {successMessage && (
        <div
          style={{
            border: "1px solid #b7e4c7",
            background: "#f0fff4",
            color: "#166534",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ ...sectionStyle, marginBottom: 0 }}>
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Course Info</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px 16px",
              }}
            >
              <div>
                <div style={labelStyle}>Course #</div>
                <input
                  style={formInputStyle}
                  type="number"
                  value={form.legacyCourseNumber ?? ""}
                  onChange={(e) =>
                    updateField(
                      "legacyCourseNumber",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                />
              </div>

              <div>
                <div style={labelStyle}>Course Name</div>
                <input
                  style={formInputStyle}
                  value={form.courseName}
                  onChange={(e) => updateField("courseName", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Location</div>
                <input
                  style={formInputStyle}
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Address Line 1</div>
                <input
                  style={formInputStyle}
                  value={form.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Address Line 2</div>
                <input
                  style={formInputStyle}
                  value={form.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>City</div>
                <input
                  style={formInputStyle}
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>State</div>
                <input
                  style={formInputStyle}
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Postal Code</div>
                <input
                  style={formInputStyle}
                  value={form.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Phone</div>
                <input
                  style={formInputStyle}
                  value={form.phoneNumber}
                  onChange={(e) => updateField("phoneNumber", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Website</div>
                <input
                  style={formInputStyle}
                  value={form.websiteUrl}
                  onChange={(e) => updateField("websiteUrl", e.target.value)}
                />
              </div>

              <div>
                <div style={labelStyle}>Active</div>
                <select
                  style={formSelectStyle}
                  value={String(form.active ?? true)}
                  onChange={(e) => updateField("active", e.target.value === "true")}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
              <button style={primaryButtonStyle} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Course"}
              </button>
              <button style={buttonStyle} onClick={() => void navigateIfConfirmed("/admin/courses")}>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ ...sectionStyle, marginBottom: "16px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Summary</h2>
            <div style={{ display: "grid", gap: "8px", fontSize: "14px", color: "#444" }}>
              <div>
                Status: <strong>{form.active ? "Active" : "Inactive"}</strong>
              </div>
              <div>
                Tees: <strong>{tees.length}</strong>
              </div>
              <div>
                Active Tees: <strong>{activeTeeCount}</strong>
              </div>
              <div>
                Location: <strong>{formatValue(form.location)}</strong>
              </div>
            </div>
          </div>

          {!isNew && courseDetail ? (
            <div style={{ ...sectionStyle, marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <h2 style={{ margin: 0 }}>Tees</h2>
                <button
                  style={buttonStyle}
                  onClick={() => void navigateIfConfirmed(`/admin/courses/${courseDetail.courseId}/tees/new`)}
                >
                  Add Tee
                </button>
              </div>

              {tees.length === 0 ? (
                <div style={{ color: "#555", fontSize: "14px" }}>No tees defined yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "6px" }}>
                  {sortedTees.map((tee) => {
                    const menDataAvailable = hasMenRatingData(tee);
                    const womenDataAvailable = hasWomenRatingData(tee);

                    return (
                      <div
                        key={tee.teeId}
                        style={{
                          border: "1px solid #e1e5ea",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          background: tee.active ? "#fafafa" : "#f4f4f5",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: "8px",
                            alignItems: "start",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                flexWrap: "wrap",
                                marginBottom: "2px",
                              }}
                            >
                              <span style={{ fontWeight: 800, fontSize: "15px", lineHeight: 1.15 }}>
                                {tee.teeName}
                              </span>
                              {tee.teeType === "COMBO" ? (
                                <span
                                  style={{
                                    border: "1px solid #bfdbfe",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    borderRadius: "999px",
                                    padding: "1px 6px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Combo
                                </span>
                              ) : null}
                              {!tee.active ? (
                                <span
                                  style={{
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    padding: "1px 6px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  Inactive
                                </span>
                              ) : null}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px 10px",
                                fontSize: "12px",
                                color: "#374151",
                                lineHeight: 1.25,
                              }}
                            >
                              {menDataAvailable ? (
                                <span>
                                  <strong>(M)</strong> CR {formatCourseRating(tee.courseRating)} / Slope {formatNumber(tee.slope)}
                                </span>
                              ) : null}
                              {womenDataAvailable ? (
                                <span>
                                  <strong>(W)</strong> CR {formatCourseRating(tee.womenCourseRating)} / Slope {formatNumber(tee.womenSlope)}
                                </span>
                              ) : null}
                              {!menDataAvailable && !womenDataAvailable ? <span>CR/Slope —</span> : null}
                              <span>
                                Par {formatNumber(tee.parTotal)}
                                {tee.womenParTotal != null && tee.womenParTotal !== tee.parTotal
                                  ? ` / W ${tee.womenParTotal}`
                                  : ""}
                              </span>
                              <span>Yards {formatNumber(tee.yardageTotal)}</span>
                              <span>Effective {tee.effectiveDate ?? "1900-01-01"}</span>
                              {tee.retiredDate ? <span>Retired {tee.retiredDate}</span> : null}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button
                              style={{ ...buttonStyle, padding: "5px 9px", fontSize: "12px" }}
                              onClick={() =>
                                navigateIfConfirmed(`/admin/courses/${courseDetail.courseId}/tees/${tee.teeId}`)
                              }
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                ...(tee.active ? dangerButtonStyle : buttonStyle),
                                padding: "5px 9px",
                                fontSize: "12px",
                              }}
                              onClick={() => handleToggleTeeActive(tee)}
                            >
                              {tee.active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
