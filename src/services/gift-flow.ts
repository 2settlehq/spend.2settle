import type { EnginePayment } from "./enginePaymentService";

export interface GiftPaymentTracking {
  reference: string;
  status: string;
  giftId: string | null;
  expiresAt?: string | null;
}

export function normalizeGiftId(value: unknown): string {
  const giftId = String(value ?? "").trim().toUpperCase();
  if (!/^2S-[A-Z0-9]{6}$/.test(giftId)) {
    throw new Error("Enter a valid gift ID, for example 2S-HKVT5E.");
  }
  return giftId;
}

export function getConfirmedGiftId(payment?: {
  status: string;
  giftId?: string | null;
}): string | null {
  if (payment?.status !== "confirmed" || !payment.giftId) return null;
  return payment.giftId;
}

export function buildGiftCreationResponse(payment: EnginePayment, crypto: string) {
  return {
    reply: `You are sending ${payment.cryptoAmount} ${crypto} and the recipient will receive ₦${payment.fiatAmount}.`,
    copyableItems: [
      ...(payment.depositAddress ? [{
        label: "Wallet Address",
        text: payment.depositAddress,
        isWallet: true,
        reference: payment.reference,
        paymentType: "gift",
        expiresAt: payment.expiresAt,
      }] : []),
      {
        label: "Transaction ID",
        text: payment.reference,
        reference: payment.reference,
        paymentType: "gift",
      },
    ],
    giftPayment: {
      reference: payment.reference,
      status: payment.status,
      giftId: getConfirmedGiftId(payment),
      expiresAt: payment.expiresAt,
    } satisfies GiftPaymentTracking,
  };
}
