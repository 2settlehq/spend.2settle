import { beforeEach, describe, expect, it, vi } from "vitest";

// The chat store and handlers use JSX without importing React
vi.hoisted(() => {
  (globalThis as any).React = require("react");
});

const submitTransferForm = vi.fn();
vi.mock("@/services/ai/ai-services", () => ({
  submitTransferForm: (...args: any[]) => submitTransferForm(...args),
}));

import { handleTransferFormSubmission } from "@/features/chatbot/handlers/chatHandlers/handle.ai.chat";
import type { WalletDebit } from "@/hooks/chatbot/useFormWalletDebit";
import useChatStore from "stores/chatStore";

const REPLY = {
  reply: "You are sending 0.02045 BNB and you will be receiving ₦20000.",
  copyableItems: [
    { label: "Wallet Address", text: "0xdb28deposit7520", isWallet: true, reference: "2S-7WSKCG", paymentType: "transfer", expiresAt: "2026-09-30T12:00:00.000Z" },
    { label: "Transaction ID", text: "2S-7WSKCG", reference: "2S-7WSKCG", paymentType: "transfer" },
  ],
  payment: {
    reference: "2S-7WSKCG",
    depositAddress: "0xdb28deposit7520",
    cryptoAmount: 0.02045,
    expiresAt: "2026-09-30T12:00:00.000Z",
  },
};

const lastMessage = () => useChatStore.getState().messages.at(-1) as any;

describe("transfer form payment with a connected wallet", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [] } as any);
    submitTransferForm.mockResolvedValue(REPLY);
  });

  it("debits the wallet to the deposit address and shows the debit, not the address", async () => {
    const debit = vi.fn().mockResolvedValue("0xtxhash");
    const walletDebit: WalletDebit = { network: "bnb", asset: "BNB", debit };

    await handleTransferFormSubmission({} as any, walletDebit);

    expect(debit).toHaveBeenCalledWith(REPLY.payment);
    const props = lastMessage().intent.props;
    expect(props.summary).toBe("0.02045 BNB has been debited from your BNB wallet.");
    expect(props.items).toEqual([
      { label: "Transaction Hash", text: "0xtxhash" },
      { label: "Transaction ID", text: "2S-7WSKCG" },
    ]);
    expect(props).toMatchObject({ statusOnly: true, walletReference: "2S-7WSKCG" });
  });

  it("reports a failed debit without showing an address", async () => {
    const walletDebit: WalletDebit = {
      network: "bnb",
      asset: "BNB",
      debit: vi.fn().mockRejectedValue(new Error("User rejected the request")),
    };

    await handleTransferFormSubmission({} as any, walletDebit);

    const message = lastMessage();
    expect(message.intent).toBeUndefined();
    expect(JSON.stringify(message.content.props.children)).toContain("User rejected the request");
  });

  it("shows the deposit address and timer when no wallet can pay", async () => {
    await handleTransferFormSubmission({} as any, undefined, "copy");

    const props = lastMessage().intent.props;
    expect(props.items.some((item: any) => item.isWallet)).toBe(true);
    expect(props.statusOnly).toBeUndefined();
    expect(props.preferredPaymentMethod).toBe("copy");
  });
});
