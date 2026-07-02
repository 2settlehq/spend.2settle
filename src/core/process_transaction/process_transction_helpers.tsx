import { displayGiftFeedbackMessage } from "@/features/chatbot/handlers/chatHandlers/menus/display.gift.transaction.confirmation";
import { displaySendPayment } from "@/features/chatbot/handlers/chatHandlers/menus/display.send.payment";
import {
  claimGift,
  verifyReceiver,
  createEnginePayment,
  fulfillRequest,
  getEnginePaymentErrorMessage,
  mapNetwork,
} from "@/services/enginePaymentService";
import { resetAllTransactionState } from "@/utils/resetTransactionState";
import { useBankStore } from "stores/bankStore";
import useChatStore from "stores/chatStore";
import { usePaymentStore } from "stores/paymentStore";
import { useStatusStore } from "stores/statusStore";
import { useTransactionStore } from "stores/transactionStore";
import { useUserStore } from "stores/userStore";

export async function processTransaction() {
  const currentStep = useChatStore.getState().currentStep;
  const { addMessages, next } = useChatStore.getState();
  const { paymentMode } = usePaymentStore.getState();

  const paymentStore = usePaymentStore.getState();
  const { user } = useUserStore.getState();
  const { bankData, selectedBankCode: rawBankCode } = useBankStore.getState();
  const { giftId, requestId } = useTransactionStore.getState();

  const acct_number = bankData.acct_number ?? "";
  const bankCode = rawBankCode ?? "";

  function cleanCurrency(val: string): string {
    return val.replace(/[^0-9.]/g, "");
  }

  const fiatAmount = parseFloat(cleanCurrency(paymentStore.paymentNairaEstimate)) || 0;
  const cryptoAmount =
    parseFloat(cleanCurrency(paymentStore.amountPayable || paymentStore.paymentAssetEstimate)) || 0;
  const estimateAsset = (paymentStore.estimateAsset || "naira").toLowerCase();
  const isCryptoEstimate =
    estimateAsset !== "naira" && estimateAsset !== "dollar" && estimateAsset !== "usdt";
  const paymentAmountFields = isCryptoEstimate
    ? { cryptoAmount, chargeFrom: "fiat" as const }
    : { fiatAmount, chargeFrom: paymentStore.chargeFrom };
  const displayPaymentError = (error: unknown) => {
    addMessages([
      {
        type: "incoming",
        content: <span>{getEnginePaymentErrorMessage(error)}</span>,
        timestamp: new Date(),
      },
    ]);
  };
  const payer = {
    chatId: user?.chatId?.toString() ?? "",
    phone: user?.phone ?? undefined,
  };

  const isTransfer = currentStep.transactionType?.toLowerCase() === "transfer";
  const isRequest = currentStep.transactionType?.toLowerCase() === "request";
  const isGift = currentStep.transactionType?.toLowerCase() === "gift";
  const isClaimGift = paymentMode.toLowerCase() === "claim gift";

  const {
    setActiveWallet,
    setPaymentAssetEstimate,
    setPaymentNairaEstimate,
    setWalletLastAssignedTime,
  } = usePaymentStore.getState();

  const {
    setGiftId,
    setTransferId,
    setRequestId,
    setTransactionId,
  } = useTransactionStore.getState();
  const { setActiveReference, upsertStatus } = useStatusStore.getState();

  if (isTransfer) {
    try {
      const payment = await createEnginePayment({
        type: "transfer",
        ...paymentAmountFields,
        fiatCurrency: "NGN",
        crypto: paymentStore.crypto,
        network: paymentStore.network,
        payer,
        receiver: { bankCode, accountNumber: acct_number },
      });

      setTransactionId(payment.reference);
      setTransferId(payment.reference);
      setActiveWallet(payment.depositAddress ?? "");
      setPaymentAssetEstimate(String(payment.cryptoAmount ?? ""));
      setPaymentNairaEstimate(String(payment.fiatAmount ?? fiatAmount));
      setWalletLastAssignedTime(payment.expiresAt ?? "");
      setActiveReference(payment.reference);
      upsertStatus({
        reference: payment.reference,
        status: "pending",
        type: payment.type,
        expiresAt: payment.expiresAt,
      });

      displaySendPayment();
    } catch (error) {
      console.error("Error creating transfer:", error);
      displayPaymentError(error);
    }

  } else if (isGift) {
    try {
      const payment = await createEnginePayment({
        type: "gift",
        ...paymentAmountFields,
        fiatCurrency: "NGN",
        crypto: paymentStore.crypto,
        network: paymentStore.network,
        payer,
      });

      setTransactionId(payment.reference);
      setGiftId(payment.reference);
      setActiveWallet(payment.depositAddress ?? "");
      setPaymentAssetEstimate(String(payment.cryptoAmount ?? ""));
      setPaymentNairaEstimate(String(payment.fiatAmount ?? fiatAmount));
      setWalletLastAssignedTime(payment.expiresAt ?? "");
      setActiveReference(payment.reference);
      upsertStatus({
        reference: payment.reference,
        status: "pending",
        type: payment.type,
        expiresAt: payment.expiresAt,
      });

      displaySendPayment();
    } catch (error) {
      console.error("Error creating gift:", error);
      displayPaymentError(error);
    }

  } else if (isRequest) {
    try {
      const payment = await createEnginePayment({
        type: "request",
        fiatAmount,
        fiatCurrency: "NGN",
        receiver: { bankCode, accountNumber: acct_number },
      });

      setTransactionId(payment.reference);
      setRequestId(payment.reference);
      setPaymentNairaEstimate(String(payment.fiatAmount ?? fiatAmount));
      setActiveReference(null);
      // Requests have no deposit address — payer gets one when they fulfill

      displaySendPayment();
    } catch (error) {
      console.error("Error creating request:", error);
      displayPaymentError(error);
    }

  } else if (isClaimGift) {
    try {
      await verifyReceiver({ bankCode, accountNumber: acct_number });

      await claimGift(giftId, {
        bankCode,
        accountNumber: acct_number,
      });

      displayGiftFeedbackMessage();
      resetAllTransactionState();
      next({ stepId: "start", transactionType: undefined });
    } catch (error) {
      console.error("Error claiming gift:", error);
    }

  } else {
    // Pay request — payer fulfills an existing request
    try {
      const payment = await fulfillRequest(requestId, {
        crypto: paymentStore.crypto,
        network: paymentStore.network,
        payer,
      });

      setTransactionId(payment.reference);
      setRequestId(payment.reference);
      setActiveWallet(payment.depositAddress ?? "");
      setPaymentAssetEstimate(String(payment.cryptoAmount ?? ""));
      setPaymentNairaEstimate(String(payment.fiatAmount ?? fiatAmount));
      setWalletLastAssignedTime(payment.expiresAt ?? "");
      setActiveReference(payment.reference);
      upsertStatus({
        reference: payment.reference,
        status: "pending",
        type: payment.type,
        expiresAt: payment.expiresAt,
      });

      displaySendPayment();
    } catch (error) {
      console.error("Error fulfilling request:", error);
      displayPaymentError(error);
    }
  }
}
