import type { CSSProperties } from "react";

export const pageContainerStyle: CSSProperties = {
  padding: "16px",
};

export const pageContainerWideStyle: CSSProperties = {
  padding: "16px",
  maxWidth: "1400px",
};

export const pageContainerMediumStyle: CSSProperties = {
  padding: "16px",
  maxWidth: "1200px",
};

export const sectionStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "20px",
  background: "#fff",
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
  height: "36px",
  padding: "6px 10px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: "1px solid #bbb",
  borderRadius: "4px",
  background: "#fff",
  appearance: "textfield",
  MozAppearance: "textfield" as any,
};

export const selectStyle: CSSProperties = {
  width: "100%",
  height: "36px",
  padding: "6px 10px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: "1px solid #bbb",
  borderRadius: "4px",
  background: "#fff",
};

export const formInputStyle: CSSProperties = inputStyle;
export const formSelectStyle: CSSProperties = selectStyle;

export const buttonStyle: CSSProperties = {
  height: "36px",
  padding: "0 12px",
  boxSizing: "border-box",
  fontSize: "14px",
  lineHeight: "1.2",
  border: "1px solid #bbb",
  borderRadius: "4px",
  background: "#fff",
  color: "#222",
  cursor: "pointer",
};

export const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  fontWeight: 600,
  background: "#f7f7f7",
};

export const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "1px solid #caa",
  background: "#fffafa",
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ccc",
  padding: "8px",
};

export const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px",
  verticalAlign: "top",
};

export const errorBoxStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "6px",
  background: "#fdeaea",
  color: "#8a1f11",
  border: "1px solid #f5c2c0",
};

export const warningBoxStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "6px",
  background: "#fff7e6",
  color: "#8a5a00",
  border: "1px solid #f2d39b",
};

export const successBoxStyle: CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  borderRadius: "6px",
  background: "#eaf7ea",
  color: "#1f6b2a",
  border: "1px solid #b9dfbf",
};