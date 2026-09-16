import React from "react";
import { CopyableText } from "@/features/transact/CopyableText";
import { useGiftPaymentStatus } from "@/hooks/useGiftPaymentStatus";
import { getConfirmedGiftId, type GiftPaymentTracking } from "@/services/gift-flow";

export default function GiftCode({ payment }: { payment: GiftPaymentTracking }) {
  const fundedPayment = useGiftPaymentStatus(payment);
  const giftId = getConfirmedGiftId(fundedPayment);

  return (
    <div aria-live="polite" className="w-full text-xs leading-5">
      {giftId ? (
        <div className="relative pt-2">
          <span className="absolute left-2 top-0 bg-white px-1 text-[11px] font-medium leading-4 text-gray-700">Gift ID</span>
          <div className="rounded-md border border-input bg-white px-2.5 py-2 shadow-sm">
            <CopyableText text={giftId} label="Gift ID" embedded />
          </div>
          <p className="mt-1 text-gray-600">Share this gift ID with the recipient to claim their gift.</p>
        </div>
      ) : (
        <p className="text-gray-600">
          {["expired", "failed", "settlement_reversed"].includes(fundedPayment.status)
            ? "This gift payment was not completed. No shareable gift ID is available."
            : fundedPayment.status === "settled" || fundedPayment.status === "settling"
              ? "This gift has already been claimed."
              : fundedPayment.status === "confirming"
                ? "Your payment is confirming. Your gift ID will appear once funding is confirmed."
                : "Your gift ID will appear here after payment confirmation."}
        </p>
      )}
    </div>
  );
}
