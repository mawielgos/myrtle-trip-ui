import PageHeader from "../components/common/PageHeader";
import {
  buttonStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import { useCourseAdminController } from "./useCourseAdminController";
import CourseAdminFilters from "./CourseAdminFilters";
import CourseAdminList from "./CourseAdminList";

export default function CourseAdminPage() {
  const {
    courses, loading, error, statusMessage, onlyActiveCourses, setOnlyActiveCourses,
    searchText, setSearchText, activeCount, visibleCourses, loadCourses,
    handleToggleActive, navigateToAddCourse, navigateToEditCourse, navigateToAddTee,
  } = useCourseAdminController();

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
            <button style={primaryButtonStyle} onClick={() => navigateToAddCourse()}>
              Add Course
            </button>
          </>
        }
      />

      <CourseAdminFilters
        searchText={searchText}
        setSearchText={setSearchText}
        onlyActiveCourses={onlyActiveCourses}
        setOnlyActiveCourses={setOnlyActiveCourses}
      />

      {loading ? <div style={sectionStyle}>Loading courses...</div> : null}
      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {!loading && !error && statusMessage ? <div style={successBoxStyle}>{statusMessage}</div> : null}

      {!loading && !error ? (
        <CourseAdminList
          visibleCourses={visibleCourses}
          searchText={searchText}
          onlyActiveCourses={onlyActiveCourses}
          handleToggleActive={handleToggleActive}
          navigateToEditCourse={navigateToEditCourse}
          navigateToAddTee={navigateToAddTee}
        />
      ) : null}
    </div>
  );
}
