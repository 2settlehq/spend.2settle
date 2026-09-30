import { getEnsAvatar, getEnsName } from "wagmi/actions";
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

async function lookupEnsAvatar(name: string): Promise<string | null> {
  try {
    return await withTimeout(getEnsAvatar(config, { name, chainId: mainnet.id }));
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

export interface WalletIdentity {
  name: string;
  avatar: string | null;
}

/**
 * How to show the connected wallet to the user: its ENS (with avatar, if set)
 * or .bnb name for EVM wallets, otherwise the truncated address
 * (e.g. 0x12ab...cd34) and no avatar.
 */
export async function resolveWalletIdentity(
  walletType: WalletType,
  address: string,
): Promise<WalletIdentity> {
  if (walletType === "EVM" && address.startsWith("0x")) {
    const ensName = await lookupEns(address as `0x${string}`);
    if (ensName) {
      return { name: ensName, avatar: await lookupEnsAvatar(ensName) };
    }

    const bnsName = await lookupBns(address);
    if (bnsName) return { name: bnsName, avatar: null };
  }
  return { name: shortWallet(address) ?? address, avatar: null };
}
