import { debitFailureMessage } from "@/features/chatbot/helpers/debitFailureMessage";
import {
  ClaimGiftFormData,
  FulfillRequestFormData,
  GemResponseType,
  GiftFormData,
  ReportFormData,
  RequestPaymentFormData,
  submitClaimGiftForm,
  submitFulfillRequestForm,
  submitGiftForm,
  submitReportForm,
  submitRequestPaymentForm,
  submitTransferForm,
  TransferFormData,
  geminiAi,
} from "@/services/ai/ai-services";
import type { WalletDebit } from "@/hooks/chatbot/useFormWalletDebit";
import useChatStore, { MessageType } from "stores/chatStore";

type CopyableReplyItem = {
  label: string;
  text: string;
  isWallet?: boolean;
  reference?: string;
  paymentType?: string;
  expiresAt?: string | null;
};

const COPYABLE_REPLY_FIELDS: Array<{
  label: string;
  patterns: RegExp[];
}> = [
  {
    label: "Crypto Amount",
    patterns: [
      /you\s+are\s+sending\s+([0-9]+(?:\.[0-9]+)?)/i,
      /crypto\s*amount\s*(?:is|:|-)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    ],
  },
  {
    label: "Wallet Address",
    patterns: [
      /wallet\s*address\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9:._-]{5,})/i,
      /wallet_address\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9:._-]{5,})/i,
    ],
  },
  {
    label: "Transaction ID",
    patterns: [
      /transaction\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /transaction_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /transact_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
  {
    label: "Transfer ID",
    patterns: [
      /transfer\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /transfer_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
  {
    label: "Request ID",
    patterns: [
      /request\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /request_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
];

const cleanCopyableValue = (value: string) =>
  value.replace(/^[`"'(<\[]+|[`"').,;:>\]]+$/g, "").trim();

const normalizeReplyForCopyParsing = (reply = "") =>
  reply
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .trim();

// The transfer-completion reply carries "Wallet Address: 0x..." as its own
// trailing line purely so getCopyableReplyItems() below can extract it into
// the Copy Wallet Address bubble — it isn't meant to also show up as raw
// text in the main summary bubble. Only strips it when it's the trailing
// line (transfer's format); leaves gift/request's inline wallet-address
// mention untouched, since that's part of their actual sentence.
const stripTrailingWalletAddressLine = (reply = "") =>
  reply
    .replace(
      /\n?wallet[\s_]*address\s*(?:is|:|-)?\s*[A-Za-z0-9][A-Za-z0-9:._-]{5,}\s*$/i,
      "",
    )
    .trimEnd();

const getCopyableReplyItems = (reply = ""): CopyableReplyItem[] => {
  const items: CopyableReplyItem[] = [];
  const seen = new Set<string>();
  const normalizedReply = normalizeReplyForCopyParsing(reply);

  COPYABLE_REPLY_FIELDS.forEach(({ label, patterns }) => {
    for (const pattern of patterns) {
      const match = reply.match(pattern) ?? normalizedReply.match(pattern);
      const text = match?.[1] ? cleanCopyableValue(match[1]) : "";

      if (!text || ["undefined", "null", "none"].includes(text.toLowerCase())) {
        continue;
      }

      const key = `${label}:${text}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ label, text });
      }
      break;
    }
  });

  return items;
};

const mergeCopyableItems = (
  structuredItems: CopyableReplyItem[] = [],
  fallbackItems: CopyableReplyItem[] = [],
  options: { suppressGiftClaimIds?: boolean } = {},
) => {
  const seen = new Set<string>();
  const suppressedLabels = new Set(
    options.suppressGiftClaimIds ? ["transaction id", "gift id"] : [],
  );

  return [...structuredItems, ...fallbackItems].filter((item) => {
    const text = item.text?.trim();
    if (!text) return false;
    if (suppressedLabels.has(item.label.toLowerCase())) return false;

    // Treat labels such as "Crypto Amount (BTC)" and "Crypto Amount" as
    // the same field. Structured items come first, so the asset-specific
    // label is kept and the generic summary-parser fallback is discarded.
    const normalizedLabel = item.label
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();
    const key = `${normalizedLabel}:${text}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const getOrCreateSessionId = () => {
  let sessionId = window.localStorage.getItem("transactionID");

  if (!sessionId) {
    sessionId = Math.floor(100000 + Math.random() * 900000).toString();
    window.localStorage.setItem("transactionID", sessionId);
  }

  return sessionId;
};

type PaymentMethodPreference = "wallet" | "copy";

const buildAiReplyMessages = (
  reply: GemResponseType,
  preferredPaymentMethod?: PaymentMethodPreference,
): MessageType[] => {
  const copyableItems = mergeCopyableItems(
    reply.copyableItems,
    getCopyableReplyItems(reply.reply),
    { suppressGiftClaimIds: reply.claimGiftMode === true },
  ).map((item) => ({
    ...item,
    isWallet:
      item.isWallet || item.label.toLowerCase() === "wallet address",
  }));
  const walletItem = copyableItems.find(
    (item) => item.isWallet,
  );
  const summary = stripTrailingWalletAddressLine(reply.reply);

  if (copyableItems.length > 0 || reply.giftPayment) {
    const walletExpiryTime = walletItem?.expiresAt
      ? new Date(walletItem.expiresAt)
      : new Date(Date.now() + 30 * 60 * 1000);

    return [{
      type: "incoming",
      intent: {
        kind: "component",
        name: "PaymentDetails",
        props: {
          summary,
          items: copyableItems,
          expiryTime: walletItem ? walletExpiryTime.toISOString() : undefined,
          walletReference: walletItem?.reference,
          giftPayment: reply.giftPayment,
          preferredPaymentMethod,
        },
        persist: true,
      },
      timestamp: new Date(),
    }];
  }

  return [{
    type: "incoming",
    content: <span>{summary}</span>,
    timestamp: new Date(),
  }];
};

const addAiReplyToChat = (
  reply: GemResponseType,
  preferredPaymentMethod?: PaymentMethodPreference,
) => {
  const { addMessages } = useChatStore.getState();
  addMessages(buildAiReplyMessages(reply, preferredPaymentMethod));
};

// After a direct debit: what was debited, the tx hash and live settlement
// status (gifts show their gift ID tracker instead) — no deposit address/timer
const buildDebitedReplyMessages = (
  reply: GemResponseType,
  walletDebit: WalletDebit,
  txHash: string,
): MessageType[] => {
  const payment = reply.payment!;
  const isGift = Boolean(reply.giftPayment);

  return [
    {
      type: "incoming",
      intent: {
        kind: "component",
        name: "PaymentDetails",
        props: {
          summary: `${payment.cryptoAmount} ${walletDebit.asset} has been debited from your ${walletDebit.network.toUpperCase()} wallet.`,
          items: [
            {
              label: `Crypto Amount (${walletDebit.asset})`,
              text: String(payment.cryptoAmount),
            },
            { label: "Transaction Hash", text: txHash },
            { label: "Transaction ID", text: payment.reference },
          ],
          expiryTime: isGift ? undefined : payment.expiresAt ?? new Date().toISOString(),
          walletReference: payment.reference,
          statusOnly: true,
          giftPayment: reply.giftPayment,
        },
        persist: true,
      },
      timestamp: new Date(),
    },
  ];
};

/**
 * Shows the created payment: debits the connected wallet when one can pay it,
 * otherwise shows the deposit address to pay manually.
 */
const completeFormPayment = async (
  reply: GemResponseType,
  walletDebit?: WalletDebit,
  preferredPaymentMethod?: PaymentMethodPreference,
) => {
  const { addMessages } = useChatStore.getState();
  const payment = reply.payment;

  if (!walletDebit || !payment?.depositAddress || !payment.cryptoAmount) {
    addAiReplyToChat(reply, preferredPaymentMethod);
    return;
  }

  try {
    const txHash = await walletDebit.debit(payment);
    addMessages(buildDebitedReplyMessages(reply, walletDebit, txHash));
  } catch (error) {
    console.error("Error debiting connected wallet:", error);
    addMessages([
      {
        type: "incoming",
        content: debitFailureMessage(error, payment.reference),
        timestamp: new Date(),
      },
    ]);
  }
};

export const handleTransferFormSubmission = async (
  formData: TransferFormData,
  walletDebit?: WalletDebit,
  preferredPaymentMethod?: PaymentMethodPreference,
) => {
  const { addMessages, setLoading } = useChatStore.getState();
  setLoading(true);

  try {
    const reply = await submitTransferForm(formData, getOrCreateSessionId());
    await completeFormPayment(reply, walletDebit, preferredPaymentMethod);
    return true;
  } catch (error: any) {
    const message =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      "Transfer could not be created. Please try again.";
    addMessages([
      {
        type: "incoming",
        content: <span>{message}</span>,
        timestamp: new Date(),
      },
    ]);
    return false;
  } finally {
    setLoading(false);
  }
};

const submitChatWorkflow = async <T,>(
  formData: T,
  submitter: (form: T, sessionId: string) => Promise<GemResponseType>,
  fallbackMessage: string,
  walletDebit?: WalletDebit,
  preferredPaymentMethod?: PaymentMethodPreference,
) => {
  const { addMessages, setLoading } = useChatStore.getState();
  setLoading(true);

  try {
    const reply = await submitter(formData, getOrCreateSessionId());
    await completeFormPayment(reply, walletDebit, preferredPaymentMethod);
    return true;
  } catch (error: any) {
    const message =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      fallbackMessage;
    addMessages([
      {
        type: "incoming",
        content: <span>{message}</span>,
        timestamp: new Date(),
      },
    ]);
    return false;
  } finally {
    setLoading(false);
  }
};

export const handleGiftFormSubmission = (
  formData: GiftFormData,
  walletDebit?: WalletDebit,
  preferredPaymentMethod?: PaymentMethodPreference,
) =>
  submitChatWorkflow(
    formData,
    submitGiftForm,
    "Gift could not be created. Please try again.",
    walletDebit,
    preferredPaymentMethod,
  );

export const handleRequestPaymentFormSubmission = (
  formData: RequestPaymentFormData,
) =>
  submitChatWorkflow(
    formData,
    submitRequestPaymentForm,
    "Payment request could not be created. Please try again.",
  );

export const handleClaimGiftFormSubmission = (formData: ClaimGiftFormData) =>
  submitChatWorkflow(
    formData,
    submitClaimGiftForm,
    "Gift could not be claimed. Please try again.",
  );

export const handleFulfillRequestFormSubmission = (
  formData: FulfillRequestFormData,
  walletDebit?: WalletDebit,
  preferredPaymentMethod?: PaymentMethodPreference,
) =>
  submitChatWorkflow(
    formData,
    submitFulfillRequestForm,
    "Payment request could not be fulfilled. Please try again.",
    walletDebit,
    preferredPaymentMethod,
  );

export const handleReportFormSubmission = (formData: ReportFormData) =>
  submitChatWorkflow(
    formData,
    submitReportForm,
    "Report could not be submitted. Please try again.",
  );

export const handleAiChat = async (chatInput?: string) => {
  const { addMessages, setStreamingMessage } = useChatStore.getState();
  const getErrorMessage = (error: any) => {
    const code = error?.response?.data?.code;

    if (code === "DEPOSIT_ADDRESS_IN_USE") {
      return (
        error?.response?.data?.error ??
        "That deposit wallet is already tied to an active payment session. Please complete the current payment or wait for it to expire before starting another one."
      );
    }

    const message =
      error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      "Sorry, something went wrong while processing your request. Please try again in a moment.";

    return code ? `${message} (${code})` : message;
  };

  try {
    console.log("we are at the start");

    // window.localStorage.setItem("transactionID", "");

    const messages: any = [];
    const updatedMessages = [...messages, { role: "user", content: chatInput }];
    let sessionId = window.localStorage.getItem("transactionID");

    // ✅ If it doesn't exist, create and store it
    if (!sessionId) {
      sessionId = Math.floor(100000 + Math.random() * 900000).toString();
      window.localStorage.setItem("transactionID", sessionId);
      console.log("Generated new sessionId:", sessionId);
    } else {
      console.log("Using existing sessionId:", sessionId);
    }
    console.log("Generated new sessionId:", chatInput);
    // const reply = await OpenAI(updatedMessages, sessionId);
    const reply = await geminiAi(chatInput, sessionId, (accumulatedText) => {
      setStreamingMessage(stripTrailingWalletAddressLine(accumulatedText));
    });
    console.log("this is the response from backend", reply.reply);

    const workflowForm = [
      reply.showTransferForm && {
        name: "TransferForm",
        initialValues: reply.transferFormDefaults,
        formId: reply.transferFormId,
      },
      reply.showGiftForm && {
        name: "GiftForm",
        initialValues: reply.giftFormDefaults,
        formId: reply.giftFormId,
      },
      reply.showRequestPaymentForm && {
        name: "RequestPaymentForm",
        initialValues: reply.requestPaymentFormDefaults,
        formId: reply.requestPaymentFormId,
      },
      reply.showClaimGiftForm && {
        name: "ClaimGiftForm",
        initialValues: reply.claimGiftFormDefaults,
        formId: reply.claimGiftFormId,
      },
      reply.showFulfillRequestForm && {
        name: "FulfillRequestForm",
        initialValues: reply.fulfillRequestFormDefaults,
        formId: reply.fulfillRequestFormId,
      },
      reply.showReportForm && {
        name: "ReportForm",
        initialValues: reply.reportFormDefaults,
        formId: reply.reportFormId,
      },
    ].find(Boolean);

    if (workflowForm) {
      addMessages([
        {
          type: "incoming",
          content: <span>{reply.reply}</span>,
          intent: {
            kind: "component",
            name: workflowForm.name,
            props: {
              initialValues: workflowForm.initialValues,
              formId: workflowForm.formId,
            },
            persist: true,
          },
          timestamp: new Date(),
        },
      ]);
      return;
    }

    addMessages?.(buildAiReplyMessages(reply));
  } catch (err) {
    console.error("There was an error from backend", err);
    const errorMessage = getErrorMessage(err);
    addMessages?.([
      {
        type: "incoming",
        content: <span>{errorMessage}</span>,
        timestamp: new Date(),
      },
    ]);
  } finally {
    // The final text was already committed via addMessages above (success)
    // or the error branch — always clear the live-streaming bubble so it
    // doesn't linger or duplicate the persisted message.
    setStreamingMessage(null);
  }
};
