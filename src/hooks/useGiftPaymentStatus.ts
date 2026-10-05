import { useEffect } from "react";
import { getConfirmedGiftId, type GiftPaymentTracking } from "@/services/gift-flow";
import { useStatusStore, type PaymentLifecycleStatus } from "stores/statusStore";

// Polling happens app-wide (PaymentStatusBootstrap), which keeps going past the
// deposit deadline until funding is confirmed with a gift ID or the payment
// ends. This only registers the gift so it is tracked after this unmounts.
export function useGiftPaymentStatus(payment: GiftPaymentTracking) {
  const { reference, status, giftId, expiresAt } = payment;
  const record = useStatusStore((state) => state.statusesByReference[reference]);
  const trackStatus = useStatusStore((state) => state.trackStatus);

  useEffect(() => {
    if (!reference) return;
    trackStatus({
      reference,
      type: "gift",
      status: status as PaymentLifecycleStatus,
      giftId: getConfirmedGiftId({ status, giftId }),
      expiresAt,
    });
  }, [reference, status, giftId, expiresAt, trackStatus]);

  return record ?? payment;
}
