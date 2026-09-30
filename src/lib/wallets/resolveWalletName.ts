import { getEnsName } from "wagmi/actions";
import { mainnet } from "wagmi/chains";
import { config } from "@/wagmi";
import { shortWallet } from "@/helpers/ShortenAddress";
import { WalletType } from "./types";

const LOOKUP_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)),
  ]);
}

async function lookupEns(address: `0x${string}`): Promise<string | null> {
  try {
    return await withTimeout(getEnsName(config, { address, chainId: mainnet.id }));
  } catch {
    return null;
  }
}

// .bnb names (Space ID) on BNB Smart Chain
async function lookupBns(address: string): Promise<string | null> {
  try {
    const response = await withTimeout(
      fetch(
        `https://api.prd.space.id/v1/getName?tld=bnb&address=${encodeURIComponent(address)}`,
      ),
    );
    if (!response?.ok) return null;
    const data = await response.json();
    return typeof data?.name === "string" && data.name ? data.name : null;
  } catch {
    return null;
  }
}

/**
 * How to show the connected wallet to the user: its ENS or .bnb name for EVM
 * wallets when one is set, otherwise the truncated address (e.g. 0x12ab...cd34).
 */
export async function resolveWalletName(
  walletType: WalletType,
  address: string,
): Promise<string> {
  if (walletType === "EVM" && address.startsWith("0x")) {
    const name =
      (await lookupEns(address as `0x${string}`)) ?? (await lookupBns(address));
    if (name) return name;
  }
  return shortWallet(address) ?? address;
}
