"use client";

import React, { type ReactNode, useState } from "react";
import { Check, Copy, Loader2, XCircle } from "lucide-react";
import ConnectWallet from "@/components/crypto/ConnectWallet";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/features/transact/CopyableText";
import { CountdownTimer } from "@/helpers/format_date";
import GiftCode from "./GiftCode";
import type { GiftPaymentTracking } from "@/services/gift-flow";
import { cancelEnginePayment } from "@/services/enginePaymentService";
import { useStatusStore } from "stores/statusStore";

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
  paymentReference?: string;
  cancelToken?: string;
  giftPayment?: GiftPaymentTracking;
  // Paid by direct wallet debit: show live payment status instead of a countdown
  statusOnly?: boolean;
  preferredPaymentMethod?: "wallet" | "copy";
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
  paymentReference,
  cancelToken,
  giftPayment,
  statusOnly = false,
  preferredPaymentMethod,
}: PaymentDetailsProps) {
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "copy" | null>(
    preferredPaymentMethod ?? null,
  );
  const [walletCopied, setWalletCopied] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState("");
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
  const reference = paymentReference ?? walletReference ?? walletItem?.reference;
  const trackedStatus = useStatusStore((state) =>
    reference ? state.statusesByReference[reference]?.status : undefined,
  );
  const patchStatus = useStatusStore((state) => state.patchStatus);
  const canCancel = Boolean(
    cancelToken &&
      reference &&
      !statusOnly &&
      !cancelled &&
      (!trackedStatus || ["created", "pending"].includes(trackedStatus)),
  );

  const copyWalletAddress = async () => {
    if (!walletItem?.text) return;

    setPaymentMethod("copy");
    await navigator.clipboard.writeText(walletItem.text);
    setWalletCopied(true);
    window.setTimeout(() => setWalletCopied(false), 3000);
  };

  const cancelTransaction = async () => {
    if (!reference || !cancelToken || isCancelling) return;

    setIsCancelling(true);
    setCancelError("");
    try {
      await cancelEnginePayment(reference, cancelToken);
      patchStatus(reference, { status: "expired" });
      setCancelled(true);
      setShowCancelConfirmation(false);
    } catch (error) {
      console.error("Failed to cancel payment:", error);
      setCancelError(
        "This transaction could not be cancelled. It may already be processing.",
      );
    } finally {
      setIsCancelling(false);
    }
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

        {walletItem && !preferredPaymentMethod && (
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

        {expiryTime && !cancelled && (
          <DetailField label={statusOnly ? "Payment status" : "Payment timer"}>
            <CountdownTimer
              expiryTime={expiryTime}
              reference={walletReference}
              pollStatus={!trackedGift}
              statusOnly={statusOnly}
            />
          </DetailField>
        )}
        {cancelled && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
          >
            <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
            Transaction cancelled. You can start a new transaction now.
          </div>
        )}
        {canCancel && (
          <div className="border-t border-gray-100 pt-2.5">
            {showCancelConfirmation ? (
              <div
                role="alertdialog"
                aria-label="Confirm transaction cancellation"
                className="rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <div className="flex items-start gap-2">
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      Cancel this transaction?
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-gray-600">
                      Only cancel if you have not sent the crypto payment.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isCancelling}
                    onClick={() => {
                      setShowCancelConfirmation(false);
                      setCancelError("");
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    Keep waiting
                  </Button>
                  <Button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => void cancelTransaction()}
                    className="h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2
                          className="mr-1.5 h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                        Cancelling…
                      </>
                    ) : (
                      "Yes, cancel transaction"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCancelConfirmation(true);
                  setCancelError("");
                }}
                className="h-9 w-full border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Cancel transaction
              </Button>
            )}
            {cancelError && (
              <p role="alert" className="mt-2 text-[11px] text-red-600">
                {cancelError}
              </p>
            )}
          </div>
        )}
        {trackedGift && <GiftCode payment={trackedGift} />}
      </div>
    </section>
  );
}
