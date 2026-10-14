import type { PrizeSchedule, SaveTripPrizeSchedulesRequest } from "../types/trip";

export type AmountInputMap = Record<string, string>;
export type PlacesPaidInputMap = Record<string, string>;

export function amountKey(gameKey: string, finishingPlace: number): string {
  return `${gameKey}:${finishingPlace}`;
}

export function parseMoneyOrNull(value: string): number | null {
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

export function sortPayouts(schedule: PrizeSchedule): PrizeSchedule {
  return {
    ...schedule,
    payouts: [...schedule.payouts].sort(
      (a, b) => a.finishingPlace - b.finishingPlace,
    ),
  };
}

export function buildAmountInputs(schedules: PrizeSchedule[]): AmountInputMap {
  const nextInputs: AmountInputMap = {};

  schedules.forEach((schedule) => {
    schedule.payouts.forEach((payout) => {
      nextInputs[amountKey(schedule.gameKey, payout.finishingPlace)] =
        payout.amountPerPlayer == null ? "" : String(payout.amountPerPlayer);
    });
  });

  return nextInputs;
}

export function getPayoutMultiplier(schedule: PrizeSchedule): number {
  if (schedule.resultScope !== "TEAM" || schedule.payoutUnit !== "PLAYER") {
    return 1;
  }

  const gameText = (schedule.gameKey + " " + schedule.gameName).toUpperCase();

  if (gameText.includes("2-MAN") || gameText.includes("TWO_MAN")) {
    return 2;
  }

  return 4;
}

export function getScheduleDistributedTotal(
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

export function buildPlacesPaidInputs(schedules: PrizeSchedule[]): PlacesPaidInputMap {
  const nextInputs: PlacesPaidInputMap = {};

  schedules.forEach((schedule) => {
    nextInputs[schedule.gameKey] = String(schedule.payouts.length);
  });

  return nextInputs;
}

export function buildPrizeSnapshot(
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

export function isTournamentSchedule(schedule: PrizeSchedule): boolean {
  return (
    schedule.gameKey === "FOUR_DAY_INDIVIDUAL" ||
    schedule.gameKey === "TOURNAMENT_LOW_NET" ||
    schedule.gameKey === "TOURNAMENT_LOW_GROSS"
  );
}

export function getScheduleNameLabel(schedule: PrizeSchedule): string {
  return isTournamentSchedule(schedule) ? "Competition Name" : "Prize Event";
}


export function buildPrizeSavePayload(
  schedules: PrizeSchedule[],
  amountInputs: AmountInputMap,
): { payload: SaveTripPrizeSchedulesRequest; invalidEntries: string[] } {
  const invalidEntries: string[] = [];
  const payload: SaveTripPrizeSchedulesRequest = {
    schedules: schedules.map((schedule) => {
      const payouts = schedule.payouts
        .map((payout) => {
          const inputValue = amountInputs[amountKey(schedule.gameKey, payout.finishingPlace)] ?? "";
          const amount = parseMoneyOrNull(inputValue);
          if (inputValue.trim() !== "" && amount == null) {
            invalidEntries.push(`${schedule.gameName}, place ${payout.finishingPlace}`);
          }
          return amount == null ? null : { finishingPlace: payout.finishingPlace, amountPerPlayer: amount };
        })
        .filter((payout): payout is { finishingPlace: number; amountPerPlayer: number } => payout !== null);
      return {
        gameKey: schedule.gameKey, gameName: schedule.gameName,
        resultScope: schedule.resultScope, payoutUnit: schedule.payoutUnit, payouts,
      };
    }),
  };
  return { payload, invalidEntries };
}
