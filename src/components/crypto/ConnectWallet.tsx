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
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { Loader2 } from "lucide-react";
import ConnectBTCButton from "./ConnectBTCButton";
import useTronWallet from "stores/tronWalletStore";
import {
  ConnectedWalletChip,
  ConnectedWalletPanel,
  useConnectedWallet,
} from "./ConnectedWallet";
import Logo from "../shared/Logo";
import { OpenInWalletApp } from "./OpenInWalletApp";
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

  // Controlled so the EVM option can keep this dialog open (showing progress)
  // until RainbowKit's wallet list has actually appeared
  const [open, setOpen] = useState(false);
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { status: evmStatus } = useAccount();
  const { disconnect } = useDisconnect();
  const [openingWallets, setOpeningWallets] = useState(false);
  const [openError, setOpenError] = useState("");
  // A wallet was picked and we're waiting for it to approve (e.g. in its app)
  const evmConnecting = !isConnected && evmStatus === "connecting";

  // RainbowKit's list is up: hand over to it (two open modals block each other)
  useEffect(() => {
    if (!openingWallets || !connectModalOpen) return;
    setOpeningWallets(false);
    setOpen(false);
  }, [openingWallets, connectModalOpen]);

  // WalletConnect can be slow to start on mobile; don't spin forever
  useEffect(() => {
    if (!openingWallets) return;
    const timer = setTimeout(() => {
      setOpeningWallets(false);
      setOpenError(
        "The wallet list didn't open. Check your connection and try again.",
      );
    }, 15_000);
    return () => clearTimeout(timer);
  }, [openingWallets]);

  const handleEvmConnect = () => {
    if (openingWallets || !openConnectModal) return;
    setOpenError("");
    setOpeningWallets(true);
    openConnectModal();
  };

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setOpeningWallets(false);
        warnIfRelayBlocked(nextOpen);
      }}
    >
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
            aria-busy={evmConnecting}
          >
            {evmConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              "Connect Wallet"
            )}
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
                : evmConnecting
                  ? "Waiting for your wallet to approve the connection. Open your wallet app to continue."
                  : "Choose Your Preferred Wallet"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-center w-full">
          <div className="flex justify-center flex-col w-full">
            {wallet ? (
              <ConnectedWalletPanel wallet={wallet} />
            ) : evmConnecting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => disconnect()}
                >
                  Cancel
                </Button>
              </div>
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
                {/* Our own button (not RainbowKit's nested inside ours): it
                    stays visible with a spinner until the wallet list opens,
                    so slow mobile starts don't invite repeated taps */}
                <Button
                  className="mb-3 hover:bg-stone-600"
                  type="button"
                  onClick={handleEvmConnect}
                  disabled={openingWallets || !openConnectModal}
                  aria-busy={openingWallets}
                >
                  <div className="flex items-center justify-center px-4">
                    {openingWallets ? (
                      <Loader2 className="h-5 w-5 mr-4 animate-spin" />
                    ) : (
                      <img
                        src="/networks/ethereum.svg"
                        alt=""
                        className="h-5 w-5 mr-4"
                      />
                    )}
                    {openingWallets ? "Opening wallets…" : "Connect Ethereum / BNB Wallet"}
                  </div>
                </Button>
                {openError && (
                  <p className="-mt-2 mb-3 text-center text-xs text-red-600">
                    {openError}
                  </p>
                )}
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
                <OpenInWalletApp />
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWallet;
