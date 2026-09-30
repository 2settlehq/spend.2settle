import { afterEach, describe, expect, it, vi } from "vitest";

// PAYMENT_CHAINS and TESTNETS_ENABLED are read at module load, so each case
// sets the flag and imports fresh modules
async function load(flag: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_ENABLE_TESTNETS", flag as string);
  const walletNetworks = await import("@/lib/wallets/walletNetworks");
  const chainConfig = await import("@/services/transactionService/cryptoService/chainConfig");
  const { useWalletStore } = await import("@/hooks/wallet/useWalletStore");
  return { ...walletNetworks, ...chainConfig, useWalletStore };
}

const EVM_ADDRESS = "0x1111111111111111111111111111111111111111";

// Fresh module imports are slow when the whole suite runs in parallel
describe("payment chains and the testnet flag", { timeout: 60_000 }, () => {
  afterEach(() => vi.unstubAllEnvs());

  it("offers only Ethereum and BNB Smart Chain with testnets off", async () => {
    const { PAYMENT_CHAINS, resolveChainKey, useWalletStore, getWalletNetworkError } =
      await load("false");

    expect(PAYMENT_CHAINS.map((c) => c.chainId)).toEqual([1, 56]);
    expect(resolveChainKey("bnb", 97)).toBe("bnb");

    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 97);
    expect(getWalletNetworkError(["bep20"])).toMatch(
      /Switch your wallet to Ethereum or BNB Smart Chain,/,
    );
  });

  it("adds BSC Testnet (chain 97) with testnets on", async () => {
    const { PAYMENT_CHAINS, CHAINS, resolveChainKey, useWalletStore, getWalletNetworkError } =
      await load("true");

    expect(CHAINS.bscTestnet.id).toBe(97);
    expect(PAYMENT_CHAINS.map((c) => c.chainId)).toEqual([1, 56, 97]);

    // Debits go to the testnet chain + test USDT only when the wallet is on it
    expect(resolveChainKey("bnb", 97)).toBe("bscTestnet");
    expect(resolveChainKey("bnb", 56)).toBe("bnb");
    expect(resolveChainKey("eth", 97)).toBe("eth");

    useWalletStore.getState().setWallet("EVM", EVM_ADDRESS, 97);
    expect(getWalletNetworkError(["bep20"])).toBeNull();
    expect(getWalletNetworkError(["bnb"])).toBeNull();
    expect(getWalletNetworkError(["erc20"])).toMatch(/BNB Smart Chain Testnet/);
  });
});
