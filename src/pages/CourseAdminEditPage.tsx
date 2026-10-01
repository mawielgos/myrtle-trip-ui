import { useEffect, useState } from "react";
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
  formInputStyle,
  formSelectStyle,
  gridStyle,
  labelStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
  errorBoxStyle,
} from "../styles/uiStyles";
import type {
  CourseDetail,
  CourseTee,
  SaveCourseRequest,
} from "../types/courseAdmin";

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

export default function CourseAdminEditPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseIdParam = params.courseId;
  const isNew = courseIdParam === "new";
  const courseId = !isNew && courseIdParam ? Number(courseIdParam) : null;

  const [form, setForm] = useState<SaveCourseRequest>(emptyForm());
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [tees, setTees] = useState<CourseTee[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCourse() {
    if (!courseId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [course, teeList] = await Promise.all([
        getAdminCourse(courseId),
        getCourseTees(courseId),
      ]);

      setCourseDetail(course);
      setTees(teeList);
      setForm({
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
      });
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
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave() {
    if (!form.courseName.trim()) {
      alert("Course name is required.");
      return;
    }

    setSaving(true);
    setError("");

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

      navigate(`/admin/courses/${saved.courseId}`);
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
      alert(err?.response?.data?.message || "Failed to update tee active status.");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "16px" }}>
        <p>Loading course...</p>
      </div>
    );
  }

  return (
    <div style={pageContainerMediumStyle}>
      <h1>{isNew ? "Add Course" : "Edit Course"}</h1>

      <div style={{ marginBottom: "16px" }}>
        <button style={buttonStyle} onClick={() => navigate("/admin/courses")}>
          Back to Courses
        </button>
      </div>

      {error && <div style={errorBoxStyle}>{error}</div>}

      <div style={sectionStyle}>
        <div style={gridStyle}>
          <label style={labelStyle}>
            Legacy Course #
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
          </label>

          <label style={labelStyle}>
            Course Name
            <input
              style={formInputStyle}
              value={form.courseName}
              onChange={(e) => updateField("courseName", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Location
            <input
              style={formInputStyle}
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Address Line 1
            <input
              style={formInputStyle}
              value={form.addressLine1}
              onChange={(e) => updateField("addressLine1", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Address Line 2
            <input
              style={formInputStyle}
              value={form.addressLine2}
              onChange={(e) => updateField("addressLine2", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            City
            <input
              style={formInputStyle}
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            State
            <input
              style={formInputStyle}
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Postal Code
            <input
              style={formInputStyle}
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Phone
            <input
              style={formInputStyle}
              value={form.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Website
            <input
              style={formInputStyle}
              value={form.websiteUrl}
              onChange={(e) => updateField("websiteUrl", e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Active
            <select
              style={formSelectStyle}
              value={String(form.active ?? true)}
              onChange={(e) => updateField("active", e.target.value === "true")}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: "16px" }}>
          <button style={primaryButtonStyle} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Course"}
          </button>
        </div>
      </div>

      {!isNew && courseDetail && (
        <div style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>Tees</h2>
            <button
              style={buttonStyle}
              onClick={() => navigate(`/admin/courses/${courseDetail.courseId}/tees/new`)}
            >
              Add Tee
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Tee</th>
                <th style={thStyle}>Rating</th>
                <th style={thStyle}>Slope</th>
                <th style={thStyle}>Par</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tees.map((tee) => (
                <tr key={tee.teeId}>
                  <td style={tdStyle}>{tee.teeName}</td>
                  <td style={tdStyle}>{tee.courseRating}</td>
                  <td style={tdStyle}>{tee.slope}</td>
                  <td style={tdStyle}>{tee.parTotal}</td>
                  <td style={tdStyle}>{tee.active ? "Yes" : "No"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        style={buttonStyle}
                        onClick={() =>
                          navigate(`/admin/courses/${courseDetail.courseId}/tees/${tee.teeId}`)
                        }
                      >
                        Edit Tee
                      </button>
                      <button
                        style={tee.active ? dangerButtonStyle : buttonStyle}
                        onClick={() => handleToggleTeeActive(tee)}
                      >
                        {tee.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tees.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={6}>
                    No tees defined yet.
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