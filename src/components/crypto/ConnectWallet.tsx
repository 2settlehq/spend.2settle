"use client";

import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import ConnectBTCButton from "./ConnectBTCButton";
import useTronWallet from "stores/tronWalletStore";
import {
  ConnectedWalletChip,
  ConnectedWalletPanel,
  useConnectedWallet,
} from "./ConnectedWallet";
import Logo from "../shared/Logo";
import {
  connectTronWallet,
  listenForTronUnlock,
  refreshTronWallet,
} from "@/helpers/tron/connect_tron_wallet";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { probeWalletConnectRelay } from "@/lib/wallets/walletConnectRelay";

const ConnectWallet = () => {
  // EVM, BTC or TRON — all shown the same way once connected
  const wallet = useConnectedWallet();
  const isConnected = wallet !== null;
  const { connected: isTronConnected } = useTronWallet();
  const [tronPending, setTronPending] = useState(false);

  // Refresh a persisted TronLink connection's address and balances on load
  useEffect(() => {
    if (isTronConnected) refreshTronWallet();
  }, [isTronConnected]);

  // Browser-extension wallets (MetaMask etc.) don't need the relay, so warn
  // rather than block when WalletConnect can't be reached.
  const warnIfRelayBlocked = async (open: boolean) => {
    if (!open || isConnected) return;
    if ((await probeWalletConnectRelay()) === "blocked") {
      toast({
        title: "Can't reach WalletConnect",
        description:
          "Your network, ad blocker or VPN is blocking WalletConnect. Disable it, switch networks, or use a browser-extension wallet like MetaMask.",
        variant: "destructive",
      });
    }
  };

  const handleTronConnect = async () => {
    try {
      const result = await connectTronWallet();
      if ("pending" in result) {
        // Wallet is locked — show prompt and listen for unlock
        setTronPending(true);
        await listenForTronUnlock();
        setTronPending(false);
      }
    } catch (err) {
      setTronPending(false);
      console.error(err);
    }
  };

  return (
    <Dialog onOpenChange={warnIfRelayBlocked}>
      <DialogTrigger asChild>
        {wallet ? (
          // Our own button for every wallet type, never a wallet's own
          // popup: those opened underneath this modal dialog, which blocks
          // taps and scrolling outside itself (Disconnect was unreachable)
          <ConnectedWalletChip wallet={wallet} />
        ) : (
          <Button
            className="bg-blue-500 hover:bg-blue-400 hover:text-white-4 text-white rounded-full"
            variant="outline"
          >
            {"Connect Wallet"}
          </Button>
        )}
      </DialogTrigger>
      {/* Fits and scrolls on small phones instead of clipping the bottom */}
      <DialogContent className="w-[calc(100vw-2rem)] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-center mb-4">
            <Logo />
          </DialogTitle>
          <DialogDescription className="flex justify-center text-center">
            {tronPending
              ? "Please open the TronLink extension and unlock your wallet"
              : isConnected
                ? "Your Connected Wallet"
                : "Choose Your Preferred Wallet"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-center w-full">
          <div className="flex justify-center flex-col w-full">
            {wallet ? (
              <ConnectedWalletPanel wallet={wallet} />
            ) : (
              <>
                <DialogClose asChild>
                  <Button
                    className="mb-3 bg-blue-500 hover:bg-blue-400"
                    type="button"
                  >
                    <div className="pt-4 pb-3 border-t border-gray-200">
                      <div className="flex justify-center px-4">
                        <img
                          src="https://img.icons8.com/color/20/000000/bitcoin--v1.png"
                          alt="BTC"
                          className="h-5 w-5 mr-4"
                        />
                        <ConnectBTCButton />
                      </div>
                    </div>
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button className="mb-3 hover:bg-stone-600" type="button">
                    <div className="flex justify-center px-4">
                      <img
                        src="https://img.icons8.com/color/20/000000/ethereum.png"
                        alt="Ethereum"
                        className="h-5 w-5 mr-4"
                      />
                      <ConnectButton />
                    </div>
                  </Button>
                </DialogClose>
                <Button
                  className="mb-3 bg-red-700 hover:bg-red-400"
                  type="button"
                  onClick={handleTronConnect}
                  disabled={tronPending}
                >
                  <div className="pt-4 pb-3 border-t border-gray-200">
                    <div className="flex justify-center px-4">
                      <img
                        src="https://img.icons8.com/?size=20&id=7NCvsu15urpd&format=png&color=000000"
                        alt="Tron"
                        className="h-5 w-5 mr-4"
                      />
                      {tronPending
                        ? "Waiting for TronLink..."
                        : "Connect Tron Wallet"}
                    </div>
                  </div>
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWallet;
