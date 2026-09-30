import { sendBTC, spendTRX } from "@/helpers/ethereum_script/spend_crypto";
import { WalletAddress } from "@/lib/wallets/types";
import {
  getConnectedWallet,
  getWalletNetworkError,
  PaymentNetwork,
} from "@/lib/wallets/walletNetworks";
import type { DebitablePayment } from "@/services/ai/ai-services";
import { useSpendNative } from "@/services/transactionService/cryptoService/useSpendBepToken";
import { useSpendEVMUSDT } from "@/services/transactionService/cryptoService/useSpendEVMUSDT";
import { useSpendTRC20 } from "@/services/transactionService/cryptoService/useSpendTRC20";
import { EthereumAddress } from "@/types/general_types";
import { parseUnits } from "ethers/utils";
import { request, RpcErrorCode } from "sats-connect";
import { TransactionReceipt } from "viem";
import { useBTCWallet } from "stores/btcWalletStore";
import { usePaymentStore } from "stores/paymentStore";

/**
 * Check if user's connected wallet can be debited for the current network
 * (e.g. an Ethereum wallet can pay ETH / USDT ERC20, but not BNB / USDT BEP20)
 */
export function isWalletConnectedForNetwork(): boolean {
  const { network } = usePaymentStore.getState();
  const wallet = getConnectedWallet();

  if (!wallet || !network) return false;
  return wallet.networks.includes(network.toLowerCase() as PaymentNetwork);
}

/** Fixed-point string for an engine amount, without exponent notation */
function toAmount(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function evmTxHash(receipt: TransactionReceipt | null): string {
  if (!receipt) {
    throw new Error("The transaction was rejected or failed in your wallet");
  }
  if (receipt.status !== "success") {
    throw new Error("The transaction failed on-chain");
  }
  return receipt.transactionHash;
}

/**
 * Hook for directly debiting the user's connected wallet for an engine payment.
 * Must be used inside a React component because it uses wagmi hooks.
 */
export function useBlockchainPayment() {
  const { paymentAddress: btcPaymentAddress } = useBTCWallet();

  // These are React hooks - they must be called at the top level of this hook
  const { spendNative } = useSpendNative();
  const { spendEVMUSDT } = useSpendEVMUSDT();
  const { spendTRC20 } = useSpendTRC20();

  /**
   * Sends the payment's exact crypto amount to its engine deposit address,
   * so the engine matches the funds to the payment reference.
   * Returns the tx hash, throws on failure.
   */
  const debitWallet = async (
    payment: Pick<DebitablePayment, "depositAddress" | "cryptoAmount">,
    // Defaults to the chat menu flow's selected network
    networkOverride?: string,
  ): Promise<string> => {
    const network = (
      networkOverride ?? usePaymentStore.getState().network
    )?.toLowerCase();
    const { depositAddress, cryptoAmount } = payment;

    if (!network) throw new Error("Network is not set");
    if (!depositAddress || !cryptoAmount) {
      throw new Error("The payment has no deposit address or amount");
    }

    // Re-check in case the wallet switched chain after the asset was chosen
    const walletError = getWalletNetworkError([network]);
    if (walletError) throw new Error(walletError);

    switch (network) {
      case "eth":
      case "bnb":
        return evmTxHash(
          await spendNative(
            depositAddress as `0x${string}`,
            toAmount(cryptoAmount, 18),
            network
          )
        );

      case "erc20":
        return evmTxHash(
          await spendEVMUSDT(
            depositAddress as `0x${string}`,
            parseUnits(toAmount(cryptoAmount, 6), 6),
            true
          )
        );

      case "bep20":
        return evmTxHash(
          await spendEVMUSDT(
            depositAddress as `0x${string}`,
            parseUnits(toAmount(cryptoAmount, 18), 18)
          )
        );

      case "trc20": {
        // spendTRC20 converts to 6-decimal units itself (tronWeb.toSun)
        const result: unknown = await spendTRC20(
          depositAddress,
          Number(toAmount(cryptoAmount, 6))
        );
        // TronWeb's contract send() resolves to the txid string
        const txid =
          typeof result === "string"
            ? result
            : (result as { txid?: string } | null)?.txid;
        if (!txid) {
          throw new Error("The transaction was rejected or failed in your wallet");
        }
        return txid;
      }

      case "trx": {
        const transaction = await spendTRX(
          depositAddress as EthereumAddress,
          toAmount(cryptoAmount, 6)
        );
        return transaction.txid;
      }

      case "btc":
        return sendBTC({
          senderAddress: btcPaymentAddress as WalletAddress,
          recipient: depositAddress as WalletAddress,
          amount: cryptoAmount,
          signPsbtFn: async (psbt: string) => {
            if (!btcPaymentAddress) {
              throw new Error("Payment address is undefined.");
            }

            const response = await request("signPsbt", {
              psbt: psbt,
              signInputs: {
                [btcPaymentAddress]: [0],
              },
            });

            if (response.status === "success") {
              return response.result.psbt;
            }
            if (response.error.code === RpcErrorCode.USER_REJECTION) {
              throw new Error("User cancelled the signing process.");
            }
            throw new Error(`Error signing PSBT: ${response.error.message}`);
          },
        });

      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  };

  return { debitWallet };
}
