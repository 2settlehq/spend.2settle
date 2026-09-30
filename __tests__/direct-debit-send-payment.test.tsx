import { beforeEach, describe, expect, it, vi } from "vitest";

// The chat store and displaySendPayment use JSX without importing React
vi.hoisted(() => {
  (globalThis as any).React = require("react");
});

import { displaySendPayment } from "@/features/chatbot/handlers/chatHandlers/menus/display.send.payment";
import useChatStore from "stores/chatStore";
import { usePaymentStore } from "stores/paymentStore";
import { useTransactionStore } from "stores/transactionStore";

const REFERENCE = "GP-ABC123";

function componentNames() {
  return useChatStore
    .getState()
    .messages.map((m: any) =>
      m.intent?.kind === "component"
        ? `${m.intent.name}:${m.intent.props?.label ?? ""}`
        : null,
    )
    .filter(Boolean);
}

function setUpPayment(transactionType: "gift" | "transfer") {
  useChatStore.setState({ messages: [] } as any);
  useChatStore.getState().next({ stepId: "sendPayment", transactionType });
  usePaymentStore.setState({
    paymentAssetEstimate: "20",
    paymentNairaEstimate: "30000",
    ticker: "USDT",
    network: "TRC20",
    activeWallet: "TDepositAddress",
    walletLastAssignedTime: new Date(Date.now() + 60_000).toISOString(),
  } as any);
  useTransactionStore.getState().setTransactionId(REFERENCE);
}

describe("displaySendPayment after a direct wallet debit", () => {
  beforeEach(() => setUpPayment("gift"));

  it("shows the gift ID tracker, not a deposit address or countdown", async () => {
    await displaySendPayment({ txHash: "0xhash" });

    const names = componentNames();
    expect(names).toContain("GiftCode:");
    expect(names).toContain("CopyableText:Transaction Hash");
    expect(names).not.toContain("CopyableText:Wallet Address");
    expect(names.some((n) => n?.startsWith("CountdownTimer"))).toBe(false);

    const giftCode = useChatStore
      .getState()
      .messages.find((m: any) => m.intent?.name === "GiftCode") as any;
    expect(giftCode.intent.props.payment.reference).toBe(REFERENCE);
  });

  it("tracks transfer settlement with a status-only timer", async () => {
    setUpPayment("transfer");
    await displaySendPayment({ txHash: "0xhash" });

    const timer = useChatStore
      .getState()
      .messages.find((m: any) => m.intent?.name === "CountdownTimer") as any;
    expect(timer.intent.props).toMatchObject({
      reference: REFERENCE,
      statusOnly: true,
      pollStatus: true,
    });
    expect(componentNames()).not.toContain("GiftCode:");
  });
});
