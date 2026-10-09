import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CopyableText } from "@/features/transact/CopyableText";

vi.mock("stores/chatStore", () => ({ default: { getState: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the transaction reference and copies its complete value", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  render(<CopyableText text="GP-HKVT5E" label="Transaction ID" />);

  expect(screen.getByTitle("GP-HKVT5E").textContent).toBe("GP-HKVT5E");
  fireEvent.click(screen.getByRole("button", { name: "Copy Transaction ID" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("GP-HKVT5E"));
});

it.each([
  ["Request ID", "2S-REQUEST123456"],
  ["Gift ID", "2S-GIFT123456"],
  ["Report ID", "REPORT-123456789"],
  ["Crypto Amount (USDT)", "1234.56789"],
])("shows the complete %s value", (label, value) => {
  render(<CopyableText text={value} label={label} embedded />);

  expect(screen.getByTitle(value).textContent).toBe(value);
});

it("shortens only the displayed wallet address and copies its full value", async () => {
  const address = "bc1q5wv8s4uylvf9pmdxv2fz9uk52392l2j0gycg67";
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  render(
    <CopyableText
      text={address}
      label="Wallet Address"
      isWallet
      embedded
    />,
  );

  expect(screen.getByTitle(address).textContent).toBe("bc1q5w...cg67");
  fireEvent.click(screen.getByRole("button", { name: "Copy Wallet Address" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(address));
});
