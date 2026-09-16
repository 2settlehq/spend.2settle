import { beforeEach, describe, expect, it, vi } from "vitest";
import statusHandler from "@/pages/api/payments/status";
import lookupHandler from "@/pages/api/gifts/check_gift";
import claimHandler from "@/pages/api/payments/gifts/[reference]/claim";
import saveHandler from "@/pages/api/gifts/save";
import { engineGet, enginePost } from "@/lib/settle-client";
import { mockRequestResponse } from "./test-util";

vi.mock("@/lib/settle-client", () => ({ engineGet: vi.fn(), enginePost: vi.fn() }));

describe("gift API identifiers", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["pending", "confirming", "confirmed"])("polls by reference at %s and forwards the separate code", async (status) => {
    const payment = { reference: "GP-HKVT5E", type: "gift", status, giftId: status === "confirmed" ? "2S-HKVT5E" : null };
    vi.mocked(engineGet).mockResolvedValue({ payment });
    const { req, res, resData } = mockRequestResponse("GET", undefined, { reference: payment.reference });
    await statusHandler(req, res);
    expect(engineGet).toHaveBeenCalledWith("/payments/GP-HKVT5E");
    expect(resData.json.payment).toMatchObject(payment);
  });
  it("looks up recipients by gift ID, not payment reference", async () => {
    vi.mocked(engineGet).mockResolvedValue({ payment: { giftId: "2S-HKVT5E" } });
    const { req, res, resData } = mockRequestResponse("GET", undefined, { gift_id: "2s-hkvt5e" });
    await lookupHandler(req, res);
    expect(engineGet).toHaveBeenCalledWith("/payments/gifts/2S-HKVT5E");
    expect(resData.status).toBe(200);
  });
  it("claims using the gift ID and preserves verified bank details", async () => {
    const body = { bankCode: "100004", accountNumber: "7035194443", accountName: "TEST RECIPIENT" };
    vi.mocked(enginePost).mockResolvedValue({ success: true });
    const { req, res, resData } = mockRequestResponse("POST", body, { reference: "2S-HKVT5E" });
    await claimHandler(req, res);
    expect(enginePost).toHaveBeenCalledWith("/payments/gifts/2S-HKVT5E/claim/confirm", body);
    expect(resData.status).toBe(200);
  });
  it("rejects tracking references for both recipient operations", async () => {
    const lookup = mockRequestResponse("GET", undefined, { gift_id: "GP-HKVT5E" });
    await lookupHandler(lookup.req, lookup.res);
    const claim = mockRequestResponse("POST", {}, { reference: "GP-HKVT5E" });
    await claimHandler(claim.req, claim.res);
    expect(lookup.resData.status).toBe(400);
    expect(claim.resData.status).toBe(400);
    expect(engineGet).not.toHaveBeenCalled();
    expect(enginePost).not.toHaveBeenCalled();
  });
  it("does not allow the deprecated unpaid gift-save operation", async () => {
    const { req, res, resData } = mockRequestResponse("POST", {}, {});
    await saveHandler(req, res);
    expect(resData.status).toBe(410);
    expect(enginePost).not.toHaveBeenCalled();
  });
});
