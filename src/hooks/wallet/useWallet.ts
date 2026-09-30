import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useBTCWallet } from "stores/btcWalletStore";
import useTronWallet from "stores/tronWalletStore";
import { useWalletStore } from "./useWalletStore";
import { WalletAddress } from "@/lib/wallets/types";
import { resolveWalletName } from "@/lib/wallets/resolveWalletName";

/**
 * Syncs wallet connection state from all three chains (EVM, BTC, TRON)
 * into the unified useWalletStore.
 *
 * Call once near the top of your app (e.g. layout or _app).
 * Then read from useWalletStore() anywhere else.
 */
export function useWallet() {
  const {
    isConnected: isEVM,
    address: evmAddress,
    chainId: evmChainId,
  } = useAccount();
  const { isConnected: isBTC, paymentAddress } = useBTCWallet();
  const { connected: isTron, walletAddress: tronAddress } = useTronWallet();
  const { setWallet, clearWallet, isConnected, address, walletType } =
    useWalletStore();

  useEffect(() => {
    if (isEVM && evmAddress) {
      setWallet("EVM", evmAddress as WalletAddress, evmChainId ?? null);
    } else if (isBTC && paymentAddress) {
      setWallet("BTC", paymentAddress as WalletAddress);
    } else if (isTron && tronAddress) {
      setWallet("TRC20", tronAddress as WalletAddress);
    } else {
      clearWallet();
    }
  }, [isEVM, evmAddress, evmChainId, isBTC, paymentAddress, isTron, tronAddress]);

  // Resolve the ENS / .bnb name (or truncated address) once per address
  useEffect(() => {
    if (!isConnected || !address || !walletType) return;
    if (useWalletStore.getState().displayName) return;

    resolveWalletName(walletType, address).then((name) =>
      useWalletStore.getState().setDisplayName(address, name),
    );
  }, [isConnected, address, walletType]);

  return { isConnected, address, walletType };
}
