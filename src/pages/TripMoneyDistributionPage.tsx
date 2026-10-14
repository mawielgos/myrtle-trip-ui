import { useParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import ReportsButton from "../components/common/ReportsButton";
import TripDetailButton from "../components/common/TripDetailButton";
import {
  appTableCellStyle,
  appTableHeaderCellStyle,
  appTableNumericCellStyle,
  appTableStyle,
  buttonStyle,
  compactInputStyle,
  errorBoxStyle,
  pageContainerWideStyle,
  sectionStyle,
  successBoxStyle,
  warningBoxStyle,
} from "../styles/uiStyles";
import { formatWholeDollarCurrency } from "../utils/moneyFormat";
import { useTripMoneyDistributionController } from "./useTripMoneyDistributionController";
import {
  DENOMINATIONS,
  sumBills,
} from "./tripMoneyDistributionLogic";


function selectBillInputValue(event: React.FocusEvent<HTMLInputElement>): void {
  event.currentTarget.select();
}

function preserveBillInputSelection(event: React.MouseEvent<HTMLInputElement>): void {
  event.preventDefault();
}

export default function TripMoneyDistributionPage() {
  const { tripId } = useParams();
  const numericTripId = Number(tripId);

  const {
    trip, billCountInputs, loading, saving, dirty, error, saveMessage,
    distribution, updateBillCount, reloadSavedCounts, clearCounts, saveBillCountsForTrip,
  } = useTripMoneyDistributionController(numericTripId);

  if (loading) {
    return <div style={pageContainerWideStyle}>Loading money distribution...</div>;
  }

  if (error || !trip) {
    return (
      <div style={pageContainerWideStyle}>
        <div style={errorBoxStyle}>{error ?? "Event not found."}</div>
        <TripDetailButton tripId={numericTripId} />
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title="Money Distribution"
        subtitle={`${trip.tripName} • Assign available bills to whole-dollar player payouts`}
        actions={
          <>
            <TripDetailButton tripId={trip.tripId} />
            <ReportsButton tripId={trip.tripId} />
          </>
        }
      />

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Available Bills</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...appTableStyle, minWidth: "720px" }}>
            <thead>
              <tr>
                {DENOMINATIONS.map((denomination) => (
                  <th key={denomination} style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>
                    {formatWholeDollarCurrency(denomination)}
                  </th>
                ))}
                <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Cash Total</th>
                <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Payout Total</th>
                <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {DENOMINATIONS.map((denomination) => (
                  <td key={denomination} style={appTableNumericCellStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={billCountInputs[denomination]}
                      onFocus={selectBillInputValue}
                      onMouseUp={preserveBillInputSelection}
                      onChange={(event) => updateBillCount(denomination, event.target.value)}
                      style={{ ...compactInputStyle, width: "78px", textAlign: "right" }}
                    />
                  </td>
                ))}
                <td style={{ ...appTableNumericCellStyle, fontWeight: 700 }}>
                  {formatWholeDollarCurrency(distribution.totalCash)}
                </td>
                <td style={{ ...appTableNumericCellStyle, fontWeight: 700 }}>
                  {formatWholeDollarCurrency(distribution.totalPayout)}
                </td>
                <td style={{ ...appTableNumericCellStyle, fontWeight: 700 }}>
                  {formatWholeDollarCurrency(distribution.totalCash - distribution.totalPayout)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={saveBillCountsForTrip}
            disabled={saving || !dirty}
          >
            {saving ? "Saving..." : dirty ? "Save Bill Counts" : "Bill Counts Saved"}
          </button>
          <button type="button" style={buttonStyle} onClick={reloadSavedCounts} disabled={!dirty}>
            Reload Saved Counts
          </button>
          <button type="button" style={buttonStyle} onClick={clearCounts}>
            Clear Counts
          </button>
        </div>

        {saveMessage && (
          <div style={{ ...successBoxStyle, marginTop: "12px" }}>{saveMessage}</div>
        )}
        {dirty && !saveMessage && (
          <div style={{ ...warningBoxStyle, marginTop: "12px" }}>
            Bill counts have changed. Save them to persist this event-level bill inventory.
          </div>
        )}
      </section>

      {distribution.status === "good" && (
        <div style={successBoxStyle}>Good — every player payout can be made exactly with the available bills.</div>
      )}
      {distribution.status === "cash_short" && (
        <div style={errorBoxStyle}>Cash short — available cash is less than the total whole-dollar payout amount.</div>
      )}
      {distribution.status === "needs_more_bills" && (
        <div style={warningBoxStyle}>
          Exact payout preview: negative values in Remaining Bills show how many additional bills are needed for this bill mix.
        </div>
      )}

      <section style={{ ...sectionStyle, overflowX: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Player Bill Assignments</h2>
        <table style={{ ...appTableStyle, minWidth: "860px" }}>
          <thead>
            <tr>
              <th style={appTableHeaderCellStyle}>Player</th>
              <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Payout</th>
              {DENOMINATIONS.map((denomination) => (
                <th key={denomination} style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>
                  {formatWholeDollarCurrency(denomination)}
                </th>
              ))}
              <th style={{ ...appTableHeaderCellStyle, textAlign: "right" }}>Assigned Total</th>
              <th style={appTableHeaderCellStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {distribution.rows.length === 0 ? (
              <tr>
                <td style={appTableCellStyle} colSpan={DENOMINATIONS.length + 4}>
                  No player payouts are available yet.
                </td>
              </tr>
            ) : (
              distribution.rows.map((row) => {
                const assignedTotal = row.bills ? sumBills(row.bills) : 0;
                const rowGood = row.bills != null && assignedTotal === row.amount;

                return (
                  <tr key={`${row.playerId ?? row.playerName}-${row.amount}`}>
                    <td style={{ ...appTableCellStyle, fontWeight: 600 }}>{row.playerName}</td>
                    <td style={{ ...appTableNumericCellStyle, fontWeight: 700 }}>{formatWholeDollarCurrency(row.amount)}</td>
                    {DENOMINATIONS.map((denomination) => (
                      <td key={denomination} style={appTableNumericCellStyle}>
                        {row.bills?.[denomination] ? row.bills[denomination] : ""}
                      </td>
                    ))}
                    <td style={appTableNumericCellStyle}>{row.bills ? formatWholeDollarCurrency(assignedTotal) : ""}</td>
                    <td style={appTableCellStyle}>{rowGood ? "Good" : "Review"}</td>
                  </tr>
                );
              })
            )}
            <tr>
              <td style={{ ...appTableCellStyle, fontWeight: 700 }}>Remaining Bills</td>
              <td style={appTableNumericCellStyle} />
              {DENOMINATIONS.map((denomination) => {
                const remainingCount = distribution.remainingBills[denomination];
                return (
                  <td
                    key={denomination}
                    style={{
                      ...appTableNumericCellStyle,
                      fontWeight: 700,
                      color: remainingCount < 0 ? "#b91c1c" : undefined,
                    }}
                  >
                    {remainingCount === 0 ? "0" : remainingCount}
                  </td>
                );
              })}
              <td style={{ ...appTableNumericCellStyle, fontWeight: 700 }}>
                {formatWholeDollarCurrency(sumBills(distribution.remainingBills))}
              </td>
              <td style={appTableCellStyle}>{distribution.status === "good" ? "Good" : distribution.status === "needs_more_bills" ? "Need bills" : "Review"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
