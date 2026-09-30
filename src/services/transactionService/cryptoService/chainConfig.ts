import { bscTestnet } from "viem/chains";
import {
  BEP20_ABI,
  BEP20_CONTRACT,
  BEP20_TEST_ABI,
  BEP20_TEST_CONTRACT,
  ERC20_ABI,
  ERC20_CONTRACT,
} from "./cryptoConstants";

// Dev/staging switch for testnet payments (NEXT_PUBLIC_ENABLE_TESTNETS=true)
export const TESTNETS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true";

export const CHAINS = {
  eth: {
    id: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/af7468d0f18b4e4e922976ab88098c80",
    nativeSymbol: "ETH",
    usdtContract: ERC20_CONTRACT,
    abi: ERC20_ABI,
    network: "eth",
  },
  bnb: {
    id: 56,
    name: "Binance Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    nativeSymbol: "BNB",
    usdtContract: BEP20_CONTRACT,
    abi: BEP20_ABI,
    network: "bnb",
  },
  bscTestnet: {
    id: bscTestnet.id, // 97
    name: "Binance Smart Chain Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    nativeSymbol: "tBNB",
    usdtContract: BEP20_TEST_CONTRACT,
    abi: BEP20_TEST_ABI,
    network: "bnb",
  },
} as const;

export type ChainKey = keyof typeof CHAINS;

/**
 * Which CHAINS entry to pay on for a network, given the wallet's current chain:
 * BNB / USDT BEP20 go to BSC Testnet when testnets are enabled and the wallet
 * is on it, otherwise mainnet.
 */
export function resolveChainKey(
  network: "eth" | "bnb",
  connectedChainId?: number,
): ChainKey {
  if (
    network === "bnb" &&
    TESTNETS_ENABLED &&
    connectedChainId === CHAINS.bscTestnet.id
  ) {
    return "bscTestnet";
  }
  return network;
}
