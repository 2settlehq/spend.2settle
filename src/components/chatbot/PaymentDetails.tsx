"use client";

import React, { type ReactNode, useState } from "react";
import { Check, Copy } from "lucide-react";
import ConnectWallet from "@/components/crypto/ConnectWallet";
import { Button } from "@/components/ui/button";
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
  // Paid by direct wallet debit: show live payment status instead of a countdown
  statusOnly?: boolean;
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
  statusOnly = false,
}: PaymentDetailsProps) {
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "copy" | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);
  const walletItem = items.find((item) => item.isWallet);
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
  const nonWalletItems = visibleItems.filter((item) => !item.isWallet);

  const copyWalletAddress = async () => {
    if (!walletItem?.text) return;

    setPaymentMethod("copy");
    await navigator.clipboard.writeText(walletItem.text);
    setWalletCopied(true);
    window.setTimeout(() => setWalletCopied(false), 3000);
  };

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

        {walletItem && (
          <DetailField label="Choose payment option">
            <div className="space-y-2.5">
              <p className="text-xs text-gray-600">
                {paymentMethod === "wallet"
                  ? "Wallet connection selected."
                  : paymentMethod === "copy"
                    ? "Deposit wallet address selected."
                    : "Would you like to connect your wallet or copy the deposit wallet address?"}
              </p>
              <div className={paymentMethod ? "flex items-center gap-2" : "grid grid-cols-2 gap-2"}>
                {paymentMethod !== "copy" && (
                  <ConnectWallet
                    onOpenChange={(open) => {
                      if (open) setPaymentMethod("wallet");
                    }}
                  />
                )}
                {paymentMethod !== "wallet" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyWalletAddress()}
                    aria-label="Copy deposit wallet address"
                    className="h-9 rounded-full border-blue-200 px-2 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    {walletCopied ? (
                      <>
                        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Copy address
                      </>
                    )}
                  </Button>
                )}
                {paymentMethod && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPaymentMethod(null);
                      setWalletCopied(false);
                    }}
                    className="h-8 px-2 text-[11px] text-gray-500"
                  >
                    Change method
                  </Button>
                )}
              </div>
            </div>
          </DetailField>
        )}

        {paymentMethod === "copy" && walletItem && (
          <DetailField label={walletItem.label}>
            <CopyableText
              text={walletItem.text}
              label={walletItem.label}
              isWallet={walletItem.isWallet}
              reference={walletItem.reference}
              paymentType={walletItem.paymentType}
              lastAssignedTime={walletItem.expiresAt ?? undefined}
              embedded
            />
          </DetailField>
        )}

        {nonWalletItems.map((item) => (
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
          <DetailField label={statusOnly ? "Payment status" : "Payment timer"}>
            <CountdownTimer
              expiryTime={expiryTime}
              reference={walletReference}
              pollStatus={!trackedGift}
              statusOnly={statusOnly}
            />
          </DetailField>
        )}
        {trackedGift && <GiftCode payment={trackedGift} />}
      </div>
    </section>
  );
}
