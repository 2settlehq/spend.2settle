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

  expect(screen.getByTitle("GP-HKVT5E").textContent).toBe("GP-HKV...VT5E");
  fireEvent.click(screen.getByRole("button", { name: "Copy Transaction ID" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("GP-HKVT5E"));
});
