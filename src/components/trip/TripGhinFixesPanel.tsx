import { buttonStyle, sectionStyle } from "../../styles/uiStyles";

interface TripGhinFixesPanelProps {
  tripId: number;
  unresolvedGhinFixCount: number;
  onNavigate: (path: string) => void;
}

export default function TripGhinFixesPanel({
  tripId,
  unresolvedGhinFixCount,
  onNavigate,
}: TripGhinFixesPanelProps) {
  return (
    <div style={{ ...sectionStyle, marginBottom: "16px" }}>
      <h2 style={{ marginTop: 0, marginBottom: "12px" }}>GHIN Fixes</h2>

      <div style={{ fontSize: "14px", marginBottom: "10px" }}>
        Unresolved: <strong>{unresolvedGhinFixCount}</strong>
      </div>

      {unresolvedGhinFixCount > 0 ? (
        <button
          type="button"
          style={buttonStyle}
          onClick={() => onNavigate(`/trips/${tripId}/ghin-fixes`)}
        >
          Review GHIN Fixes
        </button>
      ) : (
        <div style={{ fontSize: "13px", color: "#555" }}>
          All manual fixes are complete.
        </div>
      )}
    </div>
  );
}
