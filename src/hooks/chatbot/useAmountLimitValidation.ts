import { useEffect, useMemo, useState } from "react";
import {
  getLimits,
  getRequestLimits,
  type RateLimits,
} from "@/services/rate/getLimits";
import { getAmountLimitError } from "@/services/rate/amountValidation";

interface AmountLimitValidationOptions {
  amount: string;
  crypto?: string;
  estimation?: string;
  request?: boolean;
}

interface LoadedLimits {
  key: string;
  limits: RateLimits;
}

export function useAmountLimitValidation({
  amount,
  crypto = "",
  estimation = "",
  request = false,
}: AmountLimitValidationOptions): string {
  const validationKey = request ? "request:NGN" : `${crypto}:${estimation}`;
  const [loadedLimits, setLoadedLimits] = useState<LoadedLimits | null>(null);

  useEffect(() => {
    if (!request && (!crypto || !estimation)) return;

    let cancelled = false;
    const loadLimits = request
      ? getRequestLimits()
      : getLimits(crypto, estimation);

    loadLimits
      .then((limits) => {
        if (!cancelled) setLoadedLimits({ key: validationKey, limits });
      })
      .catch((error) => {
        // Submission still performs the authoritative validation. Avoid
        // showing a misleading range while the limits service is unavailable.
        console.error("Unable to load amount limits:", error);
        if (!cancelled) setLoadedLimits(null);
      });

    return () => {
      cancelled = true;
    };
  }, [crypto, estimation, request, validationKey]);

  const limits =
    loadedLimits?.key === validationKey ? loadedLimits.limits : null;

  return useMemo(
    () => getAmountLimitError(amount, limits),
    [amount, limits],
  );
}
