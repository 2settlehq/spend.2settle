import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GiftForm,
  RequestPaymentForm,
} from "@/components/chatbot/WorkflowForms";
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_POLICY_VERSION,
} from "@/components/chatbot/PrivacyConsentGate";

vi.hoisted(() => {
  (globalThis as any).React = require("react");
});

const handlers = vi.hoisted(() => ({
  gift: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@/features/chatbot/handlers/chatHandlers/handle.ai.chat", () => ({
  handleGiftFormSubmission: handlers.gift,
  handleRequestPaymentFormSubmission: handlers.request,
  handleClaimGiftFormSubmission: vi.fn(),
  handleFulfillRequestFormSubmission: vi.fn(),
  handleReportFormSubmission: vi.fn(),
}));

vi.mock("@/hooks/wallet/useSupportedAssets", () => ({
  useSupportedAssets: () => ({
    walletName: null,
    isAssetSupported: () => true,
    isUsdtNetworkSupported: () => true,
  }),
}));

vi.mock("@/hooks/chatbot/useFormWalletDebit", () => ({
  useFormWalletDebit: () => () => undefined,
}));

vi.mock("@/components/crypto/ConnectWallet", () => ({
  default: () => <button type="button">Connect Wallet</button>,
}));

vi.mock("@/components/manualTransactionForm/bank-details-inputs", () => ({
  BankDetailsInputs: ({
    onBankSelect,
    onAccountNumberChange,
    onAccountNameChange,
  }: any) => (
    <button
      type="button"
      onClick={() => {
        onBankSelect("OPAY", "100004");
        onAccountNumberChange("7035194443");
        onAccountNameChange("OLAWALE SANUSI");
      }}
    >
      Fill bank details
    </button>
  ),
}));

beforeEach(() => {
  handlers.gift.mockReset().mockResolvedValue(true);
  handlers.request.mockReset().mockResolvedValue(true);
  window.localStorage.clear();
  window.localStorage.setItem(
    PRIVACY_CONSENT_STORAGE_KEY,
    JSON.stringify({
      accepted: true,
      acceptedAt: "2026-10-20T10:00:00.000Z",
      policyVersion: PRIVACY_POLICY_VERSION,
      skipFuturePrompts: true,
    }),
  );
});

afterEach(cleanup);

describe("workflow submission summaries", () => {
  it("shows the submitted gift details", async () => {
    render(<GiftForm />);

    fireEvent.click(screen.getByRole("button", { name: "Wallet address" }));
    const amount = await screen.findByLabelText("Amount (NGN)");
    fireEvent.change(amount, { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "Birthday present" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "8012345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create gift" }));

    expect(await screen.findByText("Gift details submitted")).toBeTruthy();
    expect(screen.getByText("Transaction summary")).toBeTruthy();
    expect(screen.getByText(/5,000\.00/)).toBeTruthy();
    expect(screen.getAllByText("BTC")).toHaveLength(2);
    expect(screen.getByText("Birthday present")).toBeTruthy();
  });

  it("restores the submitted gift values after the page is revisited", async () => {
    const formId = "gift-tron-1";
    const { unmount } = render(
      <GiftForm
        formId={formId}
        initialValues={{ crypto: "TRON", network: "TRC20" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wallet address" }));
    fireEvent.change(await screen.findByLabelText("Amount (NGN)"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "7035194443" },
    });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "For a friend" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create gift" }));

    expect(await screen.findByText("Gift details submitted")).toBeTruthy();
    expect(screen.getByText("TRON")).toBeTruthy();
    expect(screen.getByText("TRC20")).toBeTruthy();
    expect(screen.getByText(/5,000\.00/)).toBeTruthy();

    unmount();

    render(
      <GiftForm
        formId={formId}
        initialValues={{ crypto: "BTC", network: "BTC", amount: "" }}
      />,
    );

    expect(await screen.findByText("Gift details submitted")).toBeTruthy();
    expect(screen.getByText("TRON")).toBeTruthy();
    expect(screen.getByText("TRC20")).toBeTruthy();
    expect(screen.getByText(/5,000\.00/)).toBeTruthy();
    expect(screen.queryByText("BTC")).toBeNull();
    expect(screen.queryByText("₦0.00")).toBeNull();
  });

  it("does not invent BTC details for legacy completed gift forms", async () => {
    window.localStorage.setItem("completed-gift-form:legacy-gift", "true");

    render(
      <GiftForm
        formId="legacy-gift"
        initialValues={{ crypto: "BTC", network: "BTC", amount: "" }}
      />,
    );

    expect(await screen.findByText("Gift details submitted.")).toBeTruthy();
    expect(screen.queryByText("Transaction summary")).toBeNull();
    expect(screen.queryByText("BTC")).toBeNull();
    expect(screen.queryByText("₦0.00")).toBeNull();
  });

  it("shows the submitted payment-request details", async () => {
    render(<RequestPaymentForm />);

    fireEvent.change(screen.getByLabelText("Amount (NGN)"), {
      target: { value: "15000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill bank details" }));
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: "These account details are correct",
      }),
    );
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "Invoice 104" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "8012345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request" }));

    expect(
      await screen.findByText("Payment request details submitted"),
    ).toBeTruthy();
    expect(screen.getByText("Transaction summary")).toBeTruthy();
    expect(screen.getByText(/15,000\.00/)).toBeTruthy();
    expect(screen.getByText("OLAWALE SANUSI")).toBeTruthy();
    expect(screen.getByText("OPAY")).toBeTruthy();
    expect(screen.getByText("7035194443")).toBeTruthy();
    expect(screen.getByText("Invoice 104")).toBeTruthy();
    await waitFor(() => expect(handlers.request).toHaveBeenCalledTimes(1));
  });
});
