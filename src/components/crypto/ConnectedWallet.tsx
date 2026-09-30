"use client";

import React, { forwardRef, useState } from "react";
import { MdContentCopy, MdKeyboardArrowDown, MdLogout } from "react-icons/md";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { shortWallet } from "@/helpers/ShortenAddress";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import { usePaymentChains } from "@/hooks/wallet/usePaymentChains";
import { getPaymentChain } from "@/lib/wallets/walletNetworks";
import { useBTCWallet } from "stores/btcWalletStore";
import useTronWallet from "stores/tronWalletStore";



export interface ConnectedWalletInfo {
  address: string;
  label: string; // ENS / .bnb name, or truncated address
  avatar: string | null;
  networkName: string;
  networkIcon: string | null;
  // EVM only: the current chain, which the panel lets the user switch
  chainId?: number;
  balances?: string[];
  disconnect: () => void;
}

// Avatars are URLs the wallet owner controls; only load plain images
function safeAvatar(url: string | null): string | null {
  return url && /^(https:\/\/|data:image\/)/i.test(url) ? url : null;
}

/** The connected wallet (EVM, BTC or TRON) in one shape, or null if none */
export function useConnectedWallet(): ConnectedWalletInfo | null {
  const evm = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();
  const btc = useBTCWallet();
  const tron = useTronWallet();
  const displayName = useWalletStore((s) => s.displayName);
  const displayAvatar = useWalletStore((s) => s.displayAvatar);

  const identity = (address: string) => ({
    address,
    label: displayName ?? shortWallet(address) ?? address,
    avatar: safeAvatar(displayAvatar),
  });

  if (evm.isConnected && evm.address) {
    return {
      ...identity(evm.address),
      networkName: evm.chain?.name ?? "Unsupported network",
      networkIcon: getPaymentChain(evm.chainId)?.icon ?? null,
      chainId: evm.chainId,
      disconnect: () => disconnectEvm(),
    };
  }

  if (btc.isConnected && btc.paymentAddress) {
    return {
      ...identity(btc.paymentAddress),
      networkName: "Bitcoin",
      networkIcon: "/networks/bitcoin.svg",
      disconnect: btc.disconnect,
    };
  }

  if (tron.connected && tron.walletAddress) {
    return {
      ...identity(tron.walletAddress),
      networkName: "TRON",
      networkIcon: "/networks/tron.svg",
      balances: [
        `${tron.trxBalance.toString()} TRX`,
        `${tron.usdtBalance} USDT`,
      ],
      disconnect: tron.clearWallet,
    };
  }

  return null;
}

/** Avatar with a network badge, or just the network icon when there's no avatar */
function WalletIcon({
  wallet,
  size,
}: {
  wallet: ConnectedWalletInfo;
  size: "sm" | "lg";
}) {
  const box = size === "sm" ? "h-6 w-6" : "h-14 w-14";
  const badge = size === "sm" ? "h-3 w-3" : "h-5 w-5";

  const networkIcon = wallet.networkIcon ? (
    <img src={wallet.networkIcon} alt={wallet.networkName} className="h-full w-full" />
  ) : (
    // Unknown network: its initial
    <span className="flex h-full w-full items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-gray-700">
      {wallet.networkName.charAt(0)}
    </span>
  );

  if (!wallet.avatar) {
    return <span className={`inline-block shrink-0 ${box}`}>{networkIcon}</span>;
  }

  return (
    <span className={`relative inline-block shrink-0 ${box}`}>
      <img
        src={wallet.avatar}
        alt=""
        className="h-full w-full rounded-full object-cover"
      />
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-px ${badge}`}
      >
        {networkIcon}
      </span>
    </span>
  );
}

/** Header button for a connected wallet; opens the wallet panel */
export const ConnectedWalletChip = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { wallet: ConnectedWalletInfo }
>(({ wallet, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={`${wallet.label} on ${wallet.networkName}`}
    className={`flex max-w-[60vw] items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 ${className ?? ""}`}
    {...props}
  >
    <WalletIcon wallet={wallet} size="sm" />
    <span className="truncate">{wallet.label}</span>
    <MdKeyboardArrowDown className="shrink-0 text-gray-500" />
  </button>
));
ConnectedWalletChip.displayName = "ConnectedWalletChip";

/** EVM only: switch the wallet between the chains we accept payment on */
function NetworkSwitcher({ currentChainId }: { currentChainId: number }) {
  const { switchChainAsync, isPending, variables } = useSwitchChain();
  // Chains we take payment on that are configured in wagmi (testnet in dev)
  const paymentChains = usePaymentChains();
  const [error, setError] = useState("");

  const switchTo = async (chainId: number) => {
    setError("");
    try {
      await switchChainAsync({ chainId });
    } catch (err) {
      console.error("Failed to switch network:", err);
      setError("Network not switched. Approve it in your wallet, or switch there.");
    }
  };

  return (
    <div className="w-full">
      <p className="mb-1.5 text-xs font-medium text-gray-700">Network</p>
      <div className="grid gap-1.5">
        {paymentChains.map((network) => {
          const isCurrent = network.chainId === currentChainId;
          const isSwitching = isPending && variables?.chainId === network.chainId;
          return (
            <button
              key={network.chainId}
              type="button"
              disabled={isCurrent || isPending}
              aria-pressed={isCurrent}
              onClick={() => switchTo(network.chainId)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                isCurrent
                  ? "border-blue-500 bg-blue-50 font-semibold"
                  : "border-gray-200 hover:bg-gray-50 disabled:opacity-60"
              }`}
            >
              <img src={network.icon} alt="" className="h-5 w-5" />
              <span className="flex-1">{network.name}</span>
              <span className="text-xs text-gray-500">
                {isCurrent ? "Connected" : isSwitching ? "Check your wallet…" : ""}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Dialog body for a connected wallet: identity, network, copy, disconnect */
export function ConnectedWalletPanel({ wallet }: { wallet: ConnectedWalletInfo }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <WalletIcon wallet={wallet} size="lg" />
      <div className="text-center">
        <p className="text-base font-semibold">{wallet.label}</p>
        <p className="text-xs text-muted-foreground">{wallet.networkName}</p>
        {wallet.label !== shortWallet(wallet.address) && (
          <p className="text-xs text-muted-foreground">{shortWallet(wallet.address)}</p>
        )}
      </div>

      {wallet.chainId !== undefined && (
        <NetworkSwitcher currentChainId={wallet.chainId} />
      )}

      {wallet.balances && (
        <p className="text-xs text-gray-700">{wallet.balances.join(" · ")}</p>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={copyAddress}>
        <MdContentCopy className="mr-2" />
        {copied ? "Copied" : "Copy address"}
      </Button>
      <DialogClose asChild>
        <Button
          type="button"
          className="w-full bg-red-600 text-white hover:bg-red-500"
          onClick={wallet.disconnect}
        >
          <MdLogout className="mr-2" />
          Disconnect
        </Button>
      </DialogClose>
      <DialogClose asChild>
        <Button type="button" variant="ghost" className="w-full">
          Close
        </Button>
      </DialogClose>
    </div>
  );
}
