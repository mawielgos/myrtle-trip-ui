import type { CSSProperties } from "react";

export const borderColor = "#d5d9de";
export const strongBorderColor = "#c7ccd1";
export const subtleBorderColor = "#e6e8eb";
export const sectionBackground = "#fff";
export const subtleBackground = "#fafafa";
export const primaryActionColor = "#245f3d";
export const primaryActionHoverColor = "#1d4f32";
export const dangerActionColor = "#a33a2a";

export const pageContainerStyle: CSSProperties = {
  width: "100%",
  padding: "16px",
  boxSizing: "border-box",
};

export const pageContainerWideStyle: CSSProperties = {
  width: "100%",
  padding: "16px",
  boxSizing: "border-box",
};

export const pageContainerMediumStyle: CSSProperties = {
  width: "100%",
  padding: "16px",
  boxSizing: "border-box",
};

export const sectionStyle: CSSProperties = {
  border: `1px solid ${borderColor}`,
  borderRadius: "10px",
  padding: "14px",
  marginBottom: "16px",
  background: sectionBackground,
  width: "100%",
  boxSizing: "border-box",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
};

export const cardStyle: CSSProperties = {
  border: `1px solid ${borderColor}`,
  borderRadius: "10px",
  padding: "12px",
  background: sectionBackground,
  boxSizing: "border-box",
};

export const subtleCardStyle: CSSProperties = {
  ...cardStyle,
  background: subtleBackground,
};

export const emphasizedCardStyle: CSSProperties = {
  ...cardStyle,
  border: `1px solid ${strongBorderColor}`,
};

export const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

export const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  alignItems: "end",
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
  fontWeight: 600,
};

export const inputStyle: CSSProperties = {
  width: "100%",
  height: "34px",
  padding: "6px 10px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: `1px solid ${strongBorderColor}`,
  borderRadius: "6px",
  background: "#fff",
  color: "#222",
  fontFamily: "inherit",
  appearance: "textfield",
  MozAppearance: "textfield" as any,
  WebkitAppearance: "none",
};

export const selectStyle: CSSProperties = {
  width: "100%",
  height: "34px",
  padding: "6px 10px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: `1px solid ${strongBorderColor}`,
  borderRadius: "6px",
  background: "#fff",
  color: "#222",
  fontFamily: "inherit",
};

export const formInputStyle: CSSProperties = inputStyle;
export const formSelectStyle: CSSProperties = selectStyle;

export const compactInputStyle: CSSProperties = {
  ...inputStyle,
  height: "30px",
  padding: "4px 8px",
  fontSize: "13px",
};

export const compactSelectStyle: CSSProperties = {
  ...selectStyle,
  height: "30px",
  padding: "4px 8px",
  fontSize: "13px",
};

export const scoreInputStyle: CSSProperties = {
  ...compactInputStyle,
  width: "36px",
  minWidth: "36px",
  textAlign: "center",
  padding: 0,
  fontVariantNumeric: "tabular-nums",
};

export const buttonStyle: CSSProperties = {
  minHeight: "34px",
  padding: "0 12px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: `1px solid ${strongBorderColor}`,
  borderRadius: "7px",
  background: "#fff",
  color: "#222",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  textDecoration: "none",
  whiteSpace: "nowrap",
  boxShadow: "0 1px 1px rgba(0, 0, 0, 0.03)",
};

export const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: `1px solid ${primaryActionColor}`,
  background: primaryActionColor,
  color: "#fff",
};

export const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: subtleBackground,
  color: "#333",
};

export const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: `1px solid ${dangerActionColor}`,
  background: "#fff7f5",
  color: dangerActionColor,
};

export const disabledButtonStyle: CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
  boxShadow: "none",
};

export const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

export const splitActionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

export const scrollTableWrapStyle: CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: `1px solid ${strongBorderColor}`,
  padding: "7px 8px",
};

export const tdStyle: CSSProperties = {
  borderBottom: `1px solid ${subtleBorderColor}`,
  padding: "7px 8px",
  verticalAlign: "top",
};

export const errorBoxStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "8px",
  background: "#fdeaea",
  color: "#8a1f11",
  border: "1px solid #f5c2c0",
};

export const warningBoxStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "8px",
  background: "#fff7e6",
  color: "#8a5a00",
  border: "1px solid #f2d39b",
};

export const successBoxStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "8px",
  background: "#eaf7ea",
  color: "#1f6b2a",
  border: "1px solid #b9dfbf",
};

export const appTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  lineHeight: 1.3,
  fontFamily: "inherit",
  color: "#222",
};

export const appTableHeaderCellStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: `1px solid ${strongBorderColor}`,
  padding: "8px",
  fontSize: "14px",
  lineHeight: 1.25,
  fontWeight: 700,
  color: "#222",
  whiteSpace: "nowrap",
};

export const appTableCellStyle: CSSProperties = {
  borderBottom: `1px solid ${subtleBorderColor}`,
  padding: "8px",
  fontSize: "14px",
  lineHeight: 1.3,
  verticalAlign: "top",
  color: "#222",
};

export const appTableNameCellStyle: CSSProperties = {
  ...appTableCellStyle,
  fontSize: "14px",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

export const appTableNumericCellStyle: CSSProperties = {
  ...appTableCellStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

export function appTableRowBackground(rowIndex: number): string {
  return rowIndex % 2 === 0 ? "#fff" : "#fafafa";
}

export const pageHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

export const pageHeaderTitleBlockStyle: CSSProperties = {
  minWidth: "260px",
  flex: "1 1 420px",
};

export const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.15,
  fontWeight: 800,
  letterSpacing: "-0.01em",
  color: "#222",
};

export const pageSubtitleStyle: CSSProperties = {
  marginTop: "6px",
  fontSize: "14px",
  lineHeight: 1.35,
  color: "#555",
};

export const pageHeaderActionsStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
  flex: "0 1 auto",
};

export const compactHelpTextStyle: CSSProperties = {
  marginTop: "4px",
  color: "#666",
  fontSize: "13px",
  lineHeight: 1.35,
};
