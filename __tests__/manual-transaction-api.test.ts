import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/transfer/save";
import { mockRequestResponse } from "./api/test-util";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  enginePost: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({ getToken: mocks.getToken }));
vi.mock("@/lib/settle-client", () => ({ enginePost: mocks.enginePost }));

describe("manual transaction API proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_ADMIN_EMAILS", "owner@example.com");
    mocks.getToken.mockResolvedValue({ email: "owner@example.com" });
    mocks.enginePost.mockResolvedValue({
      success: true,
      transferId: 42,
      reference: "2S-MANUAL",
    });
  });

  it("sends the complete transaction to the payment engine", async () => {
    const body = {
      crypto: "TRX",
      network: "trc20",
      estimate_asset: "dollar",
      estimate_amount: "100",
      amount_payable: "165000",
      current_rate: "1650",
      merchant_rate: "1675",
      profit_rate: "25",
    };
    const { req, res, resData } = mockRequestResponse("POST", body);

    await handler(req, res);

    expect(mocks.enginePost).toHaveBeenCalledWith("/transfer/save", body);
    expect(resData.status).toBe(201);
    expect(resData.json).toEqual({
      success: true,
      transferId: 42,
      reference: "2S-MANUAL",
    });
  });

  it("requires a signed-in operator", async () => {
    mocks.getToken.mockResolvedValue(null);
    const { req, res, resData } = mockRequestResponse("POST", {});

    await handler(req, res);

    expect(resData.status).toBe(401);
    expect(mocks.enginePost).not.toHaveBeenCalled();
  });

  it("requires an allowlisted operator", async () => {
    mocks.getToken.mockResolvedValue({ email: "visitor@example.com" });
    const { req, res, resData } = mockRequestResponse("POST", {});

    await handler(req, res);

    expect(resData.status).toBe(403);
    expect(mocks.enginePost).not.toHaveBeenCalled();
  });
});
