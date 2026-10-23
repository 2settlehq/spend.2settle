import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { debitFailureMessage } from "@/features/chatbot/helpers/debitFailureMessage";
import { WalletDebitError } from "@/lib/wallets/walletDebitSession";

describe("debitFailureMessage", () => {
  it("tells a TronLink user to disconnect and reconnect after a connection error", () => {
    render(
      <>{debitFailureMessage(
        new WalletDebitError(
          "You need to connect TronLink wallet",
          false,
          true,
        ),
        "GP-22VDW2",
      )}</>,
    );

    expect(screen.getByText(/no payment was sent from your wallet/i)).toBeTruthy();
    expect(screen.getByText(/disconnect it and reconnect it/i)).toBeTruthy();
    expect(screen.getByText("GP-22VDW2")).toBeTruthy();
  });

  it("keeps the normal retry guidance for a rejected wallet payment", () => {
    render(
      <>{debitFailureMessage(
        new WalletDebitError(
          "The payment wasn't approved in your wallet.",
          false,
          true,
        ),
        "GP-REJECT",
      )}</>,
    );

    expect(screen.getByText(/start again whenever you're ready/i)).toBeTruthy();
    expect(screen.queryByText(/disconnect it and reconnect it/i)).toBeNull();
  });
});
