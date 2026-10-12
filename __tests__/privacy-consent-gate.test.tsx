import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_POLICY_VERSION,
  PrivacyConsentGate,
} from "@/components/chatbot/PrivacyConsentGate";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("first-transaction privacy consent", () => {
  it("keeps transaction details hidden until the user accepts", async () => {
    render(
      <PrivacyConsentGate>
        <div>Transaction form</div>
      </PrivacyConsentGate>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Before your first transaction",
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Transaction form")).toBeNull();
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/privacy");

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "must accept the Privacy Policy",
    );
    expect(screen.queryByText("Transaction form")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "I accept" }));
    expect(await screen.findByText("Transaction form")).toBeTruthy();

    const stored = JSON.parse(
      window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY) ?? "{}",
    );
    expect(stored).toMatchObject({
      accepted: true,
      policyVersion: PRIVACY_POLICY_VERSION,
    });
    expect(typeof stored.acceptedAt).toBe("string");
  });

  it("does not ask again after consent has been recorded", async () => {
    window.localStorage.setItem(
      PRIVACY_CONSENT_STORAGE_KEY,
      JSON.stringify({
        accepted: true,
        acceptedAt: "2026-10-12T10:00:00.000Z",
        policyVersion: PRIVACY_POLICY_VERSION,
      }),
    );

    render(
      <PrivacyConsentGate>
        <div>Transaction form</div>
      </PrivacyConsentGate>,
    );

    expect(await screen.findByText("Transaction form")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Before your first transaction" }),
    ).toBeNull();
  });

  it("unlocks every visible transaction form after one acceptance", async () => {
    render(
      <>
        <PrivacyConsentGate>
          <div>Transfer form</div>
        </PrivacyConsentGate>
        <PrivacyConsentGate>
          <div>Gift form</div>
        </PrivacyConsentGate>
      </>,
    );

    await screen.findAllByRole("button", { name: "I accept" });
    fireEvent.click(screen.getAllByRole("button", { name: "I accept" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Transfer form")).toBeTruthy();
      expect(screen.getByText("Gift form")).toBeTruthy();
    });
  });
});
