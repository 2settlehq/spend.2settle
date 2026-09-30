import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "@/helpers/format_date";
import { useStatusStore } from "stores/statusStore";

const REFERENCE = "PAY-123";

function mockStatus(status: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, payment: { status, type: "transfer" } }),
  }) as any;
}

describe("CountdownTimer statusOnly", () => {
  beforeEach(() => {
    useStatusStore.getState().clearAllStatuses();
    useStatusStore
      .getState()
      .upsertStatus({ reference: REFERENCE, status: "pending" });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows a status instead of a countdown while pending", () => {
    mockStatus("pending");
    render(
      <CountdownTimer
        expiryTime={Date.now() + 30 * 60 * 1000}
        reference={REFERENCE}
        statusOnly
      />,
    );

    expect(
      screen.getByText("Payment status: Awaiting confirmation"),
    ).toBeTruthy();
    expect(screen.queryByText(/to complete this payment/)).toBeNull();
  });

  it("keeps polling past the deposit expiry and shows settlement", async () => {
    mockStatus("settled");
    render(
      <CountdownTimer
        expiryTime={Date.now() - 1000}
        reference={REFERENCE}
        statusOnly
      />,
    );

    await act(async () => {});

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/payments/status?reference=${REFERENCE}`,
    );
    expect(screen.getByText("Payment status: Settled")).toBeTruthy();
  });

  it("still shows the countdown by default", () => {
    mockStatus("pending");
    render(
      <CountdownTimer
        expiryTime={Date.now() + 30 * 60 * 1000}
        reference={REFERENCE}
      />,
    );

    expect(screen.getByText(/to complete this payment/)).toBeTruthy();
  });
});
