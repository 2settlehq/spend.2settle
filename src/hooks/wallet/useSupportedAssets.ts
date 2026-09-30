import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import {
  getConnectedWallet,
  PaymentNetwork,
} from "@/lib/wallets/walletNetworks";

// Form asset values (as used by the chat forms) and the networks they pay on
const FORM_ASSET_NETWORKS: Record<string, PaymentNetwork[]> = {
  BTC: ["btc"],
  ETH: ["eth"],
  BNB: ["bnb"],
  TRON: ["trx"],
  USDT: ["erc20", "bep20", "trc20"],
};

/**
 * Which form assets / USDT networks the connected wallet can pay with.
 * With no wallet connected everything is supported (manual payment).
 */
export function useSupportedAssets() {
  // Subscribe so forms re-render when the wallet or its chain changes
  useWalletStore((s) => s.isConnected);
  useWalletStore((s) => s.walletType);
  useWalletStore((s) => s.chainId);

  const wallet = getConnectedWallet();
  const isNetworkSupported = (network: string) =>
    !wallet || wallet.networks.includes(network.toLowerCase() as PaymentNetwork);

  return {
    // e.g. "Ethereum" when a wallet is connected, null otherwise
    walletName: wallet?.name ?? null,
    isAssetSupported: (asset: string) =>
      (FORM_ASSET_NETWORKS[asset.toUpperCase()] ?? []).some(isNetworkSupported),
    isUsdtNetworkSupported: isNetworkSupported,
  };
}
