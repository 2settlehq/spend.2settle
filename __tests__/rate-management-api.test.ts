import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/rates/manage";
import { mockRequestResponse } from "./api/test-util";

describe("rate management API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SETTLE_API_URL", "https://engine.example/v1");
    vi.stubEnv("SETTLE_ADMIN_SECRET", "admin-secret");
  });

  it("loads rates through the signed payment-engine endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        currentRate: 1650,
        merchantRate: 1675,
        profitRate: 25,
        updatedAt: "2026-09-22T10:00:00.000Z",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        rate: "1,636.8",
        rateNumeric: 1636.8,
      }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const { req, res, resData } = mockRequestResponse("GET");
    await handler(req, res);

    expect(resData.status).toBe(200);
    expect(resData.json).toEqual(expect.objectContaining({
      rate: 1636.8,
      currentRate: 1650,
      merchantRate: 1675,
      profitRate: 25,
    }));
    expect(fetch).toHaveBeenCalledWith(
      "https://engine.example/v1/admin/rates",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer admin-secret",
        }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://engine.example/v1/rate/all",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("forwards only profit-rate updates to the payment engine", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        currentRate: 1650,
        merchantRate: 1680,
        profitRate: 30,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        rateNumeric: 1636.8,
      }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const body = { currentRate: "9999", merchantRate: "9999", profitRate: "30" };

    const { req, res, resData } = mockRequestResponse("PUT", body);
    await handler(req, res);

    expect(resData.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://engine.example/v1/admin/rates",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ profitRate: "30" }),
      }),
    );
    expect(resData.json).toEqual(expect.objectContaining({ rate: 1636.8 }));
  });

  it("passes payment-engine errors back to the page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "Invalid admin token",
    }), { status: 401, headers: { "Content-Type": "application/json" } })));

    const { req, res, resData } = mockRequestResponse("GET");
    await handler(req, res);

    expect(resData.status).toBe(401);
    expect(resData.json).toEqual({ error: "Invalid admin token" });
  });

  it("returns a gateway error when the payment engine is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const { req, res, resData } = mockRequestResponse("GET");
    await handler(req, res);

    expect(resData.status).toBe(502);
    expect(resData.json).toEqual({
      error: "Unable to communicate with the payment engine.",
    });
  });
});
