import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getTripDetail,
  getTripTournamentSetup,
  saveTripTournamentSetup,
} from "../api/tripApi";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import {
  buttonStyle,
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
import type { TripTournamentRound, TripTournamentSetup } from "../types/trip";
import { formatGameLabel } from "../components/trip/tripDetailUtils";
import { formatRoundDateShort } from "../utils/roundDisplay";

const DEFAULT_TOURNAMENT_NAME = "Multi-Round Tournament";
const DEFAULT_STANDINGS_LABEL = "Tournament Standings";
const DEFAULT_LOW_NET_NAME = "2-Round Low Net";
const DEFAULT_LOW_GROSS_NAME = "2-Round Low Gross";

type TournamentSetupDraft = {
  enabled: boolean;
  tournamentName: string;
  standingsLabel: string;
  lowNetEnabled: boolean;
  lowGrossEnabled: boolean;
  lowNetName: string;
  lowGrossName: string;
  includedPlannedRoundIds: number[];
};

function buildDraft(setup: TripTournamentSetup): TournamentSetupDraft {
  return {
    enabled: setup.enabled === true,
    tournamentName: setup.name?.trim() || DEFAULT_TOURNAMENT_NAME,
    standingsLabel: setup.standingsLabel?.trim() || DEFAULT_STANDINGS_LABEL,
    lowNetEnabled: setup.lowNetEnabled !== false,
    lowGrossEnabled: setup.lowGrossEnabled === true,
    lowNetName: setup.lowNetName?.trim() || DEFAULT_LOW_NET_NAME,
    lowGrossName: setup.lowGrossName?.trim() || DEFAULT_LOW_GROSS_NAME,
    includedPlannedRoundIds: setup.rounds
      .filter((round) => round.included === true && round.plannedRoundId != null)
      .map((round) => round.plannedRoundId),
  };
}

function buildSnapshot(draft: TournamentSetupDraft): string {
  return JSON.stringify({
    enabled: draft.enabled,
    tournamentName: draft.tournamentName.trim(),
    standingsLabel: draft.standingsLabel.trim(),
    lowNetEnabled: draft.lowNetEnabled,
    lowGrossEnabled: draft.lowGrossEnabled,
    lowNetName: draft.lowNetName.trim(),
    lowGrossName: draft.lowGrossName.trim(),
    includedPlannedRoundIds: [...draft.includedPlannedRoundIds].sort((a, b) => a - b),
  });
}

function isIncluded(draft: TournamentSetupDraft, plannedRoundId: number): boolean {
  return draft.includedPlannedRoundIds.includes(plannedRoundId);
}

export default function TripTournamentSetupPage() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const [tripName, setTripName] = useState<string>("");
  const [tripStatus, setTripStatus] = useState<string>("PLANNING");
  const [setup, setSetup] = useState<TripTournamentSetup | null>(null);
  const [draft, setDraft] = useState<TournamentSetupDraft>({
    enabled: false,
    tournamentName: DEFAULT_TOURNAMENT_NAME,
    standingsLabel: DEFAULT_STANDINGS_LABEL,
    lowNetEnabled: true,
    lowGrossEnabled: false,
    lowNetName: DEFAULT_LOW_NET_NAME,
    lowGrossName: DEFAULT_LOW_GROSS_NAME,
    includedPlannedRoundIds: [],
  });
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sortedRounds = useMemo(
    () => [...(setup?.rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber),
    [setup],
  );

  const configuredRounds = useMemo(
    () => sortedRounds.filter((round) => round.configured === true),
    [sortedRounds],
  );

  const configuredRoundCount = configuredRounds.length;
  const tournamentSetupAvailable = configuredRoundCount >= 2;
  const includedCount = draft.enabled ? draft.includedPlannedRoundIds.length : 0;
  const isReadOnly = setup?.readOnly === true;
  const currentSnapshot = useMemo(() => buildSnapshot(draft), [draft]);
  const hasChanges = !loading && !isReadOnly && initialSnapshot.length > 0 && currentSnapshot !== initialSnapshot;
  const confirmIfNeeded = useUnsavedChangesWarning(hasChanges && !saving);

  useEffect(() => {
    if (!numericTripId || Number.isNaN(numericTripId)) {
      setError("Invalid event id.");
      setLoading(false);
      return;
    }

    void loadPage();
  }, [numericTripId]);

  async function loadPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const [trip, tournamentSetup] = await Promise.all([
        getTripDetail(numericTripId),
        getTripTournamentSetup(numericTripId),
      ]);

      const nextDraft = buildDraft(tournamentSetup);
      setTripName(trip.tripName ?? "");
      setTripStatus(trip.status ?? "PLANNING");
      setSetup(tournamentSetup);
      setDraft(nextDraft);
      setInitialSnapshot(buildSnapshot(nextDraft));
    } catch (err) {
      console.error("Failed to load tournament setup", err);
      setError("Unable to load tournament setup.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(patch: Partial<TournamentSetupDraft>): void {
    if (isReadOnly) {
      return;
    }

    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
    setError(null);
  }

  function handleEnabledChange(enabled: boolean): void {
    if (isReadOnly) {
      return;
    }

    setDraft((current) => ({
      ...current,
      enabled,
      lowNetEnabled: enabled ? current.lowNetEnabled : true,
      lowGrossEnabled: enabled ? current.lowGrossEnabled : false,
      includedPlannedRoundIds: enabled ? current.includedPlannedRoundIds : [],
    }));
    setMessage(null);
    setError(null);
  }

  function toggleRound(round: TripTournamentRound, checked: boolean): void {
    if (isReadOnly || !draft.enabled || round.plannedRoundId == null) {
      return;
    }

    setDraft((current) => {
      const nextIds = new Set(current.includedPlannedRoundIds);
      if (checked) {
        nextIds.add(round.plannedRoundId);
      } else {
        nextIds.delete(round.plannedRoundId);
      }
      return { ...current, includedPlannedRoundIds: Array.from(nextIds) };
    });
    setMessage(null);
    setError(null);
  }

  function selectAllConfiguredRounds(): void {
    if (isReadOnly || !draft.enabled) {
      return;
    }

    setDraft((current) => ({
      ...current,
      includedPlannedRoundIds: configuredRounds
        .filter((round) => round.plannedRoundId != null)
        .map((round) => round.plannedRoundId),
    }));
  }

  function clearIncludedRounds(): void {
    if (isReadOnly || !draft.enabled) {
      return;
    }

    setDraft((current) => ({ ...current, includedPlannedRoundIds: [] }));
  }

  function validate(): string | null {
    if (!tournamentSetupAvailable && draft.enabled) {
      return "Configure at least two non-scramble planned rounds before setting up a multi-round tournament.";
    }

    if (!draft.enabled) {
      return null;
    }

    if (!draft.tournamentName.trim()) {
      return "Tournament name is required.";
    }

    if (!draft.standingsLabel.trim()) {
      return "Standings label is required.";
    }

    if (draft.lowNetEnabled && !draft.lowNetName.trim()) {
      return "Low Net competition name is required.";
    }

    if (draft.lowGrossEnabled && !draft.lowGrossName.trim()) {
      return "Low Gross competition name is required.";
    }

    if (!draft.lowNetEnabled && !draft.lowGrossEnabled) {
      return "Select at least one tournament competition: Low Net, Low Gross, or both.";
    }

    if (includedCount < 2) {
      return "A multi-round tournament needs at least two included rounds.";
    }

    return null;
  }

  async function handleSave(): Promise<void> {
    if (isReadOnly) {
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedSetup = await saveTripTournamentSetup(numericTripId, {
        enabled: draft.enabled,
        name: draft.tournamentName.trim() || DEFAULT_TOURNAMENT_NAME,
        standingsLabel: draft.standingsLabel.trim() || DEFAULT_STANDINGS_LABEL,
        lowNetEnabled: draft.enabled ? draft.lowNetEnabled : true,
        lowGrossEnabled: draft.enabled ? draft.lowGrossEnabled : false,
        lowNetName: draft.lowNetName.trim() || DEFAULT_LOW_NET_NAME,
        lowGrossName: draft.lowGrossName.trim() || DEFAULT_LOW_GROSS_NAME,
        includedPlannedRoundIds: draft.enabled ? draft.includedPlannedRoundIds : [],
      });

      const nextDraft = buildDraft(savedSetup);
      setSetup(savedSetup);
      setDraft(nextDraft);
      setInitialSnapshot(buildSnapshot(nextDraft));
      setMessage(tripStatus === "IN_PROGRESS"
        ? "Tournament setup saved. Review tournament standings and recalculate prize winnings if payouts were already calculated."
        : "Tournament setup saved.");
    } catch (err: any) {
      console.error("Failed to save tournament setup", err);
      const apiMessage =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (typeof err?.response?.data === "string" ? err.response.data : null);
      setError(apiMessage || "Unable to save tournament setup.");
      setMessage(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={pageContainerMediumStyle}>Loading tournament setup...</div>;
  }

  return (
    <div style={pageContainerMediumStyle}>
      <PageHeader
        title="Multi-Round Tournament Setup"
        subtitle={tripName ? `${tripName} • ${tripStatus}` : undefined}
        actions={
          <>
            <TripDetailButton tripId={numericTripId} onBeforeNavigate={confirmIfNeeded} />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                void confirmIfNeeded().then((confirmed) => {
                  if (confirmed) {
                    navigate(`/trips/${numericTripId}/planned-rounds`);
                  }
                });
              }}
            >
              Round Planning
            </button>
            {!isReadOnly ? (
              <button type="button" style={primaryButtonStyle} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Tournament Setup"}
              </button>
            ) : null}
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}

      {isReadOnly ? (
        <div style={{ ...warningBoxStyle, background: "#eef5ff", color: "#244a7c" }}>
          This event is complete and locked. Tournament setup is view-only unless Correction Mode is enabled.
        </div>
      ) : null}

      {!isReadOnly && tripStatus === "IN_PROGRESS" ? (
        <div style={{ ...warningBoxStyle, background: "#fff8e6", color: "#7a4b00" }}>
          This event has already started. You can still correct the tournament setup, such as adding a missed planned round.
          Existing finalized round scores will be reflected in tournament standings. If prize winnings were already calculated, recalculate payouts after saving.
        </div>
      ) : null}

      <div style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Tournament Basics</h2>

        <label style={{ display: "flex", gap: "8px", alignItems: "center", fontWeight: 700, marginBottom: "16px" }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            disabled={isReadOnly || saving}
          />
          This event has a multi-round tournament
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Tournament Name
            <input
              type="text"
              value={draft.tournamentName}
              onChange={(e) => updateDraft({ tournamentName: e.target.value })}
              style={formInputStyle}
              disabled={isReadOnly || saving || !draft.enabled}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
            Standings Label
            <input
              type="text"
              value={draft.standingsLabel}
              onChange={(e) => updateDraft({ standingsLabel: e.target.value })}
              style={formInputStyle}
              disabled={isReadOnly || saving || !draft.enabled}
            />
          </label>
        </div>


        <div style={{ marginTop: "16px" }}>
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>Tournament Competitions</div>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(240px, 1fr)", gap: "8px 12px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={draft.lowNetEnabled}
                onChange={(e) => updateDraft({ lowNetEnabled: e.target.checked })}
                disabled={isReadOnly || saving || !draft.enabled}
                aria-label="Enable Low Net tournament competition"
              />
              <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
                Low Net Competition Name
                <input
                  type="text"
                  value={draft.lowNetName}
                  onChange={(e) => updateDraft({ lowNetName: e.target.value })}
                  style={formInputStyle}
                  disabled={isReadOnly || saving || !draft.enabled || !draft.lowNetEnabled}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(240px, 1fr)", gap: "8px 12px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={draft.lowGrossEnabled}
                onChange={(e) => updateDraft({ lowGrossEnabled: e.target.checked })}
                disabled={isReadOnly || saving || !draft.enabled}
                aria-label="Enable Low Gross tournament competition"
              />
              <label style={{ display: "grid", gap: "6px", fontWeight: 700 }}>
                Low Gross Competition Name
                <input
                  type="text"
                  value={draft.lowGrossName}
                  onChange={(e) => updateDraft({ lowGrossName: e.target.value })}
                  style={formInputStyle}
                  disabled={isReadOnly || saving || !draft.enabled || !draft.lowGrossEnabled}
                />
              </label>
            </div>
          </div>
        </div>

        <div style={{ color: "#666", fontSize: "13px", marginTop: "10px" }}>
          Tournament Name is the optional umbrella title. Prize Setup, Results, standings, and exports use the enabled competition names for actual scoring and payouts.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Included Rounds</h2>
            <div style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
              {includedCount} of {configuredRoundCount} configured non-scramble rounds included.
            </div>
          </div>

          {!isReadOnly && draft.enabled ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" style={buttonStyle} onClick={selectAllConfiguredRounds} disabled={saving}>
                Include Configured Rounds
              </button>
              <button type="button" style={buttonStyle} onClick={clearIncludedRounds} disabled={saving}>
                Clear Included Rounds
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Include</th>
                <th style={thStyle}>Round</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Game</th>
                <th style={thStyle}>Course</th>
              </tr>
            </thead>
            <tbody>
              {sortedRounds.map((round) => {
                const disabled =
                  isReadOnly ||
                  saving ||
                  !draft.enabled ||
                  round.configured !== true;

                return (
                  <tr key={round.plannedRoundId ?? round.roundNumber}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={draft.enabled && round.plannedRoundId != null && isIncluded(draft, round.plannedRoundId)}
                        onChange={(e) => toggleRound(round, e.target.checked)}
                        disabled={disabled}
                      />
                    </td>
                    <td style={tdStyle}>Round {round.roundNumber}</td>
                    <td style={tdStyle}>{formatRoundDateShort(round.roundDate)}</td>
                    <td style={tdStyle}>{formatGameLabel(round.format)}</td>
                    <td style={tdStyle}>{round.courseName || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly ? (
        <div style={{ ...sectionStyle, display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" style={buttonStyle} onClick={() => navigate(`/trips/${numericTripId}`)} disabled={saving}>
            Cancel
          </button>
          <button type="button" style={primaryButtonStyle} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Tournament Setup"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
