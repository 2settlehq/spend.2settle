import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import {
  CHAINS,
  TESTNETS_ENABLED,
} from "@/services/transactionService/cryptoService/chainConfig";

// Chat-side network ids, as stored in usePaymentStore.network (case-insensitive)
export type PaymentNetwork = "btc" | "eth" | "bnb" | "trx" | "erc20" | "bep20" | "trc20";

const NETWORK_LABELS: Record<PaymentNetwork, string> = {
  btc: "BTC",
  eth: "ETH",
  bnb: "BNB",
  trx: "TRX",
  erc20: "USDT (ERC20)",
  bep20: "USDT (BEP20)",
  trc20: "USDT (TRC20)",
};

export interface PaymentChain {
  chainId: number;
  name: string;
  icon: string;
  // Assets a wallet on this chain can be debited for
  networks: PaymentNetwork[];
}

/**
 * The EVM chains we take payment on — the single source for which assets a
 * wallet can pay, the network switcher, and the unsupported-chain notice.
 * BSC Testnet is included only with NEXT_PUBLIC_ENABLE_TESTNETS=true.
 */
export const PAYMENT_CHAINS: PaymentChain[] = [
  {
    chainId: CHAINS.eth.id,
    name: "Ethereum",
    icon: "/networks/ethereum.svg",
    networks: ["eth", "erc20"],
  },
  {
    chainId: CHAINS.bnb.id,
    name: "BNB Smart Chain",
    icon: "/networks/bnb.svg",
    networks: ["bnb", "bep20"],
  },
  ...(TESTNETS_ENABLED
    ? [
        {
          chainId: CHAINS.bscTestnet.id,
          name: "BNB Smart Chain Testnet",
          icon: "/networks/bnb.svg",
          networks: ["bnb", "bep20"] as PaymentNetwork[],
        },
      ]
    : []),
];

export function getPaymentChain(chainId?: number | null): PaymentChain | undefined {
  return PAYMENT_CHAINS.find((chain) => chain.chainId === chainId);
}

// e.g. "Ethereum or BNB Smart Chain"
const PAYMENT_CHAIN_NAMES = PAYMENT_CHAINS.map((chain) => chain.name)
  .join(", ")
  .replace(/, ([^,]*)$/, " or $1");

/**
 * The payment network for a chat form's asset + network selection.
 * Forms send BNB as "BEP20" and TRON as "TRC20", so the asset decides first.
 */
export function toPaymentNetwork(
  crypto: string,
  network: string,
): PaymentNetwork | null {
  switch (crypto.toUpperCase()) {
    case "BTC":
      return "btc";
    case "ETH":
      return "eth";
    case "BNB":
      return "bnb";
    case "TRON":
    case "TRX":
      return "trx";
    case "USDT": {
      const usdtNetwork = network.toLowerCase();
      return usdtNetwork === "erc20" || usdtNetwork === "bep20" || usdtNetwork === "trc20"
        ? usdtNetwork
        : null;
    }
    default:
      return null;
  }
}

type ConnectedWallet = { name: string; networks: PaymentNetwork[] };

/**
 * The connected wallet and the networks it can be debited on,
 * or null when no wallet is connected (manual payment, anything goes).
 */
export function getConnectedWallet(): ConnectedWallet | null {
  const { isConnected, walletType, chainId } = useWalletStore.getState();
  if (!isConnected) return null;

  switch (walletType) {
    case "BTC":
      return { name: "Bitcoin", networks: ["btc"] };
    case "TRC20":
    case "TRX":
      return { name: "TRON", networks: ["trx", "trc20"] };
    case "EVM": {
      const chain = getPaymentChain(chainId);
      return chain
        ? { name: chain.name, networks: chain.networks }
        : { name: "an unsupported EVM network", networks: [] };
    }
    default:
      return null;
  }
}

/**
 * Checks that the connected wallet can pay on any of the given networks.
 * Returns an error message for the user, or null when payment is allowed.
 */
export function getWalletNetworkError(networks: string[]): string | null {
  const wallet = getConnectedWallet();
  if (!wallet) return null;

  const wanted = networks.map((n) => n.toLowerCase());
  if (wallet.networks.some((n) => wanted.includes(n))) return null;

  const requested = wanted
    .map((n) => NETWORK_LABELS[n as PaymentNetwork] ?? n.toUpperCase())
    .join(" / ");

  if (wallet.networks.length === 0) {
    return `Your wallet is connected to ${wallet.name}. Switch your wallet to ${PAYMENT_CHAIN_NAMES}, or disconnect it to pay manually.`;
  }

  const allowed = wallet.networks.map((n) => NETWORK_LABELS[n]).join(" or ");
  return `${requested} is not supported by your connected ${wallet.name} wallet. You can only pay with ${allowed}.\nSwitch or disconnect your wallet to pay with ${requested}.`;
}
