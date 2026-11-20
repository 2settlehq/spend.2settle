import { describe, expect, it } from "vitest";
import {
  formatAmountLimit,
  getAmountLimitError,
} from "@/services/rate/amountValidation";
import type { RateLimits } from "@/services/rate/getLimits";

const limits: RateLimits = {
  min: 1,
  max: 2_000_000,
  unit: "NGN",
  cryptoPrice: 1,
  rate: 1_350,
};

describe("amount limit validation", () => {
  it("keeps empty and in-range amounts valid", () => {
    expect(getAmountLimitError("", limits)).toBe("");
    expect(getAmountLimitError("1", limits)).toBe("");
    expect(getAmountLimitError("2,000,000", limits)).toBe("");
  });

  it("reports the minimum immediately", () => {
    expect(getAmountLimitError("0.50", limits)).toBe(
      "Minimum amount is ₦1.00.",
    );
  });

  it("reports the maximum immediately", () => {
    expect(getAmountLimitError("2000000.01", limits)).toBe(
      "Maximum amount is ₦2,000,000.00.",
    );
  });

  it("formats small dollar and crypto limits without rounding them to zero", () => {
    expect(formatAmountLimit(0.00075, "USD")).toBe("$0.00075");
    expect(formatAmountLimit(0.00000001, "BTC")).toBe("0.00000001 BTC");
  });
});
