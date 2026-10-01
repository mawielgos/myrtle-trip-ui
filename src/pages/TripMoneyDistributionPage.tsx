import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTripBillInventory, getTripDetail, getTripPrizeWinnings, saveTripBillInventory } from "../api/tripApi";
import type { PrizePlayerTotalResponse, TripBillInventory, TripDetail } from "../types/trip";
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

const DENOMINATIONS = [100, 50, 20, 10, 5, 1] as const;
type Denomination = (typeof DENOMINATIONS)[number];
type BillCounts = Record<Denomination, number>;
type BillCountInputs = Record<Denomination, string>;

type PayoutRow = {
  playerId: number | null;
  playerName: string;
  amount: number;
  bills: BillCounts | null;
};

type DistributionResult = {
  rows: PayoutRow[];
  remainingBills: BillCounts;
  totalCash: number;
  totalPayout: number;
  status: "good" | "cash_short" | "needs_more_bills";
};

const emptyBillCounts: BillCounts = {
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  1: 0,
};

const defaultBillCounts: BillCounts = {
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  1: 0,
};

function cleanWholeDollar(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(value);
}

function sumBills(bills: BillCounts): number {
  let total = 0;
  for (const denomination of DENOMINATIONS) {
    total += denomination * bills[denomination];
  }
  return total;
}

function sumBillCount(bills: BillCounts): number {
  let total = 0;
  for (const denomination of DENOMINATIONS) {
    total += bills[denomination];
  }
  return total;
}

function copyBills(bills: BillCounts): BillCounts {
  return {
    100: bills[100],
    50: bills[50],
    20: bills[20],
    10: bills[10],
    5: bills[5],
    1: bills[1],
  };
}

function billCountsFromInventory(inventory: TripBillInventory): BillCounts {
  return {
    100: inventory.hundredsCount ?? 0,
    50: inventory.fiftiesCount ?? 0,
    20: inventory.twentiesCount ?? 0,
    10: inventory.tensCount ?? 0,
    5: inventory.fivesCount ?? 0,
    1: inventory.onesCount ?? 0,
  };
}

function billInventoryPayloadFromCounts(billCounts: BillCounts) {
  return {
    hundredsCount: billCounts[100],
    fiftiesCount: billCounts[50],
    twentiesCount: billCounts[20],
    tensCount: billCounts[10],
    fivesCount: billCounts[5],
    onesCount: billCounts[1],
  };
}

function billInputsFromCounts(counts: BillCounts): BillCountInputs {
  return {
    100: String(counts[100]),
    50: String(counts[50]),
    20: String(counts[20]),
    10: String(counts[10]),
    5: String(counts[5]),
    1: String(counts[1]),
  };
}

function billCountsFromInputs(inputs: BillCountInputs): BillCounts {
  return {
    100: parseCount(inputs[100]),
    50: parseCount(inputs[50]),
    20: parseCount(inputs[20]),
    10: parseCount(inputs[10]),
    5: parseCount(inputs[5]),
    1: parseCount(inputs[1]),
  };
}



function billUsageScore(bills: BillCounts): number {
  // Prefer larger bills and fewer bills for readability.
  return (
    bills[100] * 1_000_000 +
    bills[50] * 100_000 +
    bills[20] * 10_000 +
    bills[10] * 1_000 +
    bills[5] * 100 -
    bills[1] * 20 -
    sumBillCount(bills)
  );
}

function shortageValue(bills: BillCounts, available: BillCounts): number {
  let total = 0;
  for (const denomination of DENOMINATIONS) {
    const shortageCount = Math.max(0, bills[denomination] - available[denomination]);
    total += denomination * shortageCount;
  }
  return total;
}

function shortageCount(bills: BillCounts, available: BillCounts): number {
  let total = 0;
  for (const denomination of DENOMINATIONS) {
    total += Math.max(0, bills[denomination] - available[denomination]);
  }
  return total;
}

function billPlanScore(bills: BillCounts, available: BillCounts): number {
  // First minimize the dollar shortage, then minimize the number of missing bills,
  // then prefer readable larger-bill combinations.  This lets the preview continue
  // below zero so the Remaining Bills row tells the user exactly what to get.
  return (
    -shortageValue(bills, available) * 1_000_000_000 -
    shortageCount(bills, available) * 1_000_000 +
    billUsageScore(bills)
  );
}

function chooseBillsForAmount(amount: number, available: BillCounts): BillCounts {
  if (amount <= 0) {
    return copyBills(emptyBillCounts);
  }

  type Candidate = {
    bills: BillCounts;
    score: number;
  };

  const bestByAmount: Array<Candidate | null> = Array.from({ length: amount + 1 }, () => null);
  bestByAmount[0] = {
    bills: copyBills(emptyBillCounts),
    score: 0,
  };

  for (const denomination of DENOMINATIONS) {
    const previous = bestByAmount.map((candidate) =>
      candidate
        ? {
            bills: copyBills(candidate.bills),
            score: candidate.score,
          }
        : null
    );

    for (let currentAmount = 0; currentAmount <= amount; currentAmount += 1) {
      const base = previous[currentAmount];
      if (!base) {
        continue;
      }

      const maxCount = Math.floor((amount - currentAmount) / denomination);

      for (let count = 1; count <= maxCount; count += 1) {
        const nextAmount = currentAmount + count * denomination;
        const nextBills = copyBills(base.bills);
        nextBills[denomination] = count;
        const nextScore = billPlanScore(nextBills, available);
        const existing = bestByAmount[nextAmount];

        if (!existing || nextScore > existing.score) {
          bestByAmount[nextAmount] = {
            bills: nextBills,
            score: nextScore,
          };
        }
      }
    }
  }

  return bestByAmount[amount]?.bills ?? copyBills(emptyBillCounts);
}

function subtractBills(available: BillCounts, use: BillCounts): BillCounts {
  const result = copyBills(available);
  for (const denomination of DENOMINATIONS) {
    result[denomination] -= use[denomination];
  }
  return result;
}

function distributeBills(players: PrizePlayerTotalResponse[], availableBills: BillCounts): DistributionResult {
  const rows = players
    .map((player) => ({
      playerId: player.playerId ?? null,
      playerName: player.playerName,
      amount: cleanWholeDollar(player.totalAmount),
      bills: null as BillCounts | null,
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => {
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return a.playerName.localeCompare(b.playerName, undefined, { sensitivity: "base" });
    });

  const totalCash = sumBills(availableBills);
  const totalPayout = rows.reduce((sum, row) => sum + row.amount, 0);

  let remainingBills = copyBills(availableBills);

  for (const row of rows) {
    const chosenBills = chooseBillsForAmount(row.amount, remainingBills);
    row.bills = chosenBills;
    remainingBills = subtractBills(remainingBills, chosenBills);
  }

  const hasBillShortage = DENOMINATIONS.some((denomination) => remainingBills[denomination] < 0);

  return {
    rows,
    remainingBills,
    totalCash,
    totalPayout,
    status: totalCash < totalPayout ? "cash_short" : hasBillShortage ? "needs_more_bills" : "good",
  };
}

function parseCount(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.trunc(parsed);
}

function selectBillInputValue(event: React.FocusEvent<HTMLInputElement>): void {
  event.currentTarget.select();
}

function preserveBillInputSelection(event: React.MouseEvent<HTMLInputElement>): void {
  event.preventDefault();
}

export default function TripMoneyDistributionPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const numericTripId = Number(tripId);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [playerTotals, setPlayerTotals] = useState<PrizePlayerTotalResponse[]>([]);
  const [billCountInputs, setBillCountInputs] = useState<BillCountInputs>(() => billInputsFromCounts(defaultBillCounts));
  const [savedBillCountInputs, setSavedBillCountInputs] = useState<BillCountInputs>(() => billInputsFromCounts(defaultBillCounts));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
        setError("Invalid event id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [tripResult, winningsResult, inventoryResult] = await Promise.all([
          getTripDetail(numericTripId),
          getTripPrizeWinnings(numericTripId),
          getTripBillInventory(numericTripId),
        ]);

        if (!cancelled) {
          setTrip(tripResult);
          setPlayerTotals(winningsResult.playerTotals ?? []);
          const loadedInputs = billInputsFromCounts(billCountsFromInventory(inventoryResult));
          setBillCountInputs(loadedInputs);
          setSavedBillCountInputs(loadedInputs);
          setDirty(false);
          setSaveMessage(null);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Unable to load money distribution data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [numericTripId]);

  const billCounts = useMemo(() => {
    return billCountsFromInputs(billCountInputs);
  }, [billCountInputs]);

  const distribution = useMemo(() => {
    return distributeBills(playerTotals, billCounts);
  }, [billCounts, playerTotals]);

  function updateBillCount(denomination: Denomination, value: string): void {
    const cleanedValue = value.replace(/[^0-9]/g, "");

    setBillCountInputs((current) => ({
      ...current,
      [denomination]: cleanedValue,
    }));
    setDirty(true);
    setSaveMessage(null);
  }

  function reloadSavedCounts(): void {
    setBillCountInputs(savedBillCountInputs);
    setDirty(false);
    setSaveMessage(null);
  }

  function clearCounts(): void {
    setBillCountInputs(billInputsFromCounts(emptyBillCounts));
    setDirty(true);
    setSaveMessage(null);
  }

  async function saveBillCountsForTrip(): Promise<void> {
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setError("Invalid event id.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const savedInventory = await saveTripBillInventory(
        numericTripId,
        billInventoryPayloadFromCounts(billCounts)
      );
      const savedInputs = billInputsFromCounts(billCountsFromInventory(savedInventory));
      setBillCountInputs(savedInputs);
      setSavedBillCountInputs(savedInputs);
      setDirty(false);
      setSaveMessage("Bill counts saved for this event.");
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save bill counts.");
    } finally {
      setSaving(false);
    }
  }

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
