import type { PrizePlayerTotalResponse, TripBillInventory } from "../types/trip";

export const DENOMINATIONS = [100, 50, 20, 10, 5, 1] as const;
export type Denomination = (typeof DENOMINATIONS)[number];
export type BillCounts = Record<Denomination, number>;
export type BillCountInputs = Record<Denomination, string>;

export type PayoutRow = {
  playerId: number | null;
  playerName: string;
  amount: number;
  bills: BillCounts | null;
};

export type DistributionResult = {
  rows: PayoutRow[];
  remainingBills: BillCounts;
  totalCash: number;
  totalPayout: number;
  status: "good" | "cash_short" | "needs_more_bills";
};

export const emptyBillCounts: BillCounts = {
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  1: 0,
};

export const defaultBillCounts: BillCounts = {
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

export function sumBills(bills: BillCounts): number {
  let total = 0;
  for (const denomination of DENOMINATIONS) {
    total += denomination * bills[denomination];
  }
  return total;
}

export function sumBillCount(bills: BillCounts): number {
  let total = 0;
  for (const denomination of DENOMINATIONS) {
    total += bills[denomination];
  }
  return total;
}

export function copyBills(bills: BillCounts): BillCounts {
  return {
    100: bills[100],
    50: bills[50],
    20: bills[20],
    10: bills[10],
    5: bills[5],
    1: bills[1],
  };
}

export function billCountsFromInventory(inventory: TripBillInventory): BillCounts {
  return {
    100: inventory.hundredsCount ?? 0,
    50: inventory.fiftiesCount ?? 0,
    20: inventory.twentiesCount ?? 0,
    10: inventory.tensCount ?? 0,
    5: inventory.fivesCount ?? 0,
    1: inventory.onesCount ?? 0,
  };
}

export function billInventoryPayloadFromCounts(billCounts: BillCounts) {
  return {
    hundredsCount: billCounts[100],
    fiftiesCount: billCounts[50],
    twentiesCount: billCounts[20],
    tensCount: billCounts[10],
    fivesCount: billCounts[5],
    onesCount: billCounts[1],
  };
}

export function billInputsFromCounts(counts: BillCounts): BillCountInputs {
  return {
    100: String(counts[100]),
    50: String(counts[50]),
    20: String(counts[20]),
    10: String(counts[10]),
    5: String(counts[5]),
    1: String(counts[1]),
  };
}

export function billCountsFromInputs(inputs: BillCountInputs): BillCounts {
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

export function distributeBills(players: PrizePlayerTotalResponse[], availableBills: BillCounts): DistributionResult {
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

