"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { CHAINS } from "@/services/transactionService/cryptoService/chainConfig";

const SWITCH_TARGETS = [CHAINS.eth, CHAINS.bnb];

interface WalletAssetNoticeProps {
  walletName: string | null;
  hasOptions: boolean;
}

/**
 * Explains why the asset list is limited to the connected wallet, and when the
 * wallet is on a chain we can't debit (e.g. Base, Polygon), offers to switch it.
 */
export function WalletAssetNotice({ walletName, hasOptions }: WalletAssetNoticeProps) {
  const { chain, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [error, setError] = useState("");

  if (!walletName) return null;

  if (hasOptions) {
    return (
      <p className="col-span-2 text-[11px] text-gray-600">
        Showing assets your connected {walletName} wallet can pay with.
      </p>
    );
  }

  const switchTo = async (chainIdToUse: number) => {
    setError("");
    try {
      await switchChainAsync({ chainId: chainIdToUse });
    } catch (err) {
      console.error("Failed to switch wallet network:", err);
      setError("Could not switch network. Please switch it in your wallet.");
    }
  };

  return (
    <div className="col-span-2 space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
      <p>
        Your wallet is on{" "}
        <b>{chain?.name ?? (chainId ? `chain ${chainId}` : "an unsupported network")}</b>,
        which we can&apos;t accept payment from. Switch network, or disconnect
        your wallet to pay manually.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SWITCH_TARGETS.map((target) => (
          <button
            key={target.id}
            type="button"
            disabled={isPending}
            onClick={() => switchTo(target.id)}
            className="rounded border border-amber-300 bg-white px-2 py-1 font-medium hover:bg-amber-100 disabled:opacity-60"
          >
            Switch to {target.name}
          </button>
        ))}
      </div>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
