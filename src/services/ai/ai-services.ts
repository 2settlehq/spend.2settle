import { apiURL } from "@/constants/constants";
import axios from "axios";
import type { GiftPaymentTracking } from "../gift-flow";

interface StreamAxiosLikeError {
  message: string;
  response: { status: number; data: any };
}

const parseStructuredGeminiReply = (
  value: string,
): GemResponseType | undefined => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return undefined;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed.reply === "string" ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export interface GemCopyableItem {
  label: string;
  text: string;
  isWallet?: boolean;
  reference?: string;
  paymentType?: string;
  expiresAt?: string | null;
}

export interface TransferFormData {
  crypto: string;
  network: string;
  estimation: string;
  amount: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountDetailsConfirmed: boolean;
  phoneCountry: string;
  phoneNumber: string;
}

export interface GiftFormData {
  crypto: string;
  network: string;
  estimation: string;
  amount: string;
  phoneCountry: string;
  phoneNumber: string;
}

export interface RequestPaymentFormData {
  amount: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountDetailsConfirmed: boolean;
  phoneCountry: string;
  phoneNumber: string;
}

export interface ClaimGiftFormData {
  giftId: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountDetailsConfirmed: boolean;
}

export interface FulfillRequestFormData {
  requestId: string;
  crypto: string;
  network: string;
  phoneCountry: string;
  phoneNumber: string;
}

export interface ReportFormData {
  complaintType: string;
  name: string;
  phoneCountry: string;
  phoneNumber: string;
  walletAddress: string;
  fraudsterWalletAddress: string;
  description: string;
}

export interface GemResponseType {
  reply: string;
  giftPayment?: GiftPaymentTracking;
  copyableItems?: GemCopyableItem[];
  claimGiftMode?: boolean;
  showTransferForm?: boolean;
  transferFormId?: string;
  transferFormDefaults?: Partial<TransferFormData>;
  showGiftForm?: boolean;
  giftFormId?: string;
  giftFormDefaults?: Partial<GiftFormData>;
  showRequestPaymentForm?: boolean;
  requestPaymentFormId?: string;
  requestPaymentFormDefaults?: Partial<RequestPaymentFormData>;
  showClaimGiftForm?: boolean;
  claimGiftFormId?: string;
  claimGiftFormDefaults?: Partial<ClaimGiftFormData>;
  showFulfillRequestForm?: boolean;
  fulfillRequestFormId?: string;
  fulfillRequestFormDefaults?: Partial<FulfillRequestFormData>;
  showReportForm?: boolean;
  reportFormId?: string;
  reportFormDefaults?: Partial<ReportFormData>;
}

export const OpenAI = async (
  updatedMessages: any,
  sessionId: String,
): Promise<any> => {
  try {
    const response = await axios.post<any>(
      `${apiURL}/api/openai`,
      { messages: updatedMessages, sessionId: sessionId },
    );
    console.log("Use transaction created successfully");
    return response.data;
  } catch (error) {
    console.error("Error storing user data:", error);
    throw error;
  }
};

export const geminiAi = async (
  updatedMessages: string | undefined,
  sessionId: String,
  onChunk?: (accumulatedText: string) => void,
): Promise<GemResponseType> => {
  console.log("working", updatedMessages);
  try {
    const response = await fetch(`${apiURL}/api/ai/geminiApi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageText: updatedMessages, chatId: sessionId }),
    });

    if (!response.ok) {
      let data: any = { error: "Something went wrong. Please try again." };
      try {
        data = await response.json();
      } catch {
        // response body wasn't JSON — keep the default message
      }

      const error: StreamAxiosLikeError = {
        message: data?.error ?? data?.message ?? "Request failed",
        response: { status: response.status, data },
      };
      throw error;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as GemResponseType;
    }

    if (!response.body) {
      const text = await response.text();
      return parseStructuredGeminiReply(text) ?? { reply: text };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      accumulated += decoder.decode(value, { stream: true });
      if (!accumulated.trimStart().startsWith("{")) {
        onChunk?.(accumulated);
      }
    }

    accumulated += decoder.decode();

    console.log("Use transaction created successfully");
    return parseStructuredGeminiReply(accumulated) ?? { reply: accumulated };
  } catch (error) {
    console.error("Error storing user data:", error);
    throw error;
  }
};

export const submitTransferForm = async (
  transferForm: TransferFormData,
  sessionId: string,
): Promise<GemResponseType> => {
  const response = await fetch(`${apiURL}/api/ai/geminiApi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transferForm, chatId: sessionId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: StreamAxiosLikeError = {
      message: data?.error ?? data?.message ?? "Transfer could not be created",
      response: { status: response.status, data },
    };
    throw error;
  }

  return data as GemResponseType;
};

const submitWorkflowForm = async <T>(
  key: string,
  form: T,
  sessionId: string,
  fallbackMessage: string,
): Promise<GemResponseType> => {
  const response = await fetch(`${apiURL}/api/ai/geminiApi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: form, chatId: sessionId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: StreamAxiosLikeError = {
      message: data?.error ?? data?.message ?? fallbackMessage,
      response: { status: response.status, data },
    };
    throw error;
  }

  return data as GemResponseType;
};

export const submitGiftForm = (form: GiftFormData, sessionId: string) =>
  submitWorkflowForm("giftForm", form, sessionId, "Gift could not be created");

export const submitRequestPaymentForm = (
  form: RequestPaymentFormData,
  sessionId: string,
) =>
  submitWorkflowForm(
    "requestPaymentForm",
    form,
    sessionId,
    "Payment request could not be created",
  );

export const submitClaimGiftForm = (
  form: ClaimGiftFormData,
  sessionId: string,
) =>
  submitWorkflowForm("claimGiftForm", form, sessionId, "Gift could not be claimed");

export const submitFulfillRequestForm = (
  form: FulfillRequestFormData,
  sessionId: string,
) =>
  submitWorkflowForm(
    "fulfillRequestForm",
    form,
    sessionId,
    "Payment request could not be fulfilled",
  );

export const submitReportForm = (form: ReportFormData, sessionId: string) =>
  submitWorkflowForm("reportForm", form, sessionId, "Report could not be submitted");
