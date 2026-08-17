import { apiURL } from "@/constants/constants";
import axios from "axios";

interface StreamAxiosLikeError {
  message: string;
  response: { status: number; data: any };
}


export interface GemCopyableItem {
  label: string;
  text: string;
  isWallet?: boolean;
  reference?: string;
  paymentType?: string;
  expiresAt?: string | null;
}

export interface GemResponseType {
  reply: string;
  copyableItems?: GemCopyableItem[];
  claimGiftMode?: boolean;
}


export const OpenAI = async (updatedMessages: any, sessionId: String): Promise<any> => {
  try {
    const response = await axios.post<any>(
      `${apiURL}/api/openai`,
      { messages: updatedMessages, sessionId: sessionId }
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
  console.log('working',updatedMessages);
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

    if (!response.body) {
      const text = await response.text();
      return { reply: text };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      accumulated += decoder.decode(value, { stream: true });
      onChunk?.(accumulated);
    }

    console.log("Use transaction created successfully");
    return { reply: accumulated };
  } catch (error) {
    console.error("Error storing user data:", error);
    throw error;
  }
};
