import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTripDetail, getTripGhinFixes, saveTripGhinFix } from "../api/tripApi";
import type { GhinFixRow } from "../types/ghinFix";
import {
  errorBoxStyle,
  formInputStyle,
  pageContainerMediumStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  tdStyle,
  thStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";

function formatNullableNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toFixed(digits);
}

function buildRowHint(row: GhinFixRow): string {
  const parts: string[] = [];

  if (row.scoreType) {
    parts.push(`Type ${row.scoreType}`);
  }

  if (row.holesPlayed != null) {
    parts.push(`${row.holesPlayed} holes`);
  }

  if (row.postingOrder != null) {
    parts.push(`Posting ${row.postingOrder}`);
  }

  return parts.length > 0 ? parts.join(" • ") : "Manual differential required";
}

export default function TripGhinFixesPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const [tripName, setTripName] = useState<string>("Event");
  const [rows, setRows] = useState<GhinFixRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [initialDraftSnapshot, setInitialDraftSnapshot] = useState<string>("");

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    void loadPage();
  }, [numericTripId]);

  const outstandingCount = rows.length;

  const comparableDraftSnapshot = useMemo(() => {
    return JSON.stringify(
      Object.keys(drafts)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => [Number(key), (drafts[Number(key)] ?? "").trim()])
    );
  }, [drafts]);

  const hasChanges =
    !loading &&
    initialDraftSnapshot.length > 0 &&
    comparableDraftSnapshot !== initialDraftSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(
    hasChanges && savingRowId == null
  );

  async function navigateIfConfirmed(path: string): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }
    navigate(path);
  }


  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const playerCompare = a.playerName.localeCompare(b.playerName, undefined, {
        sensitivity: "base",
      });

      if (playerCompare !== 0) {
        return playerCompare;
      }

      const postingA = a.postingOrder ?? 9999;
      const postingB = b.postingOrder ?? 9999;

      if (postingA !== postingB) {
        return postingA - postingB;
      }

      return a.scoreHistoryEntryId - b.scoreHistoryEntryId;
    });
  }, [rows]);

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [trip, fixRows] = await Promise.all([
        getTripDetail(numericTripId),
        getTripGhinFixes(numericTripId),
      ]);

      setTripName(trip.tripName);
      setRows(fixRows);
      setDrafts(() => {
        const next: Record<number, string> = {};

        for (const row of fixRows) {
          next[row.scoreHistoryEntryId] =
            row.differential != null ? row.differential.toFixed(3) : "";
        }

        return next;
      });
      setInitialDraftSnapshot(
        JSON.stringify(
          fixRows
            .map((row) => [row.scoreHistoryEntryId, row.differential != null ? row.differential.toFixed(3) : ""])
            .sort((a, b) => Number(a[0]) - Number(b[0]))
        )
      );
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(typeof apiMessage === "string" ? apiMessage : "Unable to load GHIN fixes.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(scoreHistoryEntryId: number, value: string): void {
    setDrafts((current) => ({
      ...current,
      [scoreHistoryEntryId]: value,
    }));
  }

  async function handleSave(row: GhinFixRow): Promise<void> {
    const rawValue = (drafts[row.scoreHistoryEntryId] ?? "").trim();

    if (!rawValue) {
      setError(`Enter a differential for ${row.playerName}.`);
      setMessage(null);
      return;
    }

    const numericValue = Number(rawValue);

    if (Number.isNaN(numericValue)) {
      setError(`Differential for ${row.playerName} must be numeric.`);
      setMessage(null);
      return;
    }

    try {
      setSavingRowId(row.scoreHistoryEntryId);
      setError(null);
      setMessage(null);

      const savedRow = await saveTripGhinFix(numericTripId, row.scoreHistoryEntryId, {
        differential: numericValue,
      });

      setRows((current) =>
        current.filter(
          (currentRow) => currentRow.scoreHistoryEntryId !== savedRow.scoreHistoryEntryId
        )
      );

      setDrafts((current) => {
        const next = { ...current };
        delete next[row.scoreHistoryEntryId];
        setInitialDraftSnapshot(
          JSON.stringify(
            Object.keys(next)
              .sort((a, b) => Number(a) - Number(b))
              .map((key) => [Number(key), (next[Number(key)] ?? "").trim()])
          )
        );
        return next;
      });

      const remainingCount = Math.max(rows.length - 1, 0);

      setMessage(
        `${savedRow.playerName} fix saved. ${remainingCount} outstanding GHIN fix${
          remainingCount === 1 ? "" : "es"
        } remaining.`
      );
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : `Unable to save GHIN fix for ${row.playerName}.`
      );
      setMessage(null);
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleSaveAll(): Promise<void> {
    setError(null);
    setMessage(null);

    const rowsToSave = sortedRows.filter((row) => {
      const rawValue = (drafts[row.scoreHistoryEntryId] ?? "").trim();
      return rawValue.length > 0;
    });

    if (rowsToSave.length === 0) {
      setError("No GHIN fixes have been entered.");
      return;
    }

    try {
      setSavingRowId(-1);

      for (const row of rowsToSave) {
        const rawValue = (drafts[row.scoreHistoryEntryId] ?? "").trim();
        const numericValue = Number(rawValue);

        if (Number.isNaN(numericValue)) {
          throw new Error(`Differential for ${row.playerName} must be numeric.`);
        }

        await saveTripGhinFix(numericTripId, row.scoreHistoryEntryId, {
          differential: numericValue,
        });
      }

      setMessage(`${rowsToSave.length} GHIN fix${rowsToSave.length === 1 ? "" : "es"} saved.`);
      await loadPage();
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);

      setError(typeof apiMessage === "string" ? apiMessage : err?.message ?? "Unable to save all GHIN fixes.");
      setMessage(null);
    } finally {
      setSavingRowId(null);
    }
  }

  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading GHIN fixes...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="GHIN Fixes Review"
        subtitle={`${tripName} — review unresolved frozen GHIN differentials before the event can move to In Progress.`}
        actions={
          <>
            <TripDetailButton tripId={numericTripId} onBeforeNavigate={confirmIfNeeded} />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "34px",
                padding: "0 12px",
                borderRadius: "999px",
                background: outstandingCount > 0 ? "#fff8e1" : "#edf8f0",
                border: outstandingCount > 0 ? "1px solid #e5d7a8" : "1px solid #b7d7c0",
                color: outstandingCount > 0 ? "#8a6700" : "#1f6b2a",
                fontWeight: 700,
              }}
            >
              Outstanding: {outstandingCount}
            </div>
            {outstandingCount > 0 ? (
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSaveAll()}
                disabled={savingRowId != null || sortedRows.length === 0}
              >
                {savingRowId === -1 ? "Saving All..." : "Save All Fixes"}
              </button>
            ) : null}
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      {outstandingCount > 0 ? (
        <div style={warningBoxStyle}>
          Enter one or more manual differentials, then save each row individually or use
          Save All Fixes to clear multiple GHIN fixes at once. When the count reaches
          zero, the event start block is removed.
        </div>
      ) : (
        <div style={successBoxStyle}>
          All GHIN manual fixes are complete. This trip is no longer blocked by GHIN
          differential review.
        </div>
      )}

      <div style={sectionStyle}>
        {sortedRows.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>No outstanding GHIN fixes.</div>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void navigateIfConfirmed(`/trips/${numericTripId}`)}
            >
              Return to Event
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "980px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>GHIN #</th>
                  <th style={thStyle}>Row Info</th>
                  <th style={thStyle}>Gross</th>
                  <th style={thStyle}>Rating</th>
                  <th style={thStyle}>Slope</th>
                  <th style={thStyle}>Current Diff</th>
                  <th style={thStyle}>Manual Diff</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const isSaving = savingRowId === row.scoreHistoryEntryId;

                  return (
                    <tr key={row.scoreHistoryEntryId}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{row.playerName}</div>
                      </td>
                      <td style={tdStyle}>{row.ghinNumber || "—"}</td>
                      <td style={tdStyle}>{buildRowHint(row)}</td>
                      <td style={tdStyle}>{row.grossScore ?? "—"}</td>
                      <td style={tdStyle}>{formatNullableNumber(row.courseRating, 1)}</td>
                      <td style={tdStyle}>{row.slope ?? "—"}</td>
                      <td style={tdStyle}>{formatNullableNumber(row.differential, 3)}</td>
                      <td style={tdStyle}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={drafts[row.scoreHistoryEntryId] ?? ""}
                          onChange={(e) =>
                            updateDraft(row.scoreHistoryEntryId, e.target.value)
                          }
                          placeholder="Enter diff"
                          style={{ ...formInputStyle, minWidth: "110px" }}
                          disabled={savingRowId === -1 || isSaving}
                        />
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={primaryButtonStyle}
                          onClick={() => void handleSave(row)}
                          disabled={savingRowId === -1 || isSaving}
                        >
                          {isSaving ? "Saving..." : "Save Fix"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void handleSaveAll()}
                disabled={savingRowId != null || sortedRows.length === 0}
              >
                {savingRowId === -1 ? "Saving All..." : "Save All Fixes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}