import { apiURL } from "@/constants/constants";
import axios from "axios";


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

export const geminiAi = async (updatedMessages: string | undefined, sessionId: String): Promise<GemResponseType> => {
  console.log('working',updatedMessages);
  try {
    const response = await axios.post<GemResponseType>(
      `${apiURL}/api/ai/geminiApi`,
      { messageText: updatedMessages, chatId: sessionId }
    );
   
   console.log("Use transaction created successfully");
    return response.data;
  } catch (error) {
    console.error("Error storing user data:", error);
    throw error;
  }
};
