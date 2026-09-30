import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WalletType, WalletAddress } from "@/lib/wallets/types";

interface WalletConnectionState {
  walletType: WalletType | null;
  address: WalletAddress;
  // EVM chain the wallet is currently on (null for BTC/TRON or when disconnected)
  chainId: number | null;
  // ENS / .bnb name or truncated address to show the user; null until resolved
  displayName: string | null;
  // ENS avatar image URL, when the wallet has one
  displayAvatar: string | null;
  isConnected: boolean;
  setWalletType: (type: WalletType) => void;
  clearWalletType: () => void;
  setWallet: (
    type: WalletType,
    address: WalletAddress,
    chainId?: number | null
  ) => void;
  clearWallet: () => void;
  setDisplayName: (
    address: WalletAddress,
    displayName: string,
    displayAvatar?: string | null,
  ) => void;
}

export const useWalletStore = create(
  persist<WalletConnectionState>(
    (set) => ({
      walletType: null,
      address: undefined,
      chainId: null,
      displayName: null,
      displayAvatar: null,
      isConnected: false,
      setWalletType: (type) => set({ walletType: type }),
      clearWalletType: () => set({ walletType: null }),
      setWallet: (walletType, address, chainId = null) =>
        set((state) => ({
          walletType,
          address,
          chainId,
          isConnected: true,
          // Keep the resolved name while the address is unchanged (e.g. chain switch)
          displayName: state.address === address ? state.displayName : null,
          displayAvatar:
            state.address === address ? state.displayAvatar : null,
        })),
      clearWallet: () =>
        set({
          walletType: null,
          address: undefined,
          chainId: null,
          displayName: null,
          displayAvatar: null,
          isConnected: false,
        }),
      // Ignore a lookup that finishes after the wallet changed
      setDisplayName: (address, displayName, displayAvatar = null) =>
        set((state) =>
          state.address === address ? { displayName, displayAvatar } : state,
        ),
    }),
    {
      name: "connected-wallet-type",
    }
  )
);
