import type { RateLimits } from "@/services/rate/getLimits";

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;

  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

export function formatAmountLimit(value: number, unit: string): string {
  const normalizedUnit = unit.toUpperCase();

  if (normalizedUnit === "NGN" || normalizedUnit === "USD") {
    return new Intl.NumberFormat(
      normalizedUnit === "NGN" ? "en-NG" : "en-US",
      {
        style: "currency",
        currency: normalizedUnit,
        minimumFractionDigits: 2,
        maximumFractionDigits: normalizedUnit === "USD" ? 8 : 2,
      },
    ).format(value);
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 18,
  }).format(value)} ${normalizedUnit}`;
}

export function getAmountLimitError(
  value: string,
  limits: RateLimits | null,
): string {
  const amount = parseAmount(value);
  if (amount === null || !limits) return "";

  if (amount < limits.min) {
    return `Minimum amount is ${formatAmountLimit(limits.min, limits.unit)}.`;
  }

  if (amount > limits.max) {
    return `Maximum amount is ${formatAmountLimit(limits.max, limits.unit)}.`;
  }

  return "";
}
