import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentDetails from "@/components/chatbot/PaymentDetails";
import { useStatusStore } from "stores/statusStore";

const { cancelEnginePayment } = vi.hoisted(() => ({
  cancelEnginePayment: vi.fn(),
}));

vi.mock("@/features/transact/CopyableText", () => ({ CopyableText: ({ text, label }: { text: string; label: string }) => <button aria-label={`Copy ${label}`}>{text}</button> }));
vi.mock("@/components/crypto/ConnectWallet", () => ({
  default: ({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) => (
    <button onClick={() => onOpenChange?.(true)}>Connect Wallet</button>
  ),
}));
vi.mock("@/helpers/format_date", () => ({ CountdownTimer: ({ reference, pollStatus }: any) => <div data-testid="timer" data-reference={reference} data-poll={String(pollStatus)} /> }));
vi.mock("@/components/chatbot/GiftCode", () => ({ default: ({ payment }: any) => <div data-testid="gift-tracking" data-reference={payment.reference} /> }));
vi.mock("@/services/enginePaymentService", () => ({ cancelEnginePayment }));
beforeEach(() => {
  cancelEnginePayment.mockReset();
  useStatusStore.getState().clearAllStatuses();
});
afterEach(cleanup);

describe("payment details compatibility", () => {
  it("shows old gift tracking references as copyable Transaction IDs, not Gift IDs", () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<PaymentDetails items={[
      { label: "Wallet Address", text: "deposit-wallet", isWallet: true, paymentType: "gift", reference: "GP-HKVT5E" },
      { label: "Gift ID", text: "GP-HKVT5E" },
      { label: "Transaction ID", text: "GP-HKVT5E" },
    ]} expiryTime="2026-09-14T12:00:00Z" walletReference="GP-HKVT5E" />);
    expect(screen.queryByText("deposit-wallet")).toBeNull();
    expect(screen.getByRole("button", { name: "Copy Transaction ID" }).textContent).toBe("GP-HKVT5E");
    expect(screen.queryByRole("button", { name: "Copy Gift ID" })).toBeNull();
    expect(screen.getByTestId("gift-tracking").dataset.reference).toBe("GP-HKVT5E");
    expect(screen.getByTestId("timer").dataset.poll).toBe("false");
    expect(screen.getByText(/connect your wallet or copy the deposit wallet address/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy deposit wallet address" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy deposit wallet address" }));
    expect(screen.getByText("deposit-wallet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect Wallet" })).toBeNull();
  });
  it("hides the copyable deposit address when wallet connection is selected", () => {
    render(<PaymentDetails items={[
      { label: "Wallet Address", text: "deposit-wallet", isWallet: true, paymentType: "transfer", reference: "2S-ORIGIN" },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));

    expect(screen.getByText("Wallet connection selected.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy deposit wallet address" })).toBeNull();
    expect(screen.queryByText("deposit-wallet")).toBeNull();
  });
  it("uses an earlier wallet-address choice without asking again", () => {
    render(<PaymentDetails
      preferredPaymentMethod="copy"
      items={[
        { label: "Wallet Address", text: "deposit-wallet", isWallet: true },
      ]}
    />);

    expect(screen.queryByText(/connect your wallet or copy/i)).toBeNull();
    expect(screen.getByText("deposit-wallet")).toBeTruthy();
  });
  it.each(["transfer", "request"])("preserves %s IDs and ordinary payment polling", (paymentType) => {
    render(<PaymentDetails items={[
      { label: "Wallet Address", text: "deposit-wallet", isWallet: true, paymentType, reference: "2S-ORIGIN" },
      { label: "Transaction ID", text: "2S-ORIGIN", paymentType },
    ]} expiryTime="2026-09-14T12:00:00Z" walletReference="2S-ORIGIN" />);
    expect(screen.getByText("2S-ORIGIN")).toBeTruthy();
    expect(screen.getByTestId("timer").dataset.poll).toBe("true");
    expect(screen.queryByTestId("gift-tracking")).toBeNull();
  });
  it("cancels a pending transaction after confirmation", async () => {
    cancelEnginePayment.mockResolvedValue(undefined);
    render(<PaymentDetails
      items={[
        { label: "Wallet Address", text: "deposit-wallet", isWallet: true, paymentType: "transfer", reference: "2S-CANCEL" },
      ]}
      expiryTime="2026-10-09T13:00:00Z"
      walletReference="2S-CANCEL"
      paymentReference="2S-CANCEL"
      cancelToken="cancel-token"
      preferredPaymentMethod="copy"
    />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel transaction" }));
    expect(screen.getByRole("alertdialog", { name: "Confirm transaction cancellation" })).toBeTruthy();
    expect(cancelEnginePayment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel transaction" }));

    await waitFor(() => {
      expect(cancelEnginePayment).toHaveBeenCalledWith("2S-CANCEL", "cancel-token");
      expect(screen.getByText(/Transaction cancelled/i)).toBeTruthy();
    });
    expect(useStatusStore.getState().statusesByReference["2S-CANCEL"]?.status).toBe("expired");
    expect(screen.queryByTestId("timer")).toBeNull();
  });
  it("keeps the transaction available when cancellation fails", async () => {
    cancelEnginePayment.mockRejectedValue(new Error("already processing"));
    render(<PaymentDetails
      paymentReference="2S-ACTIVE"
      cancelToken="cancel-token"
    />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel transaction" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel transaction" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "This transaction could not be cancelled. It may already be processing.",
    );
    expect(useStatusStore.getState().statusesByReference["2S-ACTIVE"]).toBeUndefined();
    expect(screen.getByRole("button", { name: "Yes, cancel transaction" })).toBeTruthy();
  });
  it("hides cancellation once payment processing has started", () => {
    useStatusStore.getState().upsertStatus({
      reference: "2S-CONFIRMING",
      status: "confirming",
    });

    render(<PaymentDetails
      paymentReference="2S-CONFIRMING"
      cancelToken="cancel-token"
    />);

    expect(screen.queryByRole("button", { name: "Cancel transaction" })).toBeNull();
  });
});
