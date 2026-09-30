import type { DebitablePayment } from "@/services/ai/ai-services";
import {
  getConnectedWallet,
  PaymentNetwork,
  toPaymentNetwork,
} from "@/lib/wallets/walletNetworks";
import { useBlockchainPayment } from "./useConfirmAndProceedState";

export interface WalletDebit {
  network: PaymentNetwork;
  // Symbol shown to the user, e.g. "USDT", "TRX"
  asset: string;
  /** Sends the payment's crypto amount to its deposit address; returns the tx hash */
  debit: (payment: DebitablePayment) => Promise<string>;
}

/**
 * For the AI chat forms: returns how to debit the connected wallet for a
 * form's asset + network, or undefined when there's no wallet that can pay it
 * (the payment then falls back to the manual deposit address).
 */
export function useFormWalletDebit() {
  const { debitWallet } = useBlockchainPayment();

  return (crypto: string, network: string): WalletDebit | undefined => {
    const paymentNetwork = toPaymentNetwork(crypto, network);
    const wallet = getConnectedWallet();
    if (!paymentNetwork || !wallet?.networks.includes(paymentNetwork)) {
      return undefined;
    }

    const asset = crypto.toUpperCase();
    return {
      network: paymentNetwork,
      asset: asset === "TRON" ? "TRX" : asset,
      debit: (payment) => debitWallet(payment, paymentNetwork),
    };
  };
}
