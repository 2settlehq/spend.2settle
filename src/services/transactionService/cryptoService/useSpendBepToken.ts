import { useState } from "react";
import { waitForTransactionReceipt, sendTransaction } from "wagmi/actions";
import { Address, parseEther } from "viem";
import type { TransactionReceipt } from "viem";
import { useAccount } from "wagmi";
import { config } from "../../../wagmi";
import { CHAINS, resolveChainKey } from "./chainConfig";
import { useEnsureNetwork } from "./useEnsureNetwork";

export function useSpendNative() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { ensureNetwork } = useEnsureNetwork();
  const { chainId: connectedChainId } = useAccount();

  async function spendNative(
    recipient: Address,
    amountInEther: string,
    network: "eth" | "bnb",
    // Called once the wallet has signed and broadcast (before confirmation)
    onSubmitted?: (hash: string) => void
  ): Promise<TransactionReceipt | null> {
    // Mainnet, or BSC Testnet (test BNB) when enabled and connected
    const chainKey = resolveChainKey(network, connectedChainId);
    const chain = CHAINS[chainKey];
    await ensureNetwork(chainKey);

    try {
      setIsLoading(true);
      setError(null);

      const hash = await sendTransaction(config, {
        to: recipient,
        value: parseEther(amountInEther),
        chainId: chain.id,
      });
      onSubmitted?.(hash);

      const receipt = await waitForTransactionReceipt(config, {
        hash,
      });

      return receipt;
    } catch (err: any) {
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { spendNative, isLoading, error };
}
