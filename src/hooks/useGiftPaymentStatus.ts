import { useEffect } from "react";
import { getConfirmedGiftId, type GiftPaymentTracking } from "@/services/gift-flow";
import { useStatusStore, type PaymentLifecycleStatus } from "stores/statusStore";

const TERMINAL_STATUSES = ["expired", "failed", "settled", "settlement_reversed"];

export function useGiftPaymentStatus(payment: GiftPaymentTracking) {
  const { reference, status, giftId, expiresAt } = payment;
  const record = useStatusStore((state) => state.statusesByReference[reference]);
  const upsertStatus = useStatusStore((state) => state.upsertStatus);

  useEffect(() => {
    if (!reference) return;
    const existing = useStatusStore.getState().statusesByReference[reference];
    upsertStatus(existing ?? {
      reference,
      type: "gift",
      status: status as PaymentLifecycleStatus,
      giftId: getConfirmedGiftId({ status, giftId }),
      expiresAt,
    });

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    let requestTimeout: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      request = new AbortController();
      requestTimeout = setTimeout(() => request?.abort(), 16000);
      try {
        const response = await fetch(
          `/api/payments/status?reference=${encodeURIComponent(reference)}`,
          { signal: request.signal },
        );
        if (!response.ok || stopped) return;
        const data = await response.json();
        if (
          stopped || !data?.ok || data.payment?.reference !== reference ||
          data.payment?.type !== "gift" || typeof data.payment.status !== "string"
        ) return;

        upsertStatus({
          reference,
          type: "gift",
          status: data.payment.status,
          giftId: getConfirmedGiftId(data.payment),
          expiresAt: data.payment.expiresAt,
          confirmations: data.payment.confirmations,
          txHash: data.payment.txHash,
        });
        stopped = Boolean(getConfirmedGiftId(data.payment)) ||
          TERMINAL_STATUSES.includes(data.payment.status);
      } catch (error) {
        if (!stopped) console.error("Failed to fetch gift funding status:", error);
      } finally {
        clearTimeout(requestTimeout);
        // The deposit deadline is not a funding-confirmation deadline. A
        // detected transaction can still be confirming after the timer ends.
        if (!stopped) timer = setTimeout(() => void poll(), 10000);
      }
    };

    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(requestTimeout);
      request?.abort();
    };
  }, [reference, status, giftId, expiresAt, upsertStatus]);

  return record ?? payment;
}
