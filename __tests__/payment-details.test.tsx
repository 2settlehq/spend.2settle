import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaymentDetails from "@/components/chatbot/PaymentDetails";

vi.mock("@/features/transact/CopyableText", () => ({ CopyableText: ({ text, label }: { text: string; label: string }) => <button aria-label={`Copy ${label}`}>{text}</button> }));
vi.mock("@/helpers/format_date", () => ({ CountdownTimer: ({ reference, pollStatus }: any) => <div data-testid="timer" data-reference={reference} data-poll={String(pollStatus)} /> }));
vi.mock("@/components/chatbot/GiftCode", () => ({ default: ({ payment }: any) => <div data-testid="gift-tracking" data-reference={payment.reference} /> }));
afterEach(cleanup);

describe("payment details compatibility", () => {
  it("shows old gift tracking references as copyable Transaction IDs, not Gift IDs", () => {
    render(<PaymentDetails items={[
      { label: "Wallet Address", text: "deposit-wallet", isWallet: true, paymentType: "gift", reference: "GP-HKVT5E" },
      { label: "Gift ID", text: "GP-HKVT5E" },
      { label: "Transaction ID", text: "GP-HKVT5E" },
    ]} expiryTime="2026-09-14T12:00:00Z" walletReference="GP-HKVT5E" />);
    expect(screen.getByText("deposit-wallet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Transaction ID" }).textContent).toBe("GP-HKVT5E");
    expect(screen.queryByRole("button", { name: "Copy Gift ID" })).toBeNull();
    expect(screen.getByTestId("gift-tracking").dataset.reference).toBe("GP-HKVT5E");
    expect(screen.getByTestId("timer").dataset.poll).toBe("false");
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
});
