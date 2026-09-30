import React from "react";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSupportedAssets } from "@/hooks/wallet/useSupportedAssets";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import TransferForm from "@/components/chatbot/TransferForm";

// The form components use JSX without importing React
vi.hoisted(() => {
  (globalThis as any).React = require("react");
});

vi.mock("@/features/chatbot/handlers/chatHandlers/handle.ai.chat", () => ({
  handleTransferFormSubmission: vi.fn(),
}));
vi.mock("@/components/manualTransactionForm/bank-details-inputs", () => ({
  BankDetailsInputs: () => null,
}));
vi.mock("@/hooks/chatbot/useFormWalletDebit", () => ({
  useFormWalletDebit: () => () => undefined,
}));
const switchChainAsync = vi.fn();
vi.mock("wagmi", () => ({
  useAccount: () => ({ chainId: 8453, chain: { name: "Base" } }),
  useSwitchChain: () => ({ switchChainAsync, isPending: false }),
}));

const EVM_ADDRESS = "0x1111111111111111111111111111111111111111";
const ASSETS = ["BTC", "ETH", "BNB", "TRON", "USDT"];

function supported() {
  const { result } = renderHook(() => useSupportedAssets());
  return {
    assets: ASSETS.filter(result.current.isAssetSupported),
    usdt: ["ERC20", "TRC20", "BEP20"].filter(result.current.isUsdtNetworkSupported),
    walletName: result.current.walletName,
  };
}

describe("useSupportedAssets", () => {
  beforeEach(() => useWalletStore.getState().clearWallet());
  afterEach(cleanup);

  it("offers everything with no wallet connected", () => {
    expect(supported()).toEqual({
      assets: ASSETS,
      usdt: ["ERC20", "TRC20", "BEP20"],
      walletName: null,
    });
  });

  it("offers ETH and USDT ERC20 for an Ethereum wallet", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);
    expect(supported()).toMatchObject({ assets: ["ETH", "USDT"], usdt: ["ERC20"] });
  });

  it("offers BNB and USDT BEP20 for a BNB Smart Chain wallet", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 56);
    expect(supported()).toMatchObject({ assets: ["BNB", "USDT"], usdt: ["BEP20"] });
  });

  it("offers TRON and USDT TRC20 for a TRON wallet", () => {
    useWalletStore.getState().setWallet("TRC20", "TXYZexample");
    expect(supported()).toMatchObject({ assets: ["TRON", "USDT"], usdt: ["TRC20"] });
  });

  it("offers only BTC for a Bitcoin wallet", () => {
    useWalletStore.getState().setWallet("BTC", "bc1qexample");
    expect(supported()).toMatchObject({ assets: ["BTC"], usdt: [] });
  });
});

describe("TransferForm with a connected wallet", () => {
  beforeEach(() => useWalletStore.getState().clearWallet());
  afterEach(cleanup);

  it("clears an AI preset the wallet can't pay with", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);
    render(<TransferForm initialValues={{ crypto: "USDT", network: "TRC20" }} />);

    expect(
      screen.getByText("Showing assets your connected Ethereum wallet can pay with."),
    ).toBeTruthy();
    // USDT stays (ERC20 is payable) and the network is set to the only option
    expect(screen.getByRole("combobox", { name: "Crypto asset" }).textContent).toContain("USDT");
    expect(screen.getByRole("combobox", { name: "Network" }).textContent).toContain("ERC20");
  });

  it("empties the asset when it isn't payable at all", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);
    render(<TransferForm initialValues={{ crypto: "BTC" }} />);

    expect(screen.getByRole("combobox", { name: "Crypto asset" }).textContent).toContain(
      "Select asset",
    );
  });

  it("keeps the preset and shows no hint with no wallet", () => {
    render(<TransferForm initialValues={{ crypto: "BTC" }} />);

    expect(screen.getByRole("combobox", { name: "Crypto asset" }).textContent).toContain("BTC");
    expect(screen.queryByText(/Showing assets your connected/)).toBeNull();
  });

  it("explains an unsupported chain and offers to switch instead of an empty list", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 8453);
    render(<TransferForm initialValues={{ crypto: "ETH" }} />);

    expect(screen.getByText("Base")).toBeTruthy();
    const assetSelect = screen.getByRole("combobox", { name: "Crypto asset" });
    expect(assetSelect.hasAttribute("disabled")).toBe(true);

    screen.getByRole("button", { name: "Switch to Ethereum Mainnet" }).click();
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 1 });
  });
});
