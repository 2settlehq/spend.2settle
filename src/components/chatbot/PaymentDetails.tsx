"use client";

import React, { type ReactNode } from "react";
import { CopyableText } from "@/features/transact/CopyableText";
import { CountdownTimer } from "@/helpers/format_date";
import GiftCode from "./GiftCode";
import type { GiftPaymentTracking } from "@/services/gift-flow";

export interface PaymentDetailItem {
  label: string;
  text: string;
  isWallet?: boolean;
  reference?: string;
  paymentType?: string;
  expiresAt?: string | null;
}

interface PaymentDetailsProps {
  summary?: string;
  items?: PaymentDetailItem[];
  expiryTime?: Date | string | number;
  walletReference?: string;
  giftPayment?: GiftPaymentTracking;
}

const FIELD_LABEL_CLASS =
  "absolute left-2 top-0 z-10 bg-white px-1 text-[11px] font-medium leading-4 text-gray-700";

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pt-2">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <div className="min-h-10 rounded-md border border-input bg-white px-2.5 py-2 text-xs leading-5 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export default function PaymentDetails({
  summary,
  items = [],
  expiryTime,
  walletReference,
  giftPayment,
}: PaymentDetailsProps) {
  const giftWallet = items.find((item) => item.isWallet && item.paymentType === "gift" && item.reference);
  const trackedGift = giftPayment ?? (giftWallet?.reference ? {
    reference: giftWallet.reference,
    status: "pending",
    giftId: null,
    expiresAt: giftWallet.expiresAt,
  } : undefined);
  // Older persisted gift replies may still have labelled their tracking
  // reference as a Gift ID. Show that reference as a Transaction ID instead;
  // only the live confirmation widget may show an actual Gift ID.
  const visibleItems = trackedGift
    ? [
        ...items.filter((item) => !["gift id", "transaction id"].includes(item.label.toLowerCase())),
        { label: "Transaction ID", text: trackedGift.reference },
      ]
    : items;
  return (
    <section
      aria-label="Payment details"
      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm"
    >
      <div className="grid gap-2.5">
        {summary && (
          <DetailField label="Transfer summary">
            <p className="text-gray-900">{summary}</p>
          </DetailField>
        )}

        {visibleItems.map((item) => (
          <DetailField key={`${item.label}:${item.text}`} label={item.label}>
            <CopyableText
              text={item.text}
              label={item.label}
              isWallet={item.isWallet}
              reference={item.reference}
              paymentType={item.paymentType}
              lastAssignedTime={item.expiresAt ?? undefined}
              embedded
            />
          </DetailField>
        ))}

        {expiryTime && (
          <DetailField label="Payment timer">
            <CountdownTimer
              expiryTime={expiryTime}
              reference={walletReference}
              pollStatus={!trackedGift}
            />
          </DetailField>
        )}
        {trackedGift && <GiftCode payment={trackedGift} />}
      </div>
    </section>
  );
}
