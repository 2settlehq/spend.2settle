import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_TIMEOUT_MS,
  InsufficientBalanceError,
  runWalletDebit,
  WalletDebitError,
} from "@/lib/wallets/walletDebitSession";

function setup(overrides: Partial<Parameters<typeof runWalletDebit>[0]> = {}) {
  const closeSession = vi.fn().mockResolvedValue(true);
  const onLateApproval = vi.fn();
  const options = {
    checkBalance: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    closeSession,
    onLateApproval,
    ...overrides,
  };
  return { options, closeSession, onLateApproval };
}

describe("runWalletDebit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the hash and keeps the session when the wallet sends", async () => {
    const { options, closeSession } = setup({
      send: (onSubmitted) => {
        onSubmitted("0xhash");
        return Promise.resolve("0xhash");
      },
    });

    await expect(runWalletDebit(options)).resolves.toBe("0xhash");
    expect(closeSession).not.toHaveBeenCalled();
  });

  it("closes the session straight away when the balance is too low", async () => {
    const send = vi.fn();
    const { options, closeSession } = setup({
      checkBalance: () =>
        Promise.reject(new InsufficientBalanceError("Your wallet doesn't have enough USDT.")),
      send,
    });

    const error = await runWalletDebit(options).catch((e) => e);
    expect(error).toBeInstanceOf(WalletDebitError);
    expect(error).toMatchObject({
      message: "Your wallet doesn't have enough USDT.",
      sent: false,
      sessionClosed: true,
    });
    expect(send).not.toHaveBeenCalled(); // no wallet prompt
    expect(closeSession).toHaveBeenCalledOnce();
  });

  it("closes the session when the user rejects / closes the wallet prompt", async () => {
    const { options, closeSession } = setup({
      send: () => Promise.reject(new Error("User rejected the request.")),
    });

    await expect(runWalletDebit(options)).rejects.toMatchObject({
      message: "The payment wasn't approved in your wallet.",
      sent: false,
    });
    expect(closeSession).toHaveBeenCalledOnce();
  });

  it("closes the session after 5 minutes without approval, and reports a late approval", async () => {
    let approve!: (hash: string) => void;
    const { options, closeSession, onLateApproval } = setup({
      send: () => new Promise<string>((resolve) => (approve = resolve)),
    });

    const result = runWalletDebit(options).catch((e) => e);
    await vi.advanceTimersByTimeAsync(CONSENT_TIMEOUT_MS - 1);
    expect(closeSession).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    const error = await result;
    expect(error).toMatchObject({
      message: "You didn't approve the payment in your wallet within 5 minutes.",
      sent: false,
      sessionClosed: true,
    });
    expect(closeSession).toHaveBeenCalledOnce();

    approve("0xlate");
    await vi.runAllTimersAsync();
    expect(onLateApproval).toHaveBeenCalledWith("0xlate");
  });

  it("does not time out once the transaction was sent, even if confirming takes long", async () => {
    let confirm!: (hash: string) => void;
    const { options, closeSession } = setup({
      send: (onSubmitted) => {
        onSubmitted("0xsent");
        return new Promise<string>((resolve) => (confirm = resolve));
      },
    });

    const result = runWalletDebit(options);
    await vi.advanceTimersByTimeAsync(CONSENT_TIMEOUT_MS * 3);
    confirm("0xsent");

    await expect(result).resolves.toBe("0xsent");
    expect(closeSession).not.toHaveBeenCalled();
  });

  it("never closes the session when a sent transaction fails afterwards", async () => {
    const { options, closeSession } = setup({
      send: (onSubmitted) => {
        onSubmitted("0xsent");
        return Promise.reject(new Error("The transaction failed on-chain"));
      },
    });

    const error = await runWalletDebit(options).catch((e) => e);
    expect(error).not.toBeInstanceOf(WalletDebitError);
    expect(error.message).toBe("The transaction failed on-chain");
    expect(closeSession).not.toHaveBeenCalled();
  });
});
