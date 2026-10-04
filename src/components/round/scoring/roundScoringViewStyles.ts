import React from "react";
import { buttonStyle, compactSelectStyle, primaryButtonStyle, sectionStyle } from "../../../styles/uiStyles";

export const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: "12px",
};

export const topButtonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "5px",
  flexWrap: "wrap",
  alignItems: "center",
};

export const compactStatusWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

export const compactStatusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(92px, 120px))",
  gap: "5px",
};

export const compactStatusCardStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "8px",
  padding: "8px 10px",
  background: "#fafafa",
};

export const compactStatusLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#666",
  marginBottom: "2px",
  fontWeight: 600,
};

export const compactStatusValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: 1.1,
};

export const compactStatusSubValueStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#555",
  marginTop: "2px",
};

export const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

export const scoringTableWrapStyle: React.CSSProperties = {
  ...tableWrapStyle,
  maxHeight: "430px",
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

export const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "0.78rem",
};

export const stickyColumnStyle: React.CSSProperties = {
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 2,
};

export const stickyHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  backgroundColor: "#f9fafb",
  background: "#f9fafb",
  opacity: 1,
  borderBottom: "1px solid #d1d5db",
  zIndex: 20,
};

export const stickyScoringHeaderRowOneStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  top: 0,
  height: "26px",
  minHeight: "26px",
  lineHeight: "26px",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  zIndex: 30,
};

export const stickyScoringHeaderRowTwoStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  top: "26px",
  height: "26px",
  minHeight: "26px",
  lineHeight: "26px",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  zIndex: 29,
};

export const stickyScoringHeaderRowThreeStyle: React.CSSProperties = {
  ...stickyHeaderStyle,
  top: "52px",
  height: "26px",
  minHeight: "26px",
  lineHeight: "26px",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  zIndex: 28,
};

export const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #d1d5db",
  padding: "0.16rem 0.12rem",
  textAlign: "left",
  whiteSpace: "nowrap",
  background: "#f9fafb",
  fontWeight: 700,
};

export const centeredThStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "center",
};

export const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: "0.18rem 0.2rem",
  verticalAlign: "middle",
};

export const centeredTdStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

export const metaCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  whiteSpace: "nowrap",
};

export const holeCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  padding: "0.1rem 0.04rem",
};

export const holeInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: "30px",
  height: "32px",
  padding: 0,
  border: 0,
  borderRadius: 0,
  outline: "none",
  background: "transparent",
  color: "#111827",
  textAlign: "center",
  fontSize: "0.84rem",
  fontWeight: 700,
  lineHeight: 1,
  boxSizing: "border-box",
};

export const totalInputStyle: React.CSSProperties = {
  ...holeInputStyle,
  width: "100%",
  minWidth: "58px",
};

export const teeSelectStyle: React.CSSProperties = {
  ...compactSelectStyle,
  width: "112px",
  minWidth: "112px",
  maxWidth: "112px",
  height: "26px",
  fontSize: "0.7rem",
};

export const subtotalCellStyle: React.CSSProperties = {
  ...centeredTdStyle,
  fontWeight: 700,
  background: "#f8fafc",
};

export const compactSubtotalCellStyle: React.CSSProperties = {
  ...subtotalCellStyle,
  width: "34px",
  minWidth: "34px",
  maxWidth: "34px",
  paddingLeft: "0.08rem",
  paddingRight: "0.08rem",
};

export const compactTotalCellStyle: React.CSSProperties = {
  ...subtotalCellStyle,
  width: "40px",
  minWidth: "40px",
  maxWidth: "40px",
  paddingLeft: "0.08rem",
  paddingRight: "0.08rem",
};

export const compactPostCellStyle: React.CSSProperties = {
  ...subtotalCellStyle,
  width: "42px",
  minWidth: "42px",
  maxWidth: "42px",
  paddingLeft: "0.08rem",
  paddingRight: "0.08rem",
};

export const disabledButtonStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};

export const wdButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  fontWeight: 800,
  padding: "2px 6px",
  fontSize: "0.68rem",
};

export const wdActiveButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#b45309",
  background: "#fef3c7",
  color: "#78350f",
  fontWeight: 800,
  padding: "2px 6px",
  fontSize: "0.68rem",
};

export const activeStatusButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: "2px 5px",
  fontSize: "0.68rem",
};

export const modeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: "6px 10px",
};

export const selectedModeButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  padding: "6px 10px",
};

export const scoreActionPanelStyle: React.CSSProperties = {
  ...sectionStyle,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

export const stickyTopActionPanelStyle: React.CSSProperties = {
  ...scoreActionPanelStyle,
  position: "sticky",
  top: "8px",
  zIndex: 20,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
};

export const actionHintStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.88rem",
};

export const scoringModeBadgeStyle: React.CSSProperties = {
  border: "1px solid #d5d9de",
  borderRadius: "999px",
  padding: "5px 10px",
  background: "#f8fafc",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#374151",
};

