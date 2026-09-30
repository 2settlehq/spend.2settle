import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Body from "@/components/dashboard/Body";

const mocks = vi.hoisted(() => ({ addMessages: vi.fn() }));

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: any) => <img {...props} />,
}));
vi.mock("@/hooks/rates/useRate", () => ({
  default: () => ({ data: { rateNumeric: 1300, updatedAt: Date.now() }, isLoading: false, error: null }),
}));
vi.mock("@/hooks/dashboard/useTotalVolume", () => ({
  default: () => ({ data: 1000, isLoading: false, error: null }),
}));
vi.mock("stores/paymentStore", () => ({
  usePaymentStore: { getState: () => ({ setRate: vi.fn() }) },
}));
vi.mock("stores/chatStore", () => ({
  default: { getState: () => ({ addMessages: mocks.addMessages }) },
}));
vi.mock("@/core/ChatBot", () => ({ default: () => <div>Chat</div> }));
vi.mock("@/components/dashboard/SendMoney", () => ({
  default: ({ onSubmit }: any) => (
    <button
      aria-label="Prefill transfer"
      onClick={() => onSubmit({ amount: "2500", estimation: "naira" })}
    >
      Spend Money
    </button>
  ),
}));
vi.mock("@/components/dashboard/Maintenance", () => ({ default: () => null }));
vi.mock("@/components/dashboard/DisplayTransactions", () => ({ default: () => null }));
vi.mock("@/components/social/telegram/TelegramError", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("dashboard chat launcher", () => {
  it("floats above mobile browser controls outside the clipped dashboard", async () => {
    await act(async () => root.render(<Body />));

    const launcher = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Open chat"]',
    );

    expect(launcher).not.toBeNull();
    expect(container.contains(launcher)).toBe(false);
    expect(launcher?.className).toContain("fixed");
    expect(launcher?.className).toContain("z-[100]");
    expect(launcher?.className).toContain("chat-launcher-position");
  });

  it("opens chat with the homepage amount prefilled in a transfer form", async () => {
    await act(async () => root.render(<Body />));

    await act(async () =>
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Prefill transfer"]',
      )!.click(),
    );

    expect(mocks.addMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "incoming",
        intent: expect.objectContaining({
          name: "TransferForm",
          persist: true,
          props: expect.objectContaining({
            initialValues: { amount: "2500", estimation: "naira" },
          }),
        }),
      }),
    ]);
    expect(container.textContent).toContain("Chat");
  });
});
