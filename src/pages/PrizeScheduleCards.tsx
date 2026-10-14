import { type FocusEvent, type MouseEvent } from "react";
import { inputStyle, sectionStyle } from "../styles/uiStyles";
import { formatMoneyAmount } from "../utils/moneyFormat";
import { amountKey, getPayoutMultiplier, getScheduleDistributedTotal, getScheduleNameLabel, parseMoneyOrNull } from "./tripPrizeSetupLogic";
import type { useTripPrizeSetupController } from "./useTripPrizeSetupController";

type PrizeSetupState = ReturnType<typeof useTripPrizeSetupController>;
type Props = Pick<PrizeSetupState, "schedules" | "amountInputs" | "placesPaidInputs" | "prizeSetupReadOnly" | "saving" | "updateGameName" | "updatePlacesPaid" | "updatePayoutAmount">;

function selectInputText(event: FocusEvent<HTMLInputElement>) { event.currentTarget.select(); }
function keepSelectedTextOnMouseUp(event: MouseEvent<HTMLInputElement>) { event.preventDefault(); }

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

export default function PrizeScheduleCards({ schedules, amountInputs, placesPaidInputs, prizeSetupReadOnly, saving, updateGameName, updatePlacesPaid, updatePayoutAmount }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(430px, 1fr))", gap: "16px", alignItems: "start" }}>
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
  );
}
