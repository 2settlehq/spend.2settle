"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Abi, Address, TransactionReceipt } from "viem";
import { config } from "../../../wagmi";
import { useEnsureNetwork } from "./useEnsureNetwork";
import { CHAINS, resolveChainKey } from "./chainConfig";
import { networkType } from "./types";

export function useSpendEVMUSDT() {
  const { address: caller, chainId: connectedChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { ensureNetwork } = useEnsureNetwork();
  const [error, setError] = useState<Error | null>(null);

  const spendEVMUSDT = async (
    receiver: Address,
    amount: bigint,
    isERC20 = false,
    // Called once the wallet has signed and broadcast (before confirmation)
    onSubmitted?: (hash: string) => void
  ): Promise<TransactionReceipt | null> => {
    if (!caller) {
      setError(new Error("Wallet not connected"));
      return null;
    }

    let network: networkType = isERC20 ? "eth" : "bnb";

    try {
      // Mainnet, or BSC Testnet (its test USDT) when enabled and connected
      const chainKey = resolveChainKey(network, connectedChainId);
      const chain = CHAINS[chainKey];
      await ensureNetwork(chainKey);
      // Send the transaction (returns tx hash)
      const hash = await writeContractAsync({
        address: chain.usdtContract,
        abi: chain.abi as Abi,
        functionName: "transfer",
        args: [receiver, amount],
        chainId: chain.id,
      });
      onSubmitted?.(hash);

      // Wait for transaction to be mined
      const { waitForTransactionReceipt } = await import("wagmi/actions");
      const receipt = await waitForTransactionReceipt(config, { hash });

      return receipt;
    } catch (err: any) {
      console.error("Error during EVM USDT transfer:", err);
      setError(err);
      return null;
    }
  };

  return { spendEVMUSDT, error };
}
