import { describe, expect, it } from "vitest";
import {
  looksLikeTransferRequest,
  routePartialTransactionInputToForm,
} from "@/services/ai/transaction-form-routing";

describe("partial transaction form routing", () => {
  it("recognizes spend language as a transfer request", () => {
    expect(looksLikeTransferRequest("I want to spend")).toBe(true);
    expect(looksLikeTransferRequest("I want to send a gift")).toBe(false);
  });

  it("opens a transfer form when USDT is entered during an old flow", () => {
    expect(
      routePartialTransactionInputToForm(
        { crypto: "USDT" },
        { type: "transfer", nextField: "crypto" },
      ),
    ).toMatchObject({
      type: "transfer",
      crypto: "USDT",
      transferFormMode: true,
    });
  });

  it("starts a transfer form when a field is entered without a session", () => {
    expect(routePartialTransactionInputToForm({ estimation: "naira" })).toMatchObject({
      type: "transfer",
      estimation: "naira",
      transferFormMode: true,
    });
  });

  it("infers USDT when the user enters a USDT network", () => {
    expect(
      routePartialTransactionInputToForm(
        { network: "TRC20" },
        { type: "transfer" },
      ),
    ).toMatchObject({
      crypto: "USDT",
      network: "TRC20",
      transferFormMode: true,
    });
  });

  it("opens the matching form for existing gift and request sessions", () => {
    expect(
      routePartialTransactionInputToForm(
        { amount: undefined, Amount: "5000" },
        { type: "gift" },
      ),
    ).toMatchObject({ giftFormMode: true });

    expect(
      routePartialTransactionInputToForm(
        { crypto: "BTC" },
        { type: "request", requestFulfillment: true },
      ),
    ).toMatchObject({ fulfillRequestFormMode: true });
  });

  it("does not open a form for unrelated conversation", () => {
    expect(
      routePartialTransactionInputToForm(
        { description: "How are you?" },
        { type: "transfer" },
      ),
    ).toEqual({ description: "How are you?" });
  });
});
