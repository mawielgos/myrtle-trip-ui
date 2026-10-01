import { NavLink, Outlet } from "react-router-dom";
import { pageContainerMediumStyle } from "../../styles/uiStyles";

const navLinkBaseStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: 600,
  color: "#1f2937",
};

export default function AppShell() {
  return (
    <div>
      <div
        style={{
          borderBottom: "1px solid #d1d5db",
          background: "#ffffff",
          padding: "12px 20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            Myrtle Beach Trip Manager 
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <NavLink
              to="/trips"
              style={({ isActive }) => ({
                ...navLinkBaseStyle,
                background: isActive ? "#dbeafe" : "#f3f4f6",
              })}
            >
              Trips
            </NavLink>

            <NavLink
              to="/admin/courses"
              style={({ isActive }) => ({
                ...navLinkBaseStyle,
                background: isActive ? "#dbeafe" : "#f3f4f6",
              })}
            >
              Course Master
            </NavLink>

            <NavLink
              to="/admin/players"
              style={({ isActive }) => ({
                ...navLinkBaseStyle,
                background: isActive ? "#dbeafe" : "#f3f4f6",
              })}
            >
              Player Master
            </NavLink>
          </div>
        </div>
      </div>

      <div style={pageContainerMediumStyle}>
        <Outlet />
      </div>
    </div>
  );
}