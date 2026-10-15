import { buttonStyle, formInputStyle, formSelectStyle, labelStyle, primaryButtonStyle, sectionStyle } from "../styles/uiStyles";
import type { useCourseAdminEditController } from "./useCourseAdminEditController";

type Controller = ReturnType<typeof useCourseAdminEditController>;
type Props = Pick<Controller, "form" | "saving" | "updateField" | "handleSave" | "navigateIfConfirmed">;

export default function CourseAdminInfoForm({ form, saving, updateField, handleSave, navigateIfConfirmed }: Props) {
  return (
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
  );
}
