import { sendBTC, spendTRX } from "@/helpers/ethereum_script/spend_crypto";
import { WalletAddress } from "@/lib/wallets/types";
import {
  getConnectedWallet,
  getWalletNetworkError,
  PaymentNetwork,
} from "@/lib/wallets/walletNetworks";
import type { DebitablePayment } from "@/services/ai/ai-services";
import { cancelEnginePayment } from "@/services/enginePaymentService";
import {
  InsufficientBalanceError,
  runWalletDebit,
} from "@/lib/wallets/walletDebitSession";
import {
  CHAINS,
  resolveChainKey,
} from "@/services/transactionService/cryptoService/chainConfig";
import {
  TRC20_ABI,
  TRC20_CONTRACT,
} from "@/services/transactionService/cryptoService/cryptoConstants";
import { config } from "@/wagmi";
import { getBalance, readContract } from "wagmi/actions";
import { useAccount } from "wagmi";
import { formatUnits, parseEther, parseUnits as parseViemUnits, type Abi } from "viem";
import useChatStore from "stores/chatStore";
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

function insufficient(asset: string, has: string, needs: string): never {
  throw new InsufficientBalanceError(
    `Your wallet doesn't have enough ${asset}: it has ${Number(has)} ${asset}, this payment needs ${Number(needs)} ${asset}.`,
  );
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
  const { address: evmAddress, chainId: evmChainId } = useAccount();

  // These are React hooks - they must be called at the top level of this hook
  const { spendNative } = useSpendNative();
  const { spendEVMUSDT } = useSpendEVMUSDT();
  const { spendTRC20 } = useSpendTRC20();

  /**
   * Checks the wallet can cover the payment before opening its prompt, so the
   * user gets a clear reason. Skipped (not blocking) if the balance can't be read.
   */
  const checkBalance = async (network: string, cryptoAmount: number) => {
    try {
      if (["eth", "bnb", "erc20", "bep20"].includes(network) && evmAddress) {
        const isNative = network === "eth" || network === "bnb";
        const chain =
          CHAINS[resolveChainKey(network === "eth" || network === "erc20" ? "eth" : "bnb", evmChainId)];

        if (isNative) {
          const balance = await getBalance(config, {
            address: evmAddress,
            chainId: chain.id,
          });
          const needed = parseEther(toAmount(cryptoAmount, 18));
          if (balance.value < needed) {
            insufficient(chain.nativeSymbol, formatUnits(balance.value, 18), formatUnits(needed, 18));
          }
          return;
        }

        const decimals = network === "erc20" ? 6 : 18;
        const balance = (await readContract(config, {
          address: chain.usdtContract,
          abi: chain.abi as Abi,
          functionName: "balanceOf",
          args: [evmAddress],
          chainId: chain.id,
        })) as bigint;
        const needed = parseViemUnits(toAmount(cryptoAmount, decimals), decimals);
        if (balance < needed) {
          insufficient("USDT", formatUnits(balance, decimals), formatUnits(needed, decimals));
        }
        return;
      }

      if (network === "trc20" && window.tronWeb?.ready) {
        const contract = await window.tronWeb.contract(TRC20_ABI, TRC20_CONTRACT);
        const raw = await contract
          .balanceOf(window.tronWeb.defaultAddress.base58)
          .call();
        const balance = Number(raw.toString()) / 1e6;
        if (balance < cryptoAmount) {
          insufficient("USDT", String(balance), String(cryptoAmount));
        }
      }
      // TRX and BTC senders check the balance themselves before sending
    } catch (error) {
      if (error instanceof InsufficientBalanceError) throw error;
      console.warn("Could not check wallet balance before debit:", error);
    }
  };

  /**
   * Debits the connected wallet for a created payment session: sends the
   * payment's exact crypto amount to its deposit address, so the engine
   * matches the funds to the reference. The user has 5 minutes to approve; if
   * nothing is sent (declined, not enough funds, timeout) the session is
   * closed. Returns the tx hash, throws WalletDebitError / send errors.
   */
  const debitWallet = async (
    payment: DebitablePayment,
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

    return runWalletDebit({
      checkBalance: () => checkBalance(network, cryptoAmount),
      send: (onSubmitted) =>
        sendPayment(network, depositAddress, cryptoAmount, onSubmitted),
      closeSession: async () => {
        if (!payment.cancelToken) return false;
        try {
          await cancelEnginePayment(payment.reference, payment.cancelToken);
          return true;
        } catch (error) {
          console.error("Failed to close payment session:", error);
          return false;
        }
      },
      onLateApproval: (hash) =>
        useChatStore.getState().addMessages([
          {
            type: "incoming",
            content: `Your wallet sent payment ${payment.reference} after it was closed (transaction ${hash}). Please contact support with both so we can resolve it.`,
            timestamp: new Date(),
          },
        ]),
    });
  };

  const sendPayment = async (
    network: string,
    depositAddress: string,
    cryptoAmount: number,
    onSubmitted: (hash: string) => void,
  ): Promise<string> => {
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
            network,
            onSubmitted
          )
        );

      case "erc20":
        return evmTxHash(
          await spendEVMUSDT(
            depositAddress as `0x${string}`,
            parseUnits(toAmount(cryptoAmount, 6), 6),
            true,
            onSubmitted
          )
        );

      case "bep20":
        return evmTxHash(
          await spendEVMUSDT(
            depositAddress as `0x${string}`,
            parseUnits(toAmount(cryptoAmount, 18), 18),
            false,
            onSubmitted
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
