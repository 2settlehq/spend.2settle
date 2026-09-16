import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BankDetailsInputs } from "@/components/manualTransactionForm/bank-details-inputs";
import { fetchBankNames, fetchBankDetails } from "@/services/bank/bank.service";

vi.mock("@/services/bank/bank.service", () => ({ fetchBankNames: vi.fn(), fetchBankDetails: vi.fn() }));

function BankForm({ onSubmit, compact = true }: { onSubmit: () => void; compact?: boolean }) {
  const [bank, setBank] = useState({ name: "", code: "" });
  return <form aria-label="Bank form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <BankDetailsInputs compact={compact} bankName={bank.name} bankCode={bank.code} accountNumber="" accountName="" onBankSelect={(name, code) => setBank({ name, code })} onAccountNumberChange={() => {}} onAccountNameChange={() => {}} />
    <button type="submit">Submit</button>
  </form>;
}

describe("required bank dropdown selection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // The service's legacy BankName type extends a SQL row; the API returns JSON.
    vi.mocked(fetchBankNames).mockResolvedValue({ message: ["1. OPAY 100004"] } as unknown as Awaited<ReturnType<typeof fetchBankNames>>);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  const search = async () => {
    fireEvent.change(screen.getByLabelText("Bank Name"), { target: { value: "OPAY" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
  };
  it.each([true, false])("blocks a typed name and identifies the bank field (compact=%s)", async (compact) => {
    const submit = vi.fn();
    render(<BankForm onSubmit={submit} compact={compact} />);
    await search();
    const input = screen.getByLabelText("Bank Name") as HTMLInputElement;
    const form = screen.getByRole("form") as HTMLFormElement;
    act(() => form.requestSubmit());
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Please select your bank from the dropdown list.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.className).toContain("border-red-500");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
    expect(fetchBankDetails).not.toHaveBeenCalled();
  });
  it("shows the selection error when leaving an unselected bank field", async () => {
    render(<BankForm onSubmit={vi.fn()} />);
    await search();
    fireEvent.blur(screen.getByLabelText("Bank Name"), { relatedTarget: screen.getByLabelText("Account Number") });
    expect(screen.getByRole("alert")).toBeTruthy();
  });
  it("clears the error and permits submission after choosing a list option", async () => {
    const submit = vi.fn();
    render(<BankForm onSubmit={submit} />);
    await search();
    const form = screen.getByRole("form") as HTMLFormElement;
    act(() => form.requestSubmit());
    fireEvent.click(screen.getByRole("button", { name: "OPAY" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByLabelText("Bank Name") as HTMLInputElement).validity.valid).toBe(true);
    expect(screen.getByLabelText("Bank Name").className).not.toContain("border-red-500");
    act(() => form.requestSubmit());
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("requires a new selection after editing a previously selected name", async () => {
    const submit = vi.fn();
    render(<BankForm onSubmit={submit} />);
    await search();
    const input = screen.getByLabelText("Bank Name") as HTMLInputElement;
    fireEvent.blur(input, { relatedTarget: screen.getByRole("button", { name: "OPAY" }) });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "OPAY" }));
    fireEvent.change(input, { target: { value: "OPAY edited" } });
    act(() => (screen.getByRole("form") as HTMLFormElement).requestSubmit());
    expect(submit).not.toHaveBeenCalled();
    expect(input.validity.valid).toBe(false);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
