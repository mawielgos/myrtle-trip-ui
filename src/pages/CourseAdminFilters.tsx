import { inputStyle, sectionStyle } from "../styles/uiStyles";

type CourseAdminFiltersProps = {
  searchText: string;
  setSearchText: (value: string) => void;
  onlyActiveCourses: boolean;
  setOnlyActiveCourses: (value: boolean) => void;
};

export default function CourseAdminFilters({
  searchText, setSearchText, onlyActiveCourses, setOnlyActiveCourses,
}: CourseAdminFiltersProps) {
  return (
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
  );
}
