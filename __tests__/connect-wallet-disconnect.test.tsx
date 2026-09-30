import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (globalThis as any).React = require("react");
});

const disconnectEvm = vi.fn();
let evmAccount: Record<string, unknown> = { isConnected: false };
const switchChainAsync = vi.fn();
vi.mock("wagmi", () => ({
  useAccount: () => evmAccount,
  useDisconnect: () => ({ disconnect: disconnectEvm }),
  useSwitchChain: () => ({ switchChainAsync, isPending: false, variables: undefined }),
  useChains: () => [{ id: 1 }, { id: 56 }],
}));
vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => <button>rainbowkit-button</button>,
}));
vi.mock("@/helpers/tron/connect_tron_wallet", () => ({
  connectTronWallet: vi.fn(),
  listenForTronUnlock: vi.fn(),
  refreshTronWallet: vi.fn(),
}));
vi.mock("@/lib/wallets/walletConnectRelay", () => ({
  probeWalletConnectRelay: vi.fn().mockResolvedValue("ok"),
}));
vi.mock("@/components/crypto/ConnectBTCButton", () => ({ default: () => null }));
vi.mock("@/components/shared/Logo", () => ({ default: () => null }));

import ConnectWallet from "@/components/crypto/ConnectWallet";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import { useBTCWallet } from "stores/btcWalletStore";
import useTronWallet from "stores/tronWalletStore";

const EVM_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

describe("ConnectWallet connected state", () => {
  beforeEach(() => {
    evmAccount = { isConnected: false };
    useWalletStore.getState().clearWallet();
    useBTCWallet.setState({ isConnected: false, paymentAddress: undefined } as any);
    useTronWallet.getState().clearWallet();
  });
  afterEach(cleanup);

  it("EVM: shows name, avatar with network badge, and a reachable Disconnect", () => {
    evmAccount = {
      isConnected: true,
      address: EVM_ADDRESS,
      chainId: 1,
      chain: { name: "Ethereum" },
    };
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);
    useWalletStore
      .getState()
      .setDisplayName(EVM_ADDRESS, "vitalik.eth", "https://avatar.example/v.png");

    const { container } = render(<ConnectWallet />);

    // RainbowKit's button (and its account sheet) is no longer the trigger
    expect(screen.queryByText("rainbowkit-button")).toBeNull();
    const chip = screen.getByRole("button", { name: "vitalik.eth on Ethereum" });
    const images = Array.from(chip.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(images).toEqual(["https://avatar.example/v.png", "/networks/ethereum.svg"]);

    fireEvent.click(chip);
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(disconnectEvm).toHaveBeenCalled();
    expect(container).toBeTruthy();
  });

  it("drops an avatar that isn't a plain https or data image", () => {
    evmAccount = { isConnected: true, address: EVM_ADDRESS, chainId: 56, chain: { name: "BNB Smart Chain" } };
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 56);
    useWalletStore.getState().setDisplayName(EVM_ADDRESS, "name.bnb", "javascript:alert(1)");

    render(<ConnectWallet />);

    const chip = screen.getByRole("button", { name: "name.bnb on BNB Smart Chain" });
    const images = Array.from(chip.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(images).toEqual(["/networks/bnb.svg"]);
  });

  it("EVM: switches network from the wallet panel", async () => {
    evmAccount = { isConnected: true, address: EVM_ADDRESS, chainId: 1, chain: { name: "Ethereum" } };
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);

    render(<ConnectWallet />);
    fireEvent.click(screen.getByRole("button", { name: "0xd8d...6045 on Ethereum" }));

    const ethereum = screen.getByRole("button", { name: /^Ethereum/ });
    expect(ethereum.getAttribute("aria-pressed")).toBe("true");
    expect(ethereum.hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^BNB Smart Chain/ }));
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 56 });
  });

  it("EVM: explains a rejected switch", async () => {
    evmAccount = { isConnected: true, address: EVM_ADDRESS, chainId: 1, chain: { name: "Ethereum" } };
    switchChainAsync.mockRejectedValueOnce(new Error("User rejected"));

    render(<ConnectWallet />);
    fireEvent.click(screen.getByRole("button", { name: "0xd8d...6045 on Ethereum" }));
    fireEvent.click(screen.getByRole("button", { name: /^BNB Smart Chain/ }));

    expect(await screen.findByText(/Network not switched/)).toBeTruthy();
  });

  it("BTC: same chip with the Bitcoin icon, disconnects the BTC wallet", () => {
    const disconnectBtc = vi.fn();
    useBTCWallet.setState({
      isConnected: true,
      paymentAddress: "bc1qexampleaddress1234",
      disconnect: disconnectBtc,
    } as any);

    render(<ConnectWallet />);

    fireEvent.click(screen.getByRole("button", { name: "bc1qe...1234 on Bitcoin" }));
    // Network switching is EVM-only
    expect(screen.queryByRole("button", { name: /^BNB Smart Chain/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(disconnectBtc).toHaveBeenCalled();
  });

  it("TRON: same chip with the TRON icon, balances, and disconnect", () => {
    useTronWallet.setState({
      connected: true,
      walletAddress: "TXYZabcdefghijklmnop1234",
      trxBalance: "12.5",
      usdtBalance: 40,
    } as any);

    render(<ConnectWallet />);

    fireEvent.click(screen.getByRole("button", { name: "TXYZa...1234 on TRON" }));
    expect(screen.getByText("12.5 TRX · 40 USDT")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(useTronWallet.getState().connected).toBe(false);
  });
});
