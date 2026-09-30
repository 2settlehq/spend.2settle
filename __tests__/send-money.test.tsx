import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SendMoney from "@/components/dashboard/SendMoney";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("homepage amount control", () => {
  it("submits the entered amount and selected estimation currency", () => {
    const onSubmit = vi.fn();
    act(() => root.render(<SendMoney onSubmit={onSubmit} />));

    const currency = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Amount currency"]',
    )!;
    const amount = container.querySelector<HTMLInputElement>(
      'input[aria-label="Amount to spend"]',
    )!;

    fireEvent.change(currency, { target: { value: "dollar" } });
    fireEvent.change(amount, { target: { value: "125.50" } });
    fireEvent.submit(container.querySelector("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      amount: "125.50",
      estimation: "dollar",
    });
  });

  it("does not continue with an empty or zero amount", () => {
    const onSubmit = vi.fn();
    act(() => root.render(<SendMoney onSubmit={onSubmit} />));

    fireEvent.submit(container.querySelector("form")!);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "greater than zero",
    );
  });
});
