import { formatCurrency } from "@/helpers/format_currency";
import { resetAllTransactionState } from "@/utils/resetTransactionState";
import { getBaseSymbol } from "@/utils/utilities";
import { useBankStore } from "stores/bankStore";
import useChatStore, { MessageType } from "stores/chatStore";
import { usePaymentStore } from "stores/paymentStore";
import { useTransactionStore } from "stores/transactionStore";

export const displaySendPayment = async () => {
  console.log("Displaying send payment message...");

  const {
    paymentAssetEstimate,
    paymentNairaEstimate,
    ticker,
    activeWallet,
    walletLastAssignedTime,
  } = usePaymentStore.getState();

  const { bankData } = useBankStore.getState();

  const { acct_number, bank_name, receiver_name } = bankData;

  const { currentStep, addMessages, next } = useChatStore.getState();

  const { transferId, requestId, transactionId } = useTransactionStore.getState();

  const paymentTicker = getBaseSymbol(ticker);
  const assetPayment = parseFloat(paymentAssetEstimate);
  const paymentAsset = `${parseFloat(assetPayment.toFixed(8))} ${paymentTicker}`;

  const isGift = currentStep.transactionType?.toLowerCase() === "gift";
  const isRequest = currentStep.transactionType?.toLowerCase() === "request";
  const isTransfer = currentStep.transactionType?.toLowerCase() === "transfer";
  const isRequestPayment =
    currentStep.transactionType?.toLowerCase() === "payrequest";

  // walletLastAssignedTime stores the engine's expiresAt directly
  const walletExpiryTime = walletLastAssignedTime
    ? new Date(walletLastAssignedTime)
    : new Date(Date.now() + 30 * 60 * 1000);
  const lastAssignedTime = walletExpiryTime;

  const messages: MessageType[] = [
    {
      type: "incoming",
      content: "Phone number confirmed",
      timestamp: new Date(),
    },
  ];

  // For request (no wallet needed, user is requesting payment)
  if (isRequest) {
    messages.push(
      {
        type: "incoming",
        content: (
          <span>
            You will receive{" "}
            <b>{formatCurrency(paymentNairaEstimate, "NGN", "en-NG")} </b>.
            <br />
            It would be paid into:
            <br />
            Bank Name: {bank_name} <br/>
            Account Number: {acct_number} <br/>
            Account Name: {receiver_name}
            <br />
            <b>You can copy the requestId below</b> and share with the person to
            fulfill the request
          </span>
        ),
        timestamp: new Date(),
      },
      {
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: { text: transactionId, label: "Transaction ID" },
          persist: true,
        },
        timestamp: new Date(),
      },
      {
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: { text: requestId, label: "Request ID" },
          persist: true,
        },
        timestamp: new Date(),
      },
      {
        type: "incoming",
        content:
          "Disclaimer: You would get your payment as soon as your request is fulfilled",
        timestamp: new Date(),
      },
    );
  } else {
    // For transfer, gift, or request payment (needs wallet display)
    messages.push(
      {
        type: "incoming",
        content: isRequestPayment ? (
          <span>
            You are paying{" "}
            <b>{paymentAsset} = {formatCurrency(paymentNairaEstimate, "NGN", "en-NG")}</b>{" "}
            to fulfill request <b>{requestId}</b>.
            <br />
            Send the crypto to the 2Settle wallet address below to complete the payment.
          </span>
        ) : isGift ? (
          <span>
            You are sending <b>{paymentAsset}</b> and recipient will be receiving{" "}
            <b>{formatCurrency(paymentNairaEstimate, "NGN", "en-NG")}</b>.
          </span>
        ) : (
          <span>
            Note: You are sending{" "}
            <b>
              {paymentAsset} ={" "}
              {formatCurrency(paymentNairaEstimate, "NGN", "en-NG")}
            </b>{" "}
            only to 2Settle wallet address to complete your transaction
          </span>
        ),
        timestamp: new Date(),
      },
      {
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: {
            text: assetPayment.toFixed(8),
            label: `${paymentTicker} Amount`,
          },
          persist: true,
        },
        timestamp: new Date(),
      },
      {
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: {
            text: activeWallet,
            label: "Wallet Address",
            reference: transactionId,
            isWallet: true,
            paymentType: isGift
              ? "gift"
              : isRequestPayment
                ? "payrequest"
                : isTransfer
                  ? "transfer"
                  : undefined,
            lastAssignedTime: lastAssignedTime,
          },
          persist: true,
        },
        timestamp: new Date(),
      },
      {
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: { text: transactionId, label: "Transaction ID" },
          persist: true,
        },
        timestamp: new Date(),
      },
    );

    if (isTransfer) {
      messages.push({
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: { text: transferId, label: "Transfer ID" },
          persist: true,
        },
        timestamp: new Date(),
      });
    }

    if (isRequestPayment) {
      messages.push({
        type: "incoming",
        intent: {
          kind: "component",
          name: "CopyableText",
          props: { text: requestId, label: "Request ID" },
          persist: true,
        },
        timestamp: new Date(),
      });
    }

    messages.push({
      type: "incoming",
      intent: {
        kind: "component",
        name: "CountdownTimer",
        props: { expiryTime: walletExpiryTime, reference: transactionId },
        persist: true,
      },
      timestamp: new Date(),
    });
  }

  addMessages(messages);

  // Reset all transaction state after displaying completion message
  resetAllTransactionState();

  next({ stepId: "start", transactionType: undefined });
};
