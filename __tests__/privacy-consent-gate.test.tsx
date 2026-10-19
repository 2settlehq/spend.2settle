import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_POLICY_VERSION,
  PrivacyConsentActionGate,
} from "@/components/chatbot/PrivacyConsentGate";

function WalletActions({ onSelect }: { onSelect: (method: string) => void }) {
  return (
    <PrivacyConsentActionGate>
      {(requestPrivacyConsent) => (
        <div>
          <p>Transaction form</p>
          <button
            onClick={() => {
              void requestPrivacyConsent().then((accepted) => {
                if (accepted) onSelect("wallet");
              });
            }}
          >
            Connect wallet
          </button>
          <button
            onClick={() => {
              void requestPrivacyConsent().then((accepted) => {
                if (accepted) onSelect("copy");
              });
            }}
          >
            Display wallet address
          </button>
        </div>
      )}
    </PrivacyConsentActionGate>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("wallet-action privacy consent", () => {
  it("shows the form immediately and asks only after a wallet option is selected", async () => {
    const onSelect = vi.fn();
    render(<WalletActions onSelect={onSelect} />);

    expect(screen.getByText("Transaction form")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Before using a wallet" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Display wallet address" }));

    expect(
      await screen.findByRole("heading", { name: "Before using a wallet" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/privacy");
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "I accept" }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("copy"));
    const stored = JSON.parse(
      window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY) ?? "{}",
    );
    expect(stored).toMatchObject({
      accepted: true,
      policyVersion: PRIVACY_POLICY_VERSION,
    });
  });

  it("does not continue the wallet action when the user selects Not now", async () => {
    const onSelect = vi.fn();
    render(<WalletActions onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Before using a wallet" }),
      ).toBeNull();
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("continues immediately when consent was previously recorded", async () => {
    window.localStorage.setItem(
      PRIVACY_CONSENT_STORAGE_KEY,
      JSON.stringify({
        accepted: true,
        acceptedAt: "2026-10-12T10:00:00.000Z",
        policyVersion: PRIVACY_POLICY_VERSION,
      }),
    );
    const onSelect = vi.fn();
    render(<WalletActions onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("wallet"));
    expect(
      screen.queryByRole("heading", { name: "Before using a wallet" }),
    ).toBeNull();
  });
});
