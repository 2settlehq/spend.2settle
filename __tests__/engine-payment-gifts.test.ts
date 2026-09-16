import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api-client";
import { claimGift, createEnginePayment, fulfillRequest } from "@/services/enginePaymentService";

vi.mock("@/services/api-client", () => ({ default: { post: vi.fn() } }));
describe("engine payment service compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { payment: { reference: "GP-HKVT5E", giftId: null } } });
  });
  it("creates a gift without generating or saving a claim ID", async () => {
    const payment = await createEnginePayment({ type: "gift", crypto: "BTC", network: "btc", fiatAmount: 50000, payer: { chatId: "chat-user" } });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith("/api/payments", { type: "gift", crypto: "BTC", network: "bitcoin", fiatAmount: 50000, fiatCurrency: "NGN", payer: { chatId: "chat-user" } }, { timeout: 45000 });
    expect(payment.giftId).toBeNull();
  });
  it("claims with the sharing code, never the funding reference", async () => {
    const receiver = { bankCode: "100004", accountNumber: "7035194443" };
    await claimGift("2s-hkvt5e", receiver);
    expect(api.post).toHaveBeenCalledWith("/api/payments/gifts/2S-HKVT5E/claim", receiver);
    await expect(claimGift("GP-HKVT5E", receiver)).rejects.toThrow("valid gift ID");
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("preserves transfer fields, network mapping, and receiver", async () => {
    const receiver = { bankCode: "100004", accountNumber: "7035194443" };
    await createEnginePayment({ type: "transfer", crypto: "USDT", network: "trc20", cryptoAmount: 50, receiver });
    expect(api.post).toHaveBeenCalledWith("/api/payments", { type: "transfer", crypto: "USDT", network: "trc20", cryptoAmount: 50, fiatCurrency: "NGN", receiver }, { timeout: 45000 });
  });
  it("preserves request creation and fulfillment references", async () => {
    const receiver = { bankCode: "100004", accountNumber: "7035194443", phone: "+2348000000000" };
    await createEnginePayment({ type: "request", fiatAmount: 50000, receiver });
    expect(api.post).toHaveBeenCalledWith("/api/payments", { type: "request", fiatCurrency: "NGN", fiatAmount: 50000, receiver }, { timeout: 45000 });
    const payer = { chatId: "chat-user" };
    await fulfillRequest("2S-ORIGIN", { crypto: "TRON", network: "trx", payer });
    expect(api.post).toHaveBeenLastCalledWith("/api/payments/requests/2S-ORIGIN/fulfill", { crypto: "TRX", network: "tron", payer });
  });
});
