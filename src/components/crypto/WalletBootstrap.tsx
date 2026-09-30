"use client";

import { useEffect } from "react";
import { useWallet } from "@/hooks/wallet/useWallet";
import { probeWalletConnectRelay } from "@/lib/wallets/walletConnectRelay";

// Invisible component that syncs wallet connection state from all chains
// (EVM, BTC, TRON) into the unified useWalletStore.
export function WalletBootstrap() {
  useWallet();

  // Tag the session with WalletConnect relay reachability so Sentry
  // relay errors can be told apart from config/code issues.
  useEffect(() => {
    probeWalletConnectRelay();
  }, []);

  return null;
}
