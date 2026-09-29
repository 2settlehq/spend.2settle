import { beforeEach, describe, expect, it, vi } from "vitest";
import { createManualPayment } from "@/services/enginePaymentService";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/services/api-client", () => ({
  default: { post: mocks.post },
}));

describe("manual payment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post.mockResolvedValue({
      data: { success: true, transferId: 42, reference: "2S-MANUAL" },
    });
  });

  it("maps every form detail to the backend transfer record", async () => {
    await createManualPayment({
      estimation: "dollar",
      amount: 100,
      receiverAmount: 165000,
      crypto: "TRX",
      network: "TRC20",
      cryptoSent: 500,
      charge: 1000,
      currentRate: 1650,
      merchantRate: 1675,
      profitRate: 25,
      walletAddress: "TManualWalletAddress",
      transactionDate: "2026-09-22T10:00:00.000Z",
      payer: { phone: "2348012345678" },
      receiver: {
        bankCode: "999992",
        bankName: "OPAY",
        accountNumber: "0123456789",
        accountName: "TEST USER",
      },
    });

    expect(mocks.post).toHaveBeenCalledWith(
      "/api/transfer/save",
      expect.objectContaining({
        crypto: "TRX",
        network: "trc20",
        estimate_asset: "dollar",
        estimate_amount: "100",
        amount_payable: "165000",
        crypto_amount: "500",
        charges: "1000",
        date: "2026-09-22T10:00:00.000Z",
        current_rate: "1650",
        merchant_rate: "1675",
        profit_rate: "25",
        wallet_address: "TManualWalletAddress",
        receiver: {
          acct_number: "0123456789",
          bank_code: "999992",
          bank_name: "OPAY",
          receiver_name: "TEST USER",
        },
        summary: expect.objectContaining({
          total_dollar: "100",
          total_naira: "165000",
          status: "Successful",
        }),
      }),
    );
  });
});
