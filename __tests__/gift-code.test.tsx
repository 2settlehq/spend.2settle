import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GiftCode from "@/components/chatbot/GiftCode";
import { useStatusStore } from "stores/statusStore";

vi.mock("@/features/transact/CopyableText", () => ({ CopyableText: ({ text }: { text: string }) => <button>Copy {text}</button> }));
const reference = "GP-HKVT5E";
const payment = { reference, status: "pending", giftId: null, expiresAt: "2000-01-01T00:00:00Z" };
let fetchMock: ReturnType<typeof vi.fn>;
const reply = (status: string, giftId: string | null = null) => ({ ok: true, json: async () => ({ ok: true, payment: { reference, type: "gift", status, giftId } }) });
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const nextPoll = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(10000); }); };

describe("gift funding UI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStatusStore.getState().clearAllStatuses();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    useStatusStore.getState().clearAllStatuses();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("continues past the deposit deadline and waits for confirmed plus non-null giftId", async () => {
    fetchMock.mockResolvedValueOnce(reply("pending"))
      .mockResolvedValueOnce(reply("confirming", "2S-HKVT5E"))
      .mockResolvedValueOnce(reply("confirmed"))
      .mockResolvedValueOnce(reply("confirmed", "2S-HKVT5E"));
    render(<GiftCode payment={payment} />);
    await flush();
    expect(screen.queryByRole("button")).toBeNull();
    await nextPoll();
    expect(screen.queryByRole("button")).toBeNull();
    await nextPoll();
    expect(screen.queryByRole("button")).toBeNull();
    await nextPoll();
    expect(screen.getByRole("button").textContent).toBe("Copy 2S-HKVT5E");
    expect(screen.getByText(/Share this gift ID/)).toBeTruthy();
    expect(document.body.textContent).not.toContain(reference);
    expect(fetchMock.mock.calls.every(([url]) => url === `/api/payments/status?reference=${reference}`)).toBe(true);
    await nextPoll();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it.each(["expired", "failed", "settlement_reversed"])("stops at %s without issuing a code", async (status) => {
    fetchMock.mockResolvedValue(reply(status, "2S-HKVT5E"));
    render(<GiftCode payment={payment} />);
    await flush();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/not completed/)).toBeTruthy();
    await nextPoll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains a confirmed code when the saved chat is reopened", async () => {
    useStatusStore.getState().upsertStatus({ reference, type: "gift", status: "confirmed", giftId: "2S-HKVT5E" });
    fetchMock.mockResolvedValue(reply("confirmed", "2S-HKVT5E"));
    render(<GiftCode payment={payment} />);
    await flush();
    expect(screen.getByRole("button").textContent).toContain("2S-HKVT5E");
  });
  it("ignores responses belonging to another payment", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, payment: { reference: "GP-OTHER1", type: "gift", status: "confirmed", giftId: "2S-OTHER1" } }) });
    const view = render(<GiftCode payment={payment} />);
    await flush();
    expect(screen.queryByRole("button")).toBeNull();
    view.unmount();
    await nextPoll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
