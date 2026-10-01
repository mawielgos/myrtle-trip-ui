import type { CSSProperties } from "react";
import type { RoundReadinessResponse } from "../../types/round";
import {
  errorBoxStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../../styles/uiStyles";

interface RoundReadinessPanelProps {
  readiness: RoundReadinessResponse | null;
  compact?: boolean;
  title?: string;
}

const statusGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "8px",
  marginTop: "12px",
};

const statusCardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "8px 10px",
  background: "#fafafa",
};

const statusLabelStyle: CSSProperties = {
  fontSize: "12px",
  color: "#666",
  fontWeight: 600,
  marginBottom: "4px",
};

const statusValueStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
};

const listStyle: CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: "20px",
};

function yesNo(value: boolean | undefined): string {
  return value ? "Yes" : "No";
}

export default function RoundReadinessPanel({
  readiness,
  compact = false,
  title = "Round Readiness",
}: RoundReadinessPanelProps) {
  if (!readiness) {
    return null;
  }

  const structuredIssues = readiness.issues ?? [];
  const errorIssues = structuredIssues.filter((issue) => issue.severity === "ERROR");
  const warningIssues = structuredIssues.filter((issue) => issue.severity === "WARNING");
  const blockingIssues = errorIssues.length > 0 ? errorIssues.map((issue) => issue.message) : readiness.blockingIssues ?? [];
  const warnings = warningIssues.length > 0 ? warningIssues.map((issue) => issue.message) : readiness.warnings ?? [];
  const ready = readiness.ready ?? readiness.readyForScoring;

  return (
    <section style={compact ? { ...sectionStyle, padding: "12px" } : sectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        <strong style={{ color: ready ? "#1f6b2a" : "#8a1f11" }}>
          {ready ? "Ready for Scoring" : "Not Ready"}
        </strong>
      </div>

      <div style={statusGridStyle}>
        <div style={statusCardStyle}>
          <div style={statusLabelStyle}>Scorecards</div>
          <div style={statusValueStyle}>{yesNo(readiness.scorecardsReady)}</div>
        </div>
        <div style={statusCardStyle}>
          <div style={statusLabelStyle}>Groups</div>
          <div style={statusValueStyle}>{yesNo(readiness.groupsReady)}</div>
        </div>
        <div style={statusCardStyle}>
          <div style={statusLabelStyle}>Teams</div>
          <div style={statusValueStyle}>{yesNo(readiness.teamsReady)}</div>
        </div>
        <div style={statusCardStyle}>
          <div style={statusLabelStyle}>Tees</div>
          <div style={statusValueStyle}>{yesNo(readiness.teesReady)}</div>
        </div>
      </div>

      {ready ? (
        <div style={{ ...successBoxStyle, marginTop: "12px", marginBottom: 0 }}>
          This round is ready for scoring.
        </div>
      ) : null}

      {blockingIssues.length > 0 ? (
        <div style={{ ...errorBoxStyle, marginTop: "12px", marginBottom: 0 }}>
          <strong>Blocking Issues</strong>
          <ul style={listStyle}>
            {blockingIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div style={{ ...warningBoxStyle, marginTop: "12px", marginBottom: 0 }}>
          <strong>Warnings</strong>
          <ul style={listStyle}>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
