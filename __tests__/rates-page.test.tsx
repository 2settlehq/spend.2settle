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
      json: async () => ({ currentRate: 1650, merchantRate: 1675, profitRate: 25 }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ currentRate: 1700, merchantRate: 1725, profitRate: 25 }),
    }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("loads and updates all three rates", async () => {
  render(<RatesPage />);

  const rate = await screen.findByLabelText("Rate");
  const merchantRate = screen.getByLabelText("Merchant rate");
  const profitRate = screen.getByLabelText("Profit rate");

  expect(rate).toHaveProperty("value", "1650");
  expect(merchantRate).toHaveProperty("value", "1675");
  expect(profitRate).toHaveProperty("value", "25");

  fireEvent.change(rate, { target: { value: "1700" } });
  fireEvent.change(merchantRate, { target: { value: "1725" } });
  fireEvent.click(screen.getByRole("button", { name: "Update rates" }));

  await screen.findByText("Rates updated successfully.");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

  expect(fetch).toHaveBeenLastCalledWith("/api/rates/manage", expect.objectContaining({
    method: "PUT",
    body: JSON.stringify({ currentRate: "1700", merchantRate: "1725", profitRate: "25" }),
  }));
  expect(mocks.setRate).toHaveBeenCalledWith("1700");
  expect(mocks.setMerchantRate).toHaveBeenCalledWith("1725");
  expect(mocks.setProfitRate).toHaveBeenCalledWith("25");
});
