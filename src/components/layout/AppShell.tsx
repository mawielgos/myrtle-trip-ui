import { useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  borderColor,
  buttonStyle,
  pageContainerStyle,
  sectionBackground,
  strongBorderColor,
  subtleBackground,
} from "../../styles/uiStyles";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f6f7f8",
};

const shellHeaderOuterStyle: CSSProperties = {
  width: "100%",
  padding: "16px 16px 0",
  boxSizing: "border-box",
};

const shellHeaderStyle: CSSProperties = {
  border: `1px solid ${borderColor}`,
  borderRadius: "10px",
  background: sectionBackground,
  padding: "14px 16px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
};

const shellHeaderInnerStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
};

const shellTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#222",
  letterSpacing: "-0.01em",
};

const shellNavStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const shellMainStyle: CSSProperties = {
  ...pageContainerStyle,
  paddingTop: "16px",
};

function getNavLinkStyle(isActive: boolean, appBusy: boolean): CSSProperties {
  return {
    ...buttonStyle,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontWeight: isActive ? 700 : 500,
    border: isActive ? `1px solid ${strongBorderColor}` : buttonStyle.border,
    background: isActive ? "#eef1f4" : subtleBackground,
    boxShadow: isActive ? "inset 0 0 0 1px rgba(0, 0, 0, 0.02)" : undefined,
    opacity: appBusy ? 0.55 : 1,
    cursor: appBusy ? "not-allowed" : "pointer",
    pointerEvents: appBusy ? "none" : "auto",
  };
}

export default function AppShell() {
  const [appBusy, setAppBusy] = useState(false);

  useEffect(() => {
    function handleAppBusyChange(event: Event): void {
      const customEvent = event as CustomEvent<{ busy?: boolean }>;
      setAppBusy(customEvent.detail?.busy === true);
    }

    window.addEventListener("golf-trip-app-busy-change", handleAppBusyChange);

    return () => {
      window.removeEventListener("golf-trip-app-busy-change", handleAppBusyChange);
    };
  }, []);

  function blockNavigationWhenBusy(event: MouseEvent<HTMLAnchorElement>): void {
    if (appBusy) {
      event.preventDefault();
    }
  }

  return (
    <div style={shellStyle}>
      <header style={shellHeaderOuterStyle} className="app-shell-no-print no-print">
        <div style={shellHeaderStyle}>
          <div style={shellHeaderInnerStyle}>
            <h1 style={shellTitleStyle}>Golf Event Manager</h1>

            <nav style={shellNavStyle} aria-label="Primary navigation">
              <NavLink
                to="/trips"
                style={({ isActive }) => getNavLinkStyle(isActive, appBusy)}
                onClick={blockNavigationWhenBusy}
                aria-disabled={appBusy}
              >
                Events
              </NavLink>

              <NavLink
                to="/admin/courses"
                style={({ isActive }) => getNavLinkStyle(isActive, appBusy)}
                onClick={blockNavigationWhenBusy}
                aria-disabled={appBusy}
              >
                Course Master
              </NavLink>

              <NavLink
                to="/admin/players"
                style={({ isActive }) => getNavLinkStyle(isActive, appBusy)}
                onClick={blockNavigationWhenBusy}
                aria-disabled={appBusy}
              >
                Player Master
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main style={shellMainStyle}>
        <Outlet />
      </main>
    </div>
  );
}
