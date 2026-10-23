import { describe, expect, it } from "vitest";
import { getChatViewportMetrics } from "@/utils/chatViewport";

describe("getChatViewportMetrics", () => {
  it("uses the smaller window height when Samsung reports a stale visual viewport", () => {
    expect(
      getChatViewportMetrics({
        innerHeight: 430,
        documentHeight: 800,
        visualViewport: { height: 800, offsetTop: 0 },
      }),
    ).toEqual({ height: 430, top: 0 });
  });

  it("uses the visual viewport when only it shrinks for the keyboard", () => {
    expect(
      getChatViewportMetrics({
        innerHeight: 800,
        documentHeight: 800,
        visualViewport: { height: 425.4, offsetTop: 12.4 },
      }),
    ).toEqual({ height: 425, top: 12 });
  });
});
