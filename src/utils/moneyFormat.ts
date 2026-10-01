export function normalizeMoney(value: number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric;
}

export function truncateWholeDollars(value: number | null | undefined): number {
  return Math.trunc(normalizeMoney(value));
}

export function formatMoneyAmount(value: number | null | undefined, fractionDigits = 2): string {
  return normalizeMoney(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatCurrencyCents(value: number | null | undefined): string {
  return `$${formatMoneyAmount(value, 2)}`;
}

export function formatWholeDollarCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(truncateWholeDollars(value));
}
