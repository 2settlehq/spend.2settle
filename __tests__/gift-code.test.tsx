import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GiftCode from "@/components/chatbot/GiftCode";
import { pollPaymentStatuses } from "@/services/paymentStatusPoller";
import { useStatusStore } from "stores/statusStore";

vi.mock("@/features/transact/CopyableText", () => ({ CopyableText: ({ text }: { text: string }) => <button>Copy {text}</button> }));
const reference = "GP-HKVT5E";
// Deposit deadline just passed, still inside the poller's grace window
const payment = { reference, status: "pending", giftId: null, expiresAt: new Date(Date.now() - 60 * 1000).toISOString() };
let fetchMock: ReturnType<typeof vi.fn>;
const reply = (status: string, giftId: string | null = null) => ({ ok: true, json: async () => ({ ok: true, payment: { reference, type: "gift", status, giftId } }) });
const poll = async () => { await act(async () => { await pollPaymentStatuses(); }); };

describe("gift funding UI", () => {
  beforeEach(() => {
    useStatusStore.getState().clearAllStatuses();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    useStatusStore.getState().clearAllStatuses();
    vi.unstubAllGlobals();
  });
  it("continues past the deposit deadline and waits for confirmed plus non-null giftId", async () => {
    fetchMock.mockResolvedValueOnce(reply("pending"))
      .mockResolvedValueOnce(reply("confirming", "2S-HKVT5E"))
      .mockResolvedValueOnce(reply("confirmed"))
      .mockResolvedValueOnce(reply("confirmed", "2S-HKVT5E"));
    render(<GiftCode payment={payment} />);
    await poll();
    expect(screen.queryByRole("button")).toBeNull();
    await poll();
    expect(screen.queryByRole("button")).toBeNull();
    await poll();
    expect(screen.queryByRole("button")).toBeNull();
    await poll();
    expect(screen.getByRole("button").textContent).toBe("Copy 2S-HKVT5E");
    expect(screen.getByText(/Share this gift ID/)).toBeTruthy();
    expect(document.body.textContent).not.toContain(reference);
    expect(fetchMock.mock.calls.every(([url]) => url === `/api/payments/status?reference=${reference}`)).toBe(true);
    await poll();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it.each(["expired", "failed", "settlement_reversed"])("stops at %s without issuing a code", async (status) => {
    fetchMock.mockResolvedValue(reply(status, "2S-HKVT5E"));
    render(<GiftCode payment={payment} />);
    await poll();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/not completed/)).toBeTruthy();
    await poll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains a confirmed code when the saved chat is reopened", async () => {
    useStatusStore.getState().upsertStatus({ reference, type: "gift", status: "confirmed", giftId: "2S-HKVT5E" });
    render(<GiftCode payment={payment} />);
    await poll();
    expect(screen.getByRole("button").textContent).toContain("2S-HKVT5E");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("ignores responses belonging to another payment", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, payment: { reference: "GP-OTHER1", type: "gift", status: "confirmed", giftId: "2S-OTHER1" } }) });
    render(<GiftCode payment={payment} />);
    await poll();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("keeps polling after the gift message unmounts", async () => {
    fetchMock.mockResolvedValueOnce(reply("pending")).mockResolvedValueOnce(reply("confirmed", "2S-HKVT5E"));
    const view = render(<GiftCode payment={payment} />);
    view.unmount();
    await poll();
    await poll();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useStatusStore.getState().statusesByReference[reference]?.giftId).toBe("2S-HKVT5E");
  });
});
