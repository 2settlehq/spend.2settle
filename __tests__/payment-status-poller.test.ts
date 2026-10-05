import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_EXPIRY_GRACE_MS,
  POLL_INTERVAL_MS,
  pollPaymentStatuses,
  shouldPoll,
  startPaymentStatusPolling,
  stopPaymentStatusPolling,
} from "@/services/paymentStatusPoller";
import { useStatusStore } from "stores/statusStore";

const reply = (reference: string, status: string) => ({
  ok: true,
  json: async () => ({ ok: true, payment: { reference, status, type: "transfer" } }),
});

describe("shouldPoll", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");

  it.each(["settled", "failed", "expired", "settlement_reversed"] as const)(
    "stops at %s",
    (status) => {
      expect(shouldPoll({ reference: "R", status }, now)).toBe(false);
    },
  );

  it("keeps polling an in-progress payment past its deposit expiry", () => {
    expect(
      shouldPoll({ reference: "R", status: "confirming", expiresAt: "2026-10-05T10:00:00Z" }, now),
    ).toBe(true);
  });

  it("stops a still-pending payment once the grace window after expiry ends", () => {
    const expiresAt = new Date(now - PENDING_EXPIRY_GRACE_MS - 1).toISOString();
    expect(shouldPoll({ reference: "R", status: "pending", expiresAt }, now)).toBe(false);

    const recent = new Date(now - PENDING_EXPIRY_GRACE_MS + 1000).toISOString();
    expect(shouldPoll({ reference: "R", status: "pending", expiresAt: recent }, now)).toBe(true);
  });

  it("stops a gift once its gift ID is confirmed", () => {
    expect(
      shouldPoll({ reference: "R", type: "gift", status: "confirmed", giftId: "2S-ABC" }, now),
    ).toBe(false);
    expect(shouldPoll({ reference: "R", type: "transfer", status: "confirmed" }, now)).toBe(true);
  });
});

describe("payment status polling", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    useStatusStore.getState().clearAllStatuses();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    stopPaymentStatusPolling();
    useStatusStore.getState().clearAllStatuses();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("polls every tracked payment on an interval until it reaches a final status", async () => {
    useStatusStore.getState().trackStatus({ reference: "PAY-1", status: "pending" });
    fetchMock
      .mockResolvedValueOnce(reply("PAY-1", "confirming"))
      .mockResolvedValueOnce(reply("PAY-1", "settled"));

    startPaymentStatusPolling();
    await vi.advanceTimersByTimeAsync(0);
    expect(useStatusStore.getState().statusesByReference["PAY-1"].status).toBe("confirming");

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(useStatusStore.getState().statusesByReference["PAY-1"].status).toBe("settled");

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not recreate a record cleared while its request was in flight", async () => {
    useStatusStore.getState().trackStatus({ reference: "PAY-2", status: "pending" });
    fetchMock.mockImplementation(async () => {
      useStatusStore.getState().clearStatus("PAY-2");
      return reply("PAY-2", "confirming");
    });

    await pollPaymentStatuses();

    expect(useStatusStore.getState().statusesByReference["PAY-2"]).toBeUndefined();
  });

  it("only starts one interval when started twice", async () => {
    useStatusStore.getState().trackStatus({ reference: "PAY-3", status: "pending" });
    fetchMock.mockResolvedValue(reply("PAY-3", "pending"));

    startPaymentStatusPolling();
    startPaymentStatusPolling();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
