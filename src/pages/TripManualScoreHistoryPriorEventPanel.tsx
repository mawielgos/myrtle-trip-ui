import { Fragment, useMemo } from "react";
import type { CSSProperties } from "react";
import type { DbScoreHistoryImportCandidate } from "../types/manualScoreHistory";
import { formatNumber, formatScoreMonthYear } from "./tripManualScoreHistoryLogic";
import {
  appTableStyle,
  buttonStyle,
  primaryButtonStyle,
  sectionStyle,
  tdStyle,
  thStyle,
} from "../styles/uiStyles";

const committedHeaderCellStyle: CSSProperties = {
  ...thStyle,
  position: "sticky",
  top: 0,
  zIndex: 5,
  background: "#fff",
  boxShadow: "0 1px 0 #c7ccd1",
  whiteSpace: "nowrap",
};

const committedTableStyle: CSSProperties = {
  ...appTableStyle,
  minWidth: "1100px",
  margin: 0,
  borderCollapse: "separate",
  borderSpacing: 0,
};

interface TripManualScoreHistoryPriorEventPanelProps {
  candidates: DbScoreHistoryImportCandidate[];
  selectedCandidateIds: number[];
  loadingCandidates: boolean;
  saving: boolean;
  toggleCandidate: (candidateId: number) => void;
  toggleAllCandidates: (candidateIds: number[], checked: boolean) => void;
  onLoadCandidates: () => Promise<void>;
  onCommitSelected: () => Promise<void>;
}

export default function TripManualScoreHistoryPriorEventPanel({
  candidates,
  selectedCandidateIds,
  loadingCandidates,
  saving,
  toggleCandidate,
  toggleAllCandidates,
  onLoadCandidates,
  onCommitSelected,
}: TripManualScoreHistoryPriorEventPanelProps) {
  const selectedCount = selectedCandidateIds.length;
  const allSelected = candidates.length > 0 && selectedCandidateIds.length === candidates.length;

  const groupedCandidates = useMemo(() => {
    const groups: Array<{
      playerId: number;
      playerName: string;
      candidates: DbScoreHistoryImportCandidate[];
    }> = [];

    for (const candidate of candidates) {
      let group = groups.find((item) => item.playerId === candidate.playerId);
      if (!group) {
        group = { playerId: candidate.playerId, playerName: candidate.playerName, candidates: [] };
        groups.push(group);
      }
      group.candidates.push(candidate);
    }

    groups.sort((a, b) => a.playerName.localeCompare(b.playerName, undefined, { sensitivity: "base" }));
    for (const group of groups) {
      group.candidates.sort((a, b) => {
        const aDate = a.scoreDate || "";
        const bDate = b.scoreDate || "";
        if (aDate !== bDate) return bDate.localeCompare(aDate);
        return b.sourceScoreHistoryEntryId - a.sourceScoreHistoryEntryId;
      });
    }
    return groups;
  }, [candidates]);

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Import Scores From Prior Events</h2>
          <p style={{ margin: "6px 0 0", color: "#555", fontSize: "13px" }}>
            Load finalized prior-trip round scores for players on this event, select the rows you want, then commit them into this event score history.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: "#555", fontSize: "13px" }}>{selectedCount} selected</span>
          <button type="button" style={buttonStyle} disabled={loadingCandidates || saving} onClick={() => void onLoadCandidates()}>
            {loadingCandidates ? "Loading..." : "Load DB Scores"}
          </button>
          <button type="button" style={primaryButtonStyle} disabled={saving || selectedCount === 0} onClick={() => void onCommitSelected()}>
            Commit Selected DB Scores
          </button>
        </div>
      </div>

      {candidates.length > 0 && (
        <div style={{ marginTop: "12px", maxHeight: "360px", overflowY: "auto", overflowX: "auto", border: "1px solid #d8dee8", borderRadius: "10px" }}>
          <table style={{ ...committedTableStyle, minWidth: "1180px" }}>
            <thead>
              <tr>
                <th style={{ ...committedHeaderCellStyle, width: "42px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => toggleAllCandidates(candidates.map((candidate) => candidate.sourceScoreHistoryEntryId), event.target.checked)}
                    aria-label="Select all prior event score rows"
                  />
                </th>
                <th style={committedHeaderCellStyle}>Player</th>
                <th style={committedHeaderCellStyle}>Source Event</th>
                <th style={committedHeaderCellStyle}>Round</th>
                <th style={committedHeaderCellStyle}>Score Date</th>
                <th style={committedHeaderCellStyle}>Course</th>
                <th style={committedHeaderCellStyle}>Score</th>
                <th style={committedHeaderCellStyle}>CR</th>
                <th style={committedHeaderCellStyle}>Slope</th>
                <th style={committedHeaderCellStyle}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {groupedCandidates.map((group) => (
                <Fragment key={`db-group-${group.playerId}`}>
                  <tr>
                    <td colSpan={10} style={{ ...tdStyle, background: "#f3f6f9", borderTop: "2px solid #cfd8e3", fontWeight: 700 }}>
                      {group.playerName} · {group.candidates.length} available score{group.candidates.length === 1 ? "" : "s"}
                    </td>
                  </tr>
                  {group.candidates.map((candidate) => (
                    <tr key={candidate.sourceScoreHistoryEntryId}>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.includes(candidate.sourceScoreHistoryEntryId)}
                          onChange={() => toggleCandidate(candidate.sourceScoreHistoryEntryId)}
                          aria-label={`Select prior event score for ${candidate.playerName}`}
                        />
                      </td>
                      <td style={tdStyle}>{candidate.playerName}</td>
                      <td style={tdStyle}>{candidate.sourceTripName || candidate.sourceTripCode || "—"}</td>
                      <td style={tdStyle}>{candidate.sourceRoundNumber == null ? "—" : candidate.sourceRoundNumber}</td>
                      <td style={tdStyle}>{formatScoreMonthYear(candidate.scoreDate)}</td>
                      <td style={tdStyle}>{candidate.courseName || "—"}</td>
                      <td style={tdStyle}>{candidate.adjustedGrossScore ?? candidate.grossScore}</td>
                      <td style={tdStyle}>{formatNumber(candidate.courseRating, 1)}</td>
                      <td style={tdStyle}>{candidate.slope}</td>
                      <td style={tdStyle}>{formatNumber(candidate.differential, 1)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
