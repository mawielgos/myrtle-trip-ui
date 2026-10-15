import { buttonStyle, errorBoxStyle, pageContainerWideStyle } from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import { formatValue } from "./courseAdminEditLogic";
import { useCourseAdminEditController } from "./useCourseAdminEditController";
import CourseAdminInfoForm from "./CourseAdminInfoForm";
import CourseAdminTeePanel from "./CourseAdminTeePanel";

export default function CourseAdminEditPage() {
  const controller = useCourseAdminEditController();
  const { isNew, courseDetail, tees, loading, error, successMessage, navigateIfConfirmed } = controller;

  if (loading) {
    return <div style={{ padding: "16px" }}><p>Loading course...</p></div>;
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
            <button style={buttonStyle} onClick={() => void navigateIfConfirmed("/admin/courses")}>Course Master</button>
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
        <div style={{ border: "1px solid #b7e4c7", background: "#f0fff4", color: "#166534", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
          {successMessage}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)", gap: "16px", alignItems: "start" }}>
        <CourseAdminInfoForm {...controller} />
        <CourseAdminTeePanel {...controller} />
      </div>
    </div>
  );
}
