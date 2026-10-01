import type { CSSProperties } from "react";
import {
  buttonStyle,
  dangerButtonStyle,
  primaryButtonStyle,
  sectionStyle,
} from "../../styles/uiStyles";
import type { TripDetail, TripListItem, TripReadiness } from "../../types/trip";

interface TripsListCardProps {
  trip: TripListItem;
  detail?: TripDetail | null;
  onOpenTrip: (tripId: number) => void;
  onEditTrip: (tripId: number) => void;
  onDeleteTrip: (trip: TripListItem) => void;
  onArchiveTrip: (trip: TripListItem) => void;
  onRestoreTrip: (trip: TripListItem) => void;
  isDeleting?: boolean;
  isArchiveActionRunning?: boolean;
}

function formatStatusLabel(status: string | null | undefined): string {
  if (status === "IN_PROGRESS") {
    return "In Progress";
  }

  if (status === "COMPLETE") {
    return "Complete";
  }

  return "Setup";
}

function formatGameLabel(value: string | null | undefined): string {
  if (!value) {
    return "No format selected";
  }

  if (value === "MIDDLE_MAN") {
    return "4-Man Middle Man";
  }

  if (value === "ONE_TWO_THREE") {
    return "4-Man 1-2-3";
  }

  if (value === "TWO_MAN_LOW_NET") {
    return "2-Man Low Net";
  }

  if (value === "THREE_LOW_NET") {
    return "4-Man 3 Low Net";
  }

  if (value === "TEAM_SCRAMBLE") {
    return "Team Scramble";
  }

  if (value === "STROKE_PLAY") {
    return "Stroke Play";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }

  return `$${value}`;
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTripDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);

  if (!start && !end) {
    return "Dates TBD";
  }

  if (start && end) {
    return start === end ? start : `${start} – ${end}`;
  }

  return start ?? end ?? "Dates TBD";
}

function getArchivedBadgeStyle(): CSSProperties {
  return {
    ...badgeBaseStyle,
    background: "#f1f1f1",
    color: "#555",
    border: "1px solid #d7d7d7",
  };
}

function getStatusBadgeStyle(status: string | null | undefined): CSSProperties {
  if (status === "IN_PROGRESS") {
    return {
      ...badgeBaseStyle,
      background: "#eaf2ff",
      color: "#1f4f99",
      border: "1px solid #bfd3f2",
    };
  }

  if (status === "COMPLETE") {
    return {
      ...badgeBaseStyle,
      background: "#edf8f0",
      color: "#1f6b2a",
      border: "1px solid #b7d7c0",
    };
  }

  return {
    ...badgeBaseStyle,
    background: "#fff8e1",
    color: "#8a6700",
    border: "1px solid #e5d7a8",
  };
}

function getHighlightText(detail: TripDetail | null | undefined): {
  label: string;
  color: string;
} {
  if (!detail) {
    return {
      label: "Loading event status...",
      color: "#666",
    };
  }

  if (detail.status === "IN_PROGRESS") {
    return {
      label: "Event in progress",
      color: "#1f4f99",
    };
  }

  if (detail.status === "COMPLETE") {
    return {
      label: "Event complete",
      color: "#1f6b2a",
    };
  }

  if (detail.readiness?.canStartTrip) {
    return {
      label: "Ready to start",
      color: "#1f6b2a",
    };
  }

  const blockingCount = detail.readiness?.blockingItems?.length ?? 0;
  return {
    label: blockingCount > 0 ? `${blockingCount} blocking items` : "Setup in progress",
    color: "#8a6700",
  };
}

function getCurrentRoundLabel(detail: TripDetail | null | undefined): string {
  if (!detail?.currentRound) {
    return detail?.status === "COMPLETE" ? "All rounds complete" : "No round started yet";
  }

  return `Round ${detail.currentRound.roundNumber}`;
}

function getCurrentRoundSubLabel(detail: TripDetail | null | undefined): string {
  if (!detail?.currentRound) {
    return detail?.status === "COMPLETE" ? "Results are available from Event Detail" : "Event has not started yet";
  }

  return formatGameLabel(detail.currentRound.format);
}

function getCurrentRoundCourse(detail: TripDetail | null | undefined): string {
  if (!detail?.currentRound) {
    return "";
  }

  return detail.currentRound.courseName || "No course selected";
}

function readinessRow(label: string, ready: boolean | undefined): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: ready ? "#1f6b2a" : "#8a6700",
    lineHeight: 1.2,
  };
}

const badgeBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "3px 8px",
  fontSize: "12px",
  fontWeight: 700,
};

const cardStyle: CSSProperties = {
  ...sectionStyle,
  borderRadius: "12px",
  padding: "14px",
  marginBottom: 0,
};

const statTileStyle: CSSProperties = {
  border: "1px solid #e6e8eb",
  borderRadius: "8px",
  padding: "9px 10px",
  background: "#fafafa",
  minWidth: 0,
};

const panelStyle: CSSProperties = {
  border: "1px solid #e6e8eb",
  borderRadius: "8px",
  padding: "10px 12px",
  background: "#fafafa",
  minHeight: "84px",
};

const secondaryActionStyle: CSSProperties = {
  ...buttonStyle,
  minWidth: "76px",
};

const deleteActionStyle: CSSProperties = {
  ...dangerButtonStyle,
  minWidth: "76px",
};

function ReadinessBlock({ readiness }: { readiness: TripReadiness | null | undefined }) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", marginBottom: "8px" }}>
        READINESS
      </div>

      <div style={{ display: "grid", gap: "6px" }}>
        <div style={readinessRow("Roster", readiness?.rosterReady)}>
          <span>{readiness?.rosterReady ? "✓" : "○"}</span>
          <span>Roster</span>
        </div>
        <div style={readinessRow("Planned Rounds", readiness?.plannedRoundsReady)}>
          <span>{readiness?.plannedRoundsReady ? "✓" : "○"}</span>
          <span>Planned Rounds</span>
        </div>
        <div style={readinessRow("GHIN Fixes", readiness?.ghinFixesReady)}>
          <span>{readiness?.ghinFixesReady ? "✓" : "○"}</span>
          <span>GHIN Fixes</span>
        </div>
      </div>
    </div>
  );
}

export default function TripsListCard({
  trip,
  detail,
  onOpenTrip,
  onEditTrip,
  onDeleteTrip,
  onArchiveTrip,
  onRestoreTrip,
  isDeleting = false,
  isArchiveActionRunning = false,
}: TripsListCardProps) {
  const effectiveStatus = detail?.status ?? trip.status ?? "PLANNING";
  const archived = trip.archived === true || detail?.archived === true;
  const highlight = getHighlightText(detail);
  const canEdit = effectiveStatus !== "IN_PROGRESS" && effectiveStatus !== "COMPLETE";

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 420px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "5px",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.15 }}>{trip.tripName}</div>
            <span style={getStatusBadgeStyle(effectiveStatus)}>{formatStatusLabel(effectiveStatus)}</span>
            {archived ? <span style={getArchivedBadgeStyle()}>Archived</span> : null}
          </div>

          <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
            {formatTripDateRange(trip.startDate, trip.endDate)}
            {trip.tripYear ? ` • ${trip.tripYear}` : ""}
          </div>

          <div style={{ fontSize: "14px", fontWeight: 700, color: highlight.color }}>{highlight.label}</div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" style={primaryButtonStyle} onClick={() => onOpenTrip(trip.tripId)}>
            Open Event
          </button>

          {canEdit ? (
            <button type="button" style={secondaryActionStyle} onClick={() => onEditTrip(trip.tripId)}>
              Edit
            </button>
          ) : null}

          {archived ? (
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={() => onRestoreTrip(trip)}
              disabled={isArchiveActionRunning}
            >
              {isArchiveActionRunning ? "Restoring..." : "Restore"}
            </button>
          ) : (
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={() => onArchiveTrip(trip)}
              disabled={isArchiveActionRunning}
            >
              {isArchiveActionRunning ? "Archiving..." : "Archive"}
            </button>
          )}

          {trip.canDelete ? (
            <button
              type="button"
              style={deleteActionStyle}
              onClick={() => onDeleteTrip(trip)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <div style={statTileStyle}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>PLAYERS</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{trip.playerCount ?? 0}</div>
        </div>
        <div style={statTileStyle}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>ROUNDS</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{trip.roundCount ?? 0}</div>
        </div>
        <div style={statTileStyle}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>ENTRY FEE</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{formatCurrency(detail?.entryFee)}</div>
        </div>
        <div style={statTileStyle}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "4px" }}>GHIN FIXES</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{detail?.unresolvedGhinFixCount ?? 0}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) minmax(240px, 0.9fr)",
          gap: "8px",
          alignItems: "stretch",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", marginBottom: "8px" }}>
            CURRENT ROUND
          </div>
          <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.2, marginBottom: "4px" }}>
            {getCurrentRoundLabel(detail)}
          </div>
          <div style={{ fontSize: "14px", lineHeight: 1.25, marginBottom: "2px" }}>
            {getCurrentRoundSubLabel(detail)}
          </div>
          {getCurrentRoundCourse(detail) ? (
            <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.2 }}>{getCurrentRoundCourse(detail)}</div>
          ) : null}
        </div>

        <ReadinessBlock readiness={detail?.readiness} />
      </div>
    </div>
  );
}
