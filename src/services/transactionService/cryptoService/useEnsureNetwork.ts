import { useAccount, useSwitchChain } from "wagmi";
import { CHAINS } from "./chainConfig";

export function useEnsureNetwork() {
  const { switchChainAsync } = useSwitchChain();
  // wagmi's chain works for injected and WalletConnect (mobile) wallets alike;
  // window.ethereum.networkVersion is undefined for WalletConnect
  const { chainId } = useAccount();

  async function ensureNetwork(targetChain: keyof typeof CHAINS) {
    const target = CHAINS[targetChain];

    console.log("chainId is", chainId);
    if (chainId !== target.id) {
      await switchChainAsync({ chainId: target.id });
      console.log(`Switched to ${target.name}`);
    }
  }
  return { ensureNetwork };
}
