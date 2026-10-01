import { type FocusEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTripDetail,
  getTripPlayers,
  getTripPrizeSchedules,
  recalculateTripPrizeWinnings,
  saveTripPrizeSchedules,
} from "../api/tripApi";
import {
  buttonStyle,
  errorBoxStyle,
  inputStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import TripDetailButton from "../components/common/TripDetailButton";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import { formatMoneyAmount } from "../utils/moneyFormat";
import type {
  PrizeRecalculationResponse,
  PrizeSchedule,
  SaveTripPrizeSchedulesRequest,
  TripDetail,
  TripPlayer,
} from "../types/trip";

type AmountInputMap = Record<string, string>;
type PlacesPaidInputMap = Record<string, string>;

function selectInputText(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function keepSelectedTextOnMouseUp(event: MouseEvent<HTMLInputElement>) {
  event.preventDefault();
}

const prizeCardStyle = {
  ...sectionStyle,
  marginBottom: 0,
  padding: "14px 16px 16px",
} as const;

const prizeCardTopGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 110px",
  gap: "12px",
  alignItems: "start",
  marginBottom: "10px",
} as const;

const prizeFieldLabelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#555",
  marginBottom: "5px",
  minHeight: "16px",
} as const;

const prizeMetaStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  minHeight: "22px",
  paddingTop: "2px",
  fontSize: "12px",
  color: "#777",
} as const;

function amountKey(gameKey: string, finishingPlace: number): string {
  return `${gameKey}:${finishingPlace}`;
}

function parseMoneyOrNull(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);

  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function sortPayouts(schedule: PrizeSchedule): PrizeSchedule {
  return {
    ...schedule,
    payouts: [...schedule.payouts].sort(
      (a, b) => a.finishingPlace - b.finishingPlace,
    ),
  };
}

function buildAmountInputs(schedules: PrizeSchedule[]): AmountInputMap {
  const nextInputs: AmountInputMap = {};

  schedules.forEach((schedule) => {
    schedule.payouts.forEach((payout) => {
      nextInputs[amountKey(schedule.gameKey, payout.finishingPlace)] =
        payout.amountPerPlayer == null ? "" : String(payout.amountPerPlayer);
    });
  });

  return nextInputs;
}

function getPayoutMultiplier(schedule: PrizeSchedule): number {
  if (schedule.resultScope !== "TEAM" || schedule.payoutUnit !== "PLAYER") {
    return 1;
  }

  const gameText = (schedule.gameKey + " " + schedule.gameName).toUpperCase();

  if (gameText.includes("2-MAN") || gameText.includes("TWO_MAN")) {
    return 2;
  }

  return 4;
}

function getScheduleDistributedTotal(
  schedule: PrizeSchedule,
  amountInputs: AmountInputMap,
): number {
  const perPlaceTotal = schedule.payouts.reduce((sum, payout) => {
    const inputValue =
      amountInputs[amountKey(schedule.gameKey, payout.finishingPlace)] ?? "";
    const amount = parseMoneyOrNull(inputValue);
    return sum + (amount ?? 0);
  }, 0);

  return perPlaceTotal * getPayoutMultiplier(schedule);
}

function buildPlacesPaidInputs(schedules: PrizeSchedule[]): PlacesPaidInputMap {
  const nextInputs: PlacesPaidInputMap = {};

  schedules.forEach((schedule) => {
    nextInputs[schedule.gameKey] = String(schedule.payouts.length);
  });

  return nextInputs;
}

function buildPrizeSnapshot(
  schedules: PrizeSchedule[],
  amountInputs: AmountInputMap,
  placesPaidInputs: PlacesPaidInputMap,
): string {
  const normalizedSchedules = schedules
    .map((schedule) => ({
      gameKey: schedule.gameKey,
      gameName: schedule.gameName ?? "",
      resultScope: schedule.resultScope,
      payoutUnit: schedule.payoutUnit,
      placesPaid: placesPaidInputs[schedule.gameKey] ?? "",
      payouts: [...schedule.payouts]
        .sort((a, b) => a.finishingPlace - b.finishingPlace)
        .map((payout) => ({
          finishingPlace: payout.finishingPlace,
          amount:
            amountInputs[amountKey(schedule.gameKey, payout.finishingPlace)] ??
            "",
        })),
    }))
    .sort((a, b) => a.gameKey.localeCompare(b.gameKey));

  return JSON.stringify(normalizedSchedules);
}

export default function TripPrizeSetupPage() {
  const { tripId } = useParams();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [players, setPlayers] = useState<TripPlayer[]>([]);
  const [schedules, setSchedules] = useState<PrizeSchedule[]>([]);
  const [amountInputs, setAmountInputs] = useState<AmountInputMap>({});
  const [placesPaidInputs, setPlacesPaidInputs] = useState<PlacesPaidInputMap>(
    {},
  );
  const [recalculationResult, setRecalculationResult] =
    useState<PrizeRecalculationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savedPrizeSnapshot, setSavedPrizeSnapshot] = useState<string>("");

  const numericTripId = useMemo(() => {
    if (!tripId) {
      return null;
    }

    const parsed = Number(tripId);
    return Number.isNaN(parsed) ? null : parsed;
  }, [tripId]);

  const activePlayerCount = useMemo(() => {
    return players.filter((player) => player.active !== false).length;
  }, [players]);

  const totalPrizeMoneyCollected = useMemo(() => {
    return (trip?.entryFee ?? 0) * activePlayerCount;
  }, [activePlayerCount, trip?.entryFee]);

  const totalPrizeMoneyDistributed = useMemo(() => {
    return schedules.reduce((sum, schedule) => {
      return sum + getScheduleDistributedTotal(schedule, amountInputs);
    }, 0);
  }, [amountInputs, schedules]);

  const prizeMoneyRemaining =
    totalPrizeMoneyCollected - totalPrizeMoneyDistributed;

  const rosterHasActivePlayers = activePlayerCount > 0;
  const showPrizeSetupAsPendingRoster =
    !rosterHasActivePlayers && totalPrizeMoneyDistributed > 0;

  const currentPrizeSnapshot = useMemo(() => {
    return buildPrizeSnapshot(schedules, amountInputs, placesPaidInputs);
  }, [amountInputs, placesPaidInputs, schedules]);

  const tripIsComplete = trip?.status === "COMPLETE";
  const correctionModeEnabled = trip?.correctionMode === true;
  const prizeSetupReadOnly = tripIsComplete && !correctionModeEnabled;

  const hasChanges =
    !prizeSetupReadOnly &&
    savedPrizeSnapshot !== "" &&
    currentPrizeSnapshot !== savedPrizeSnapshot;

  const confirmIfNeeded = useUnsavedChangesWarning(
    hasChanges && !saving,
    "You have unsaved prize setup changes. Leave without saving?",
  );

  useEffect(() => {
    async function load(): Promise<void> {
      if (numericTripId == null) {
        setError("Event id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setMessage(null);
        setRecalculationResult(null);

        const [tripResponse, playersResponse, scheduleResponse] =
          await Promise.all([
            getTripDetail(numericTripId),
            getTripPlayers(numericTripId),
            getTripPrizeSchedules(numericTripId),
          ]);

        const sortedSchedules = scheduleResponse.map(sortPayouts);

        setTrip(tripResponse);
        setPlayers(playersResponse);
        setSchedules(sortedSchedules);
        const nextPlacesPaidInputs = buildPlacesPaidInputs(sortedSchedules);
        const nextAmountInputs = buildAmountInputs(sortedSchedules);

        setPlacesPaidInputs(nextPlacesPaidInputs);
        setAmountInputs(nextAmountInputs);
        setSavedPrizeSnapshot(
          buildPrizeSnapshot(
            sortedSchedules,
            nextAmountInputs,
            nextPlacesPaidInputs,
          ),
        );
      } catch (err) {
        console.error("Failed to load prize setup", err);
        setError("Unable to load prize setup.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [numericTripId]);

  function updatePlacesPaid(
    scheduleIndex: number,
    placesPaidValue: string,
  ): void {
    const schedule = schedules[scheduleIndex];

    if (!schedule) {
      return;
    }

    setPlacesPaidInputs((current) => ({
      ...current,
      [schedule.gameKey]: placesPaidValue,
    }));

    if (placesPaidValue.trim() === "") {
      return;
    }

    const parsed = Number(placesPaidValue);

    if (Number.isNaN(parsed)) {
      return;
    }

    const placesPaid = Math.max(0, Math.min(50, Math.floor(parsed)));

    setSchedules((current) => {
      return current.map((currentSchedule, index) => {
        if (index !== scheduleIndex) {
          return currentSchedule;
        }

        const currentPayouts = [...currentSchedule.payouts].sort(
          (a, b) => a.finishingPlace - b.finishingPlace,
        );

        const nextPayouts = [];

        for (let place = 1; place <= placesPaid; place++) {
          const existing = currentPayouts.find(
            (payout) => payout.finishingPlace === place,
          );

          nextPayouts.push(
            existing ?? {
              payoutId: null,
              finishingPlace: place,
              amountPerPlayer: 0,
            },
          );
        }

        return {
          ...currentSchedule,
          payouts: nextPayouts,
        };
      });
    });

    setAmountInputs((current) => {
      const nextInputs: AmountInputMap = { ...current };

      for (let place = 1; place <= placesPaid; place++) {
        const key = amountKey(schedule.gameKey, place);

        if (nextInputs[key] == null) {
          nextInputs[key] = "";
        }
      }

      Object.keys(nextInputs).forEach((key) => {
        if (!key.startsWith(`${schedule.gameKey}:`)) {
          return;
        }

        const placeText = key.substring(schedule.gameKey.length + 1);
        const place = Number(placeText);

        if (!Number.isNaN(place) && place > placesPaid) {
          delete nextInputs[key];
        }
      });

      return nextInputs;
    });
  }

  function updatePayoutAmount(
    schedule: PrizeSchedule,
    finishingPlace: number,
    amountValue: string,
  ): void {
    setAmountInputs((current) => ({
      ...current,
      [amountKey(schedule.gameKey, finishingPlace)]: amountValue,
    }));
  }

  function isTournamentSchedule(schedule: PrizeSchedule): boolean {
    return (
      schedule.gameKey === "FOUR_DAY_INDIVIDUAL" ||
      schedule.gameKey === "TOURNAMENT_LOW_NET" ||
      schedule.gameKey === "TOURNAMENT_LOW_GROSS"
    );
  }

  function getScheduleNameLabel(schedule: PrizeSchedule): string {
    return isTournamentSchedule(schedule) ? "Competition Name" : "Prize Event";
  }

  function updateGameName(scheduleIndex: number, gameName: string): void {
    setSchedules((current) => {
      return current.map((schedule, index) => {
        if (index !== scheduleIndex) {
          return schedule;
        }

        return {
          ...schedule,
          gameName,
        };
      });
    });
  }

  async function handleSave(): Promise<void> {
    if (numericTripId == null) {
      return;
    }
    if (prizeSetupReadOnly) {
      setError(
        "Prize setup is locked after the event is complete. Enable Correction Mode from Event Detail to make prize updates.",
      );
      return;
    }

    const invalidEntries: string[] = [];

    const payload: SaveTripPrizeSchedulesRequest = {
      schedules: schedules.map((schedule) => {
        const payouts = schedule.payouts
          .map((payout) => {
            const inputValue =
              amountInputs[
                amountKey(schedule.gameKey, payout.finishingPlace)
              ] ?? "";

            const amount = parseMoneyOrNull(inputValue);

            if (inputValue.trim() !== "" && amount == null) {
              invalidEntries.push(
                `${schedule.gameName}, place ${payout.finishingPlace}`,
              );
            }

            if (amount == null) {
              return null;
            }

            return {
              finishingPlace: payout.finishingPlace,
              amountPerPlayer: amount,
            };
          })
          .filter(
            (
              payout,
            ): payout is { finishingPlace: number; amountPerPlayer: number } =>
              payout !== null,
          );

        return {
          gameKey: schedule.gameKey,
          gameName: schedule.gameName,
          resultScope: schedule.resultScope,
          payoutUnit: schedule.payoutUnit,
          payouts,
        };
      }),
    };

    if (invalidEntries.length > 0) {
      setError(
        `Fix invalid prize amounts before saving: ${invalidEntries.join("; ")}.`,
      );
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      setRecalculationResult(null);

      const saved = await saveTripPrizeSchedules(numericTripId, payload);
      const sortedSchedules = saved.map(sortPayouts);

      const nextAmountInputs = buildAmountInputs(sortedSchedules);
      const nextPlacesPaidInputs = buildPlacesPaidInputs(sortedSchedules);

      setSchedules(sortedSchedules);
      setAmountInputs(nextAmountInputs);
      setPlacesPaidInputs(nextPlacesPaidInputs);
      setSavedPrizeSnapshot(
        buildPrizeSnapshot(
          sortedSchedules,
          nextAmountInputs,
          nextPlacesPaidInputs,
        ),
      );
      setMessage("Prize money saved.");
    } catch (err) {
      console.error("Failed to save prize setup", err);
      setError("Unable to save prize money setup.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecalculate(): Promise<void> {
    if (numericTripId == null) {
      return;
    }
    if (prizeSetupReadOnly) {
      setError(
        "Prize winnings are locked after the event is complete. Enable Correction Mode from Event Detail to recalculate prize winnings.",
      );
      return;
    }

    try {
      setRecalculating(true);
      setError(null);
      setMessage(null);
      setRecalculationResult(null);

      const result = await recalculateTripPrizeWinnings(numericTripId);
      setRecalculationResult(result);
      setMessage("Prize winnings recalculated.");
    } catch (err) {
      console.error("Failed to recalculate prize winnings", err);
      setError(
        "Unable to recalculate prize winnings. Make sure all required rounds are finalized.",
      );
    } finally {
      setRecalculating(false);
    }
  }

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading prize setup...</div>;
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Prize Money Setup"
        subtitle={
          trip ? `${trip.tripName} • ${trip.tripYear}` : "Event prize schedules"
        }
        actions={
          <>
            <TripDetailButton
              tripId={numericTripId}
              onBeforeNavigate={confirmIfNeeded}
            />
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void handleRecalculate()}
              disabled={recalculating || prizeSetupReadOnly}
            >
              {recalculating
                ? "Recalculating..."
                : "Recalculate Prize Winnings"}
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void handleSave()}
              disabled={saving || prizeSetupReadOnly}
            >
              {saving
                ? "Saving..."
                : prizeSetupReadOnly
                  ? "Prize Setup Locked"
                  : "Save Prize Money"}
            </button>
          </>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {message ? <div style={successBoxStyle}>{message}</div> : null}
      {prizeSetupReadOnly ? (
        <div
          style={{
            ...warningBoxStyle,
            background: "#eef5ff",
            color: "#244a7c",
          }}
        >
          This trip is complete and locked. Prize setup is view-only unless
          Correction Mode is enabled from Event Detail.
        </div>
      ) : tripIsComplete && correctionModeEnabled ? (
        <div style={warningBoxStyle}>
          Correction Mode is enabled. Prize setup changes and prize
          recalculation are allowed for this completed trip.
        </div>
      ) : null}
      {hasChanges ? (
        <div
          style={{
            ...successBoxStyle,
            borderColor: "#f59e0b",
            background: "#fffbeb",
            color: "#92400e",
          }}
        >
          You have unsaved prize setup changes. Save before leaving this page.
        </div>
      ) : null}

      {recalculationResult ? (
        <div style={{ ...successBoxStyle, marginBottom: "16px" }}>
          Recalculated {recalculationResult.winnings?.length ?? 0} prize winning
          rows
          {recalculationResult.playerTotals
            ? ` across ${recalculationResult.playerTotals.length} players`
            : ""}
          .
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ ...sectionStyle, marginBottom: 0, padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
            Total Prize Money Collected
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>
            ${formatMoneyAmount(totalPrizeMoneyCollected)}
          </div>
          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            {activePlayerCount} players × $
            {formatMoneyAmount(trip?.entryFee ?? 0)} entry fee
          </div>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0, padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
            Total Prize Money Distributed
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>
            ${formatMoneyAmount(totalPrizeMoneyDistributed)}
          </div>
          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            Based on the current unsaved prize setup values
          </div>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0, padding: "12px" }}>
          <div style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
            Prize Money Remaining
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              marginTop: "4px",
              color:
                rosterHasActivePlayers && prizeMoneyRemaining < 0
                  ? "#b00020"
                  : "#111",
            }}
          >
            {showPrizeSetupAsPendingRoster
              ? "Pending roster"
              : `$${formatMoneyAmount(prizeMoneyRemaining)}`}
          </div>
          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
            {showPrizeSetupAsPendingRoster
              ? "Add active players to calculate remaining prize money"
              : "Collected minus distributed"}
          </div>
        </div>
      </div>

      {showPrizeSetupAsPendingRoster ? (
        <div style={{ ...warningBoxStyle, marginBottom: "16px" }}>
          Prize amounts are configured, but this event has no active players
          yet. The remaining balance will be calculated after players are added
          to the roster.
        </div>
      ) : null}

      <div style={{ fontSize: "14px", color: "#555", marginBottom: "16px" }}>
        Enter the number of places paid and the amount paid per guy for each
        prize event. Blank amount fields are not saved as $0.00.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {schedules.map((schedule, scheduleIndex) => {
          const totalListed = schedule.payouts.reduce((sum, payout) => {
            const inputValue =
              amountInputs[
                amountKey(schedule.gameKey, payout.finishingPlace)
              ] ?? "";
            const amount = parseMoneyOrNull(inputValue);
            return sum + (amount ?? 0);
          }, 0);
          const distributedTotal = getScheduleDistributedTotal(
            schedule,
            amountInputs,
          );
          const payoutMultiplier = getPayoutMultiplier(schedule);

          return (
            <div key={schedule.gameKey} style={prizeCardStyle}>
              <div style={prizeCardTopGridStyle}>
                <div>
                  <label style={prizeFieldLabelStyle}>
                    {getScheduleNameLabel(schedule)}
                  </label>
                  <input
                    type="text"
                    value={schedule.gameName}
                    onChange={(event) =>
                      updateGameName(scheduleIndex, event.target.value)
                    }
                    style={{ ...inputStyle, width: "100%" }}
                    disabled={prizeSetupReadOnly || saving}
                  />
                </div>

                <div>
                  <label style={prizeFieldLabelStyle}>Places</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={placesPaidInputs[schedule.gameKey] ?? ""}
                    onChange={(event) =>
                      updatePlacesPaid(scheduleIndex, event.target.value)
                    }
                    onFocus={selectInputText}
                    onMouseUp={keepSelectedTextOnMouseUp}
                    style={{ ...inputStyle, width: "100%", textAlign: "right" }}
                    disabled={prizeSetupReadOnly || saving}
                  />
                </div>
              </div>

              <div style={prizeMetaStyle}>
                <span>
                  {schedule.resultScope} • {schedule.payoutUnit}
                </span>
                {schedule.payouts.length > 0 ? (
                  <span>
                    Card total: ${formatMoneyAmount(distributedTotal)}
                  </span>
                ) : null}
              </div>

              {schedule.payouts.length === 0 ? (
                <div
                  style={{
                    borderTop: "1px solid #edf0f2",
                    color: "#777",
                    fontSize: "14px",
                    marginTop: "8px",
                    paddingTop: "10px",
                  }}
                >
                  No prize money configured for this event.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      columnGap: "16px",
                      rowGap: "4px",
                    }}
                  >
                    {schedule.payouts.map((payout) => {
                      const key = amountKey(
                        schedule.gameKey,
                        payout.finishingPlace,
                      );

                      return (
                        <div
                          key={payout.finishingPlace}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "46px minmax(0, 1fr)",
                            gap: "8px",
                            alignItems: "center",
                            borderBottom: "1px solid #eee",
                            padding: "4px 0",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {payout.finishingPlace}
                          </div>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={amountInputs[key] ?? ""}
                            onChange={(event) =>
                              updatePayoutAmount(
                                schedule,
                                payout.finishingPlace,
                                event.target.value,
                              )
                            }
                            onFocus={selectInputText}
                            onMouseUp={keepSelectedTextOnMouseUp}
                            style={{ ...inputStyle, height: "30px" }}
                            disabled={prizeSetupReadOnly || saving}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #d5d9de",
                      marginTop: "10px",
                      paddingTop: "8px",
                      fontWeight: 700,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Total listed</span>
                      <span>${formatMoneyAmount(totalListed)}</span>
                    </div>
                    {payoutMultiplier > 1 ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "4px",
                          color: "#555",
                          fontSize: "13px",
                        }}
                      >
                        <span>Distributed total</span>
                        <span>${formatMoneyAmount(distributedTotal)}</span>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
