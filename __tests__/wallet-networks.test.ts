import { beforeEach, describe, expect, it } from "vitest";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import { getWalletNetworkError } from "@/lib/wallets/walletNetworks";

const EVM_ADDRESS = "0x1111111111111111111111111111111111111111";

describe("getWalletNetworkError", () => {
  beforeEach(() => {
    useWalletStore.getState().clearWallet();
  });

  it("allows any network when no wallet is connected", () => {
    expect(getWalletNetworkError(["bep20"])).toBeNull();
    expect(getWalletNetworkError(["btc"])).toBeNull();
  });

  it("limits an Ethereum wallet to ETH and USDT ERC20", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);

    expect(getWalletNetworkError(["eth"])).toBeNull();
    expect(getWalletNetworkError(["ERC20"])).toBeNull();
    expect(getWalletNetworkError(["bnb"])).toMatch(/only pay with ETH or USDT \(ERC20\)/);
    expect(getWalletNetworkError(["BEP20"])).toMatch(/USDT \(BEP20\) is not supported/);
    expect(getWalletNetworkError(["trc20"])).not.toBeNull();
  });

  it("limits a BNB Smart Chain wallet to BNB and USDT BEP20", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 56);

    expect(getWalletNetworkError(["bep20"])).toBeNull();
    expect(getWalletNetworkError(["bnb"])).toBeNull();
    expect(getWalletNetworkError(["erc20"])).not.toBeNull();
    expect(getWalletNetworkError(["eth"])).not.toBeNull();
  });

  it("rejects everything for an EVM wallet on an unsupported chain", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 137);

    expect(getWalletNetworkError(["erc20"])).toMatch(/Switch your wallet to Ethereum or BNB Smart Chain/);
  });

  it("allows USDT when any of its networks fits the wallet", () => {
    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 1);
    expect(getWalletNetworkError(["erc20", "bep20", "trc20"])).toBeNull();

    useWalletStore.getState().setWallet("BTC", "bc1qexample");
    expect(getWalletNetworkError(["erc20", "bep20", "trc20"])).not.toBeNull();
  });

  it("limits a TRON wallet to TRX and USDT TRC20", () => {
    useWalletStore.getState().setWallet("TRC20", "TXYZexample");

    expect(getWalletNetworkError(["trx"])).toBeNull();
    expect(getWalletNetworkError(["trc20"])).toBeNull();
    expect(getWalletNetworkError(["erc20"])).not.toBeNull();
  });
});
