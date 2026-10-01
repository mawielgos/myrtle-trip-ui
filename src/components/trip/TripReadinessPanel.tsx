import { sectionStyle } from "../../styles/uiStyles";
import type { TripReadiness } from "../../types/trip";
import {
  buildChecklistRowStyle,
  type ReadinessBanner,
} from "./tripDetailUtils";

interface TripReadinessPanelProps {
  tripStatus: string;
  readiness: TripReadiness | null;
  readinessBanner: ReadinessBanner;
}

export default function TripReadinessPanel({
  tripStatus,
  readiness,
  readinessBanner,
}: TripReadinessPanelProps) {
  return (
    <div style={{ ...sectionStyle, marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0 }}>Event Readiness</h2>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 12px",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: "13px",
            background: readinessBanner.background,
            border: readinessBanner.border,
            color: readinessBanner.color,
          }}
        >
          {readinessBanner.label}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 260px)",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <div>
          <div style={buildChecklistRowStyle(readiness?.rosterReady === true)}>
            <span>{readiness?.rosterReady ? "✔" : "○"}</span>
            <span>
              {readiness?.rosterReady
                ? `Roster ready (${readiness?.activePlayerCount ?? 0} active players)`
                : `Roster needs at least one active player (${readiness?.activePlayerCount ?? 0} active players)`}
            </span>
          </div>

          <div
            style={buildChecklistRowStyle(
              readiness?.plannedRoundsReady === true,
            )}
          >
            <span>{readiness?.plannedRoundsReady ? "✔" : "○"}</span>
            <span>
              {readiness?.plannedRoundsReady
                ? `Planned rounds ready (${readiness?.completedPlannedRoundCount ?? 0}/${readiness?.plannedRoundCount ?? 0} complete)`
                : `Planned rounds incomplete (${readiness?.completedPlannedRoundCount ?? 0}/${readiness?.plannedRoundCount ?? 0} complete)`}
            </span>
          </div>

          <div
            style={buildChecklistRowStyle(readiness?.ghinFixesReady === true)}
          >
            <span>{readiness?.ghinFixesReady ? "✔" : "○"}</span>
            <span>
              {readiness?.ghinFixesReady
                ? "GHIN fixes complete"
                : `${readiness?.unresolvedGhinFixCount ?? 0} GHIN fix(es) still unresolved`}
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: "8px",
            padding: "12px",
            background:
              tripStatus === "IN_PROGRESS" || tripStatus === "COMPLETE"
                ? "#f7f8fa"
                : readiness?.canStartTrip
                  ? "#edf8f0"
                  : "#fff8e1",
            border:
              tripStatus === "IN_PROGRESS" || tripStatus === "COMPLETE"
                ? "1px solid #dde3ea"
                : readiness?.canStartTrip
                  ? "1px solid #b7d7c0"
                  : "1px solid #e5d7a8",
          }}
        >
          {tripStatus === "IN_PROGRESS" ? (
            <div style={{ color: "#1f4f99", fontWeight: 600 }}>
              Event is in progress.
            </div>
          ) : tripStatus === "COMPLETE" ? (
            <div style={{ color: "#1f6b2a", fontWeight: 600 }}>
              Event is complete.
            </div>
          ) : readiness?.blockingItems && readiness.blockingItems.length > 0 ? (
            <div>
              <div
                style={{
                  color: "#8a6700",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Blocking items
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {readiness.blockingItems.map((item) => (
                  <div
                    key={item}
                    style={{ color: "#8a6700", fontSize: "13px" }}
                  >
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "#1f6b2a", fontWeight: 600 }}>
              This trip is ready to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
