import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import RatesPage from "@/pages/rates";

const mocks = vi.hoisted(() => ({
  setRate: vi.fn(),
  setMerchantRate: vi.fn(),
  setProfitRate: vi.fn(),
}));

vi.mock("next/head", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/components/shared/NavBar", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("stores/paymentStore", () => ({
  usePaymentStore: () => ({
    setRate: mocks.setRate,
    setMerchantRate: mocks.setMerchantRate,
    setProfitRate: mocks.setProfitRate,
  }),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rate: 1636.8, currentRate: 1650, merchantRate: 1675, profitRate: 25 }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rate: 1636.8, currentRate: 1650, merchantRate: 1680, profitRate: 30 }),
    }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("displays current and merchant rates but updates only profit rate", async () => {
  render(<RatesPage />);

  const rate = await screen.findByLabelText("Rate");
  const merchantRate = screen.getByLabelText("Merchant rate");
  const profitRate = screen.getByLabelText("Profit rate");

  expect(rate).toHaveProperty("value", "1636.80");
  expect(merchantRate).toHaveProperty("value", "1675.00");
  expect(profitRate).toHaveProperty("value", "25.00");
  expect(rate).toHaveProperty("readOnly", true);
  expect(merchantRate).toHaveProperty("readOnly", true);
  expect(profitRate).toHaveProperty("readOnly", false);

  fireEvent.change(profitRate, { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "Update profit rate" }));

  await screen.findByText("Profit rate updated successfully.");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  expect(fetch).toHaveBeenLastCalledWith("/api/rates/manage", expect.objectContaining({
    method: "PUT",
    body: JSON.stringify({ profitRate: "30" }),
  }));
  expect(mocks.setRate).toHaveBeenCalledWith("1636.80");
  expect(mocks.setMerchantRate).toHaveBeenCalledWith("1680.00");
  expect(mocks.setProfitRate).toHaveBeenCalledWith("30.00");
});
