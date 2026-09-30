// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const enginePost = vi.fn();
vi.mock("@/lib/settle-client", () => ({ enginePost: (...args: any[]) => enginePost(...args) }));

import handler from "@/pages/api/payments/cancel";
import { createCancelToken, withCancelToken } from "@/lib/paymentCancelToken";

function call(body: unknown) {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (code: number) => ((res.statusCode = code), res);
  res.json = (data: unknown) => ((res.body = data), res);
  res.setHeader = vi.fn();
  res.end = vi.fn();
  return handler({ method: "POST", body } as any, res).then(() => res);
}

describe("POST /api/payments/cancel", () => {
  beforeEach(() => {
    process.env.SETTLE_API_SECRET = "test-secret";
    delete process.env.PAYMENT_CANCEL_SECRET;
    enginePost.mockReset().mockResolvedValue({ success: true });
  });

  it("cancels with the token issued to the payment's creator", async () => {
    const created = withCancelToken({ payment: { reference: "2S-7WSKCG" } }) as any;

    const res = await call({ reference: "2S-7WSKCG", cancelToken: created.payment.cancelToken });

    expect(res.statusCode).toBe(200);
    expect(enginePost).toHaveBeenCalledWith("/payments/2S-7WSKCG/cancel", {});
  });

  it("refuses another payment's token or a missing token", async () => {
    const otherToken = createCancelToken("2S-OTHER1");

    expect((await call({ reference: "2S-7WSKCG", cancelToken: otherToken })).statusCode).toBe(403);
    expect((await call({ reference: "2S-7WSKCG" })).statusCode).toBe(403);
    expect(enginePost).not.toHaveBeenCalled();
  });

  it("rejects malformed references", async () => {
    const res = await call({ reference: "../admin", cancelToken: "x" });
    expect(res.statusCode).toBe(400);
    expect(enginePost).not.toHaveBeenCalled();
  });
});
