import { describe, expect, it } from "vitest";
import { buildGiftCreationResponse, getConfirmedGiftId, normalizeGiftId } from "@/services/gift-flow";
import type { EnginePayment } from "@/services/enginePaymentService";

describe("deferred gift IDs", () => {
  it.each(["pending", "confirming", "expired", "failed", "settled"])("does not release a code at %s", (status) => {
    expect(getConfirmedGiftId({ status, giftId: "2S-HKVT5E" })).toBeNull();
  });
  it("requires both confirmation and an issued gift ID", () => {
    expect(getConfirmedGiftId()).toBeNull();
    expect(getConfirmedGiftId({ status: "confirmed", giftId: null })).toBeNull();
    expect(getConfirmedGiftId({ status: "confirmed", giftId: "2S-HKVT5E" })).toBe("2S-HKVT5E");
  });
  it("normalizes sharing codes and rejects payment references", () => {
    expect(normalizeGiftId(" 2s-hkvt5e ")).toBe("2S-HKVT5E");
    expect(() => normalizeGiftId("GP-HKVT5E")).toThrow("valid gift ID");
    expect(() => normalizeGiftId(undefined)).toThrow("valid gift ID");
  });
  it("shows the payment reference as a copyable Transaction ID, not a Gift ID", () => {
    const payment: EnginePayment = { reference: "GP-HKVT5E", type: "gift", crypto: "BTC", network: "bitcoin", status: "pending", giftId: null, depositAddress: "wallet-address", cryptoAmount: 0.001, fiatAmount: 50000, expiresAt: "2026-09-14T12:00:00Z" };
    const result = buildGiftCreationResponse(payment, "BTC");
    expect(result.reply).not.toContain(payment.reference);
    expect(result.copyableItems).toHaveLength(2);
    expect(result.copyableItems[0]).toMatchObject({ label: "Wallet Address", text: "wallet-address", reference: payment.reference, paymentType: "gift" });
    expect(result.copyableItems[1]).toMatchObject({ label: "Transaction ID", text: payment.reference });
    expect(result.copyableItems.some((item) => item.label === "Gift ID")).toBe(false);
    expect(result.giftPayment).toMatchObject({ reference: payment.reference, giftId: null });
    expect(buildGiftCreationResponse({ ...payment, status: "confirming", giftId: "2S-HKVT5E" }, "BTC").giftPayment.giftId).toBeNull();
    expect(buildGiftCreationResponse({ ...payment, status: "confirmed", giftId: "2S-HKVT5E" }, "BTC").giftPayment.giftId).toBe("2S-HKVT5E");
  });
});
