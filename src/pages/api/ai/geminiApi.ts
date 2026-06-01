import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  JsonOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { NextApiRequest, NextApiResponse } from "next";
import { chatPrompt } from "../../../services/ai/ai-endpoint-service";

import * as dotenv from "dotenv";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

import crypto from "crypto";
import {
  createBeneficiary,
} from "@/helpers/api_calls";
import { resolveBankAccount } from "@/services/bank/bank.service";

import useRate from "@/hooks/rates/useRate";

import {
  claimGift,
  createEnginePayment,
  fulfillRequest,
} from "@/services/enginePaymentService";
import { engineGet } from "@/lib/settle-client";
import { chat } from "googleapis/build/src/apis/chat";
// at top of the file (outside handler)
type Sess = Record<string, any>;
type PaymentType = "transfer" | "gift" | "request";

const SUPPORTED_CRYPTO = new Set(["BTC", "ETH", "BNB", "TRON", "USDT"]);
const SUPPORTED_USDT_NETWORKS = new Set(["ERC20", "TRC20", "BEP20"]);
const SUPPORTED_ESTIMATIONS = new Set(["crypto", "naira", "dollar"]);

const FIELD_QUESTIONS: Record<string, string> = {
  type: "What would you like to do: send crypto, create a gift, or request payment?",
  crypto: "Which crypto asset do you want to use? You can choose BTC, ETH, BNB, TRON, or USDT.",
  network: "Which USDT network do you want to use: ERC20, TRC20, or BEP20?",
  estimation: "How would you like to estimate the amount: crypto, naira, or dollar?",
  Amount: "Please enter the amount again.",
  bank_name: "What bank should receive the payment?",
  acct_number: "Please enter the 10-digit account number.",
  receiver_name: "Please confirm the bank name and account number so I can verify the account name.",
  receiver_phoneNumber: "Please enter the recipient phone number.",
  id: "Please enter the gift id.",
};

interface CreatePaymentInput {
  type: "transfer" | "gift" | "request";
  fiatAmount: number;
  fiatCurrency?: string;
  crypto?: string;
  network?: string;
  chargeFrom?: "fiat" | "crypto";
  payer?: { chatId: string; phone?: string };
  receiver?: { bankCode: string; accountNumber: string };
}

interface PaymentResponse {
  success: boolean;
  payment: {
    id: string;
    reference: string;
    type: string;
    status: string;
    depositAddress: string | null;
    cryptoAmount: number;
    crypto: string | null;
    network: string | null;
    fiatAmount: number;
    fiatCurrency: string;
    rate: number;
    expiresAt: string;
  };
}

interface FulfillRequestInput {
  crypto: string;
  network: string;
  payer: { chatId: string; phone?: string };
}

interface ClaimGiftInput {
  bankCode: string;
  accountNumber: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __SESSIONS__: Sess | undefined;
}

const session: Sess = global.__SESSIONS__ ?? (global.__SESSIONS__ = {});

declare global {
  // eslint-disable-next-line no-var
  var __USERACCTDETAIL__: Sess | undefined;
}

const userAcctDetail: Sess =
  global.__USERACCTDETAIL__ ?? (global.__USERACCTDETAIL__ = {});

// 🧠 Keep userHistories persistent across API calls in Next.js

declare global {
  // eslint-disable-next-line no-var
  var __USER_HISTORIES__: Map<string, any> | undefined;
}

// Reuse the same Map across reloads or create it once
const userHistories =
  global.__USER_HISTORIES__ ?? (global.__USER_HISTORIES__ = new Map());

dotenv.config();

const model = new ChatOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: "google/gemini-2.0-flash-lite-001",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});

async function extractIntentEntity(phrase: string) {
  const prompt = ChatPromptTemplate.fromTemplate(`
You are a data extraction engine.

RULES (VERY IMPORTANT):
- Output MUST be valid JSON
- Output MUST match the schema EXACTLY
- Do NOT wrap the output in markdown
- Do NOT add explanations
- Do NOT omit any fields
- If a value is missing, use an empty string "" instead of null
- Use strings only 

Schema:
{format_instructions}

User input:
"{phrase}"
`);

  const outputParser = StructuredOutputParser.fromNamesAndDescriptions({
    bank_name:
      "The bank name must be a valid Nigerian bank name, including microfinance and digital banks such as 'Access Bank' or 'OPay'. If the user provides a shortened or informal name, convert it to the full official bank name. For example, convert 'uba' to 'UNITED BANK OF AFRICA'. Return an empty string '' if no bank name is provided.",
    crypto:
      "the  crypto_asset is the crypto token that the user is using to pay e.g(bitcoin) and make it all in CAPITAL LETTER or empty string ''",
    network:
      "The blockchain network for the transaction. For USDT, detect whether the user means ERC20, TRC20, or BEP20 from the message. Return empty string '' if no network is mentioned.",
    estimation:
      "estimation is how user will like to estimate their money either dollar, naira , crypto and also the user can input maybe dollar, naira , crypt or empty string ''",
    Amount:
      "The amount the user wants to send. The value may appear with or without a currency symbol, for example '$100', '100', or '40,000'. Treat all as valid amounts. Remove commas and return the amount as a numeric string only, for example '40000'. Return an empty string '' if no amount is provided.",
    acct_number:
      "The account number is a Nigerian bank account number. It must contain exactly 10 digits, for example '7035194443' or '0169552625'. If you see a 10-digit number, treat it as acct_number, not receiver_phoneNumber. Return an empty string '' if no account number is provided.",
    receiver_phoneNumber:
      "The phone number is a Nigerian phone number. It must contain exactly 11 digits, for example '08035194433'. Never return a 10-digit value here because Nigerian account numbers are 10 digits. Return an empty string '' if no phone number is provided.",
    name:
      "the name of the person it can be any tribe name or english name e.g (olawale,maxwell,john) detect any name provided by the user or empty string ''",
    id:
      "The id is in this format: '2S-HKVT5E'. It must always start with '2S-' followed by exactly 6 uppercase letters and/or numbers. Example: '2S-HKVT5E'. Return an empty string '' if no id is provided.",
    type:
      "set type to be transfer when a user to transact or send crypto or set type to be gift when user to send gift, or set type to be request  when a user want to request for there payment ",
  });

  const chain = prompt.pipe(model).pipe(outputParser);

  try {
    return await chain.invoke({
      phrase,
      format_instructions: outputParser.getFormatInstructions(),
    });
  } catch (error) {
    console.error("Extraction failed:", error);

    // Fallback: return empty structured object
    return {
      bank_name: null,
      crypto: null,
      network: null,
      estimation: null,
      Amount: null,
      acct_number: null,
      receiver_phoneNumber: null,
      name: null,
      gift_id: null,
    };
  }
}

function normalizeExtractedData(
  intentData: Record<string, any>,
  phrase: string,
) {
  const normalized = { ...intentData };
  const bankAliases: Record<string, string> = {
    UBA: "UNITED BANK OF AFRICA",
  };
  const amount = String(normalized.Amount ?? "").replace(/[^\d.]/g, "");
  const accountNumber = String(normalized.acct_number ?? "").replace(/\D/g, "");
  const receiverPhoneNumber = String(
    normalized.receiver_phoneNumber ?? "",
  ).replace(/\D/g, "");
  const bankName = String(normalized.bank_name ?? "").trim();
  const bankAliasKey = bankName.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (bankAliases[bankAliasKey]) {
    normalized.bank_name = bankAliases[bankAliasKey];
  }

  if (normalized.crypto) {
    normalized.crypto = String(normalized.crypto).trim().toUpperCase();
  }

  if (normalized.network) {
    normalized.network = String(normalized.network).trim().toUpperCase();
  }

  if (!normalized.crypto) {
    const upperPhrase = phrase.toUpperCase();
    const cryptoMatch = upperPhrase.match(/\b(BTC|ETH|BNB|TRON|USDT)\b/);
    if (cryptoMatch) {
      normalized.crypto = cryptoMatch[1];
    }
  }

  if (!normalized.network) {
    const upperPhrase = phrase.toUpperCase();
    const networkMatch = upperPhrase.match(/\b(ERC20|TRC20|BEP20)\b/);
    if (networkMatch) {
      normalized.network = networkMatch[1];
    }
  }

  if (normalized.estimation) {
    const estimation = String(normalized.estimation).trim().toLowerCase();
    normalized.estimation = estimation === "crypt" ? "crypto" : estimation;
  }

  if (
    normalized.Amount &&
    normalized.network &&
    String(normalized.Amount) ===
      String(normalized.network).replace(/\D/g, "")
  ) {
    normalized.Amount = "";
  }

  if (!normalized.id) {
    const idMatch = phrase.toUpperCase().match(/\b2S-[A-Z0-9]{6}\b/);
    if (idMatch) {
      normalized.id = idMatch[0];
    }
  }

  if (amount) {
    normalized.Amount = amount;
  } else {
    const amountMatches = phrase.matchAll(
      /(?:[$₦#]\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(?:naira|ngn|usd|dollar|dollars))?/gi,
    );

    for (const match of amountMatches) {
      const extractedAmount = match[1]?.replace(/,/g, "");
      const previousChar = phrase[match.index! - 1] ?? "";
      const nextChar = phrase[match.index! + match[0].length] ?? "";
      const isEmbeddedInWord = /[a-z]/i.test(previousChar) || /[a-z]/i.test(nextChar);

      if (
        extractedAmount &&
        !isEmbeddedInWord &&
        extractedAmount.length !== 10 &&
        extractedAmount.length !== 11
      ) {
        normalized.Amount = extractedAmount;
        break;
      }
    }
  }

  if (receiverPhoneNumber.length === 10) {
    if (!accountNumber) {
      normalized.acct_number = receiverPhoneNumber;
    }
    normalized.receiver_phoneNumber = "";
  }

  if (accountNumber.length === 11 && !receiverPhoneNumber) {
    normalized.receiver_phoneNumber = accountNumber;
    normalized.acct_number = "";
  }

  return normalized;
}

function isValidAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function getMissingFields(updatedSession: Sess) {
  const type = (updatedSession.type || "transfer") as PaymentType;
  const missing: string[] = [];
  const crypto = String(updatedSession.crypto ?? "").toUpperCase();
  const network = String(updatedSession.network ?? "").toUpperCase();
  const estimation = String(updatedSession.estimation ?? "").toLowerCase();
  const isRequestFulfillment =
    type === "request" && updatedSession.requestFulfillment === true;
  const isClaimGift =
    type === "gift" && updatedSession.claimGiftMode === true;

  if (!["transfer", "gift", "request"].includes(type)) {
    missing.push("type");
  }

  if (isClaimGift && !updatedSession.id) {
    missing.push("id");
  }

  if (
    type === "transfer" ||
    (type === "gift" && !isClaimGift) ||
    isRequestFulfillment
  ) {
    if (!crypto || !SUPPORTED_CRYPTO.has(crypto)) {
      missing.push("crypto");
    }

    if (crypto === "USDT" && !SUPPORTED_USDT_NETWORKS.has(network)) {
      missing.push("network");
    }

    if (!SUPPORTED_ESTIMATIONS.has(estimation)) {
      missing.push("estimation");
    }
  }

  if (
    !isRequestFulfillment &&
    !isClaimGift &&
    !isValidAmount(updatedSession.Amount)
  ) {
    missing.push("Amount");
  }

  if (
    type === "transfer" ||
    isClaimGift ||
    (type === "request" && !isRequestFulfillment)
  ) {
    if (!updatedSession.bank_name) {
      missing.push("bank_name");
    }

    if (!/^\d{10}$/.test(String(updatedSession.acct_number ?? ""))) {
      missing.push("acct_number");
    }

    if (
      updatedSession.bank_name &&
      updatedSession.acct_number &&
      !updatedSession.receiver_name
    ) {
      missing.push("receiver_name");
    }
  }

  if (
    !isRequestFulfillment &&
    !isClaimGift &&
    !/^\d{11}$/.test(String(updatedSession.receiver_phoneNumber ?? ""))
  ) {
    missing.push("receiver_phoneNumber");
  }

  return missing;
}

function applyConversationState(updatedSession: Sess) {
  const missingFields = getMissingFields(updatedSession);
  const nextField = missingFields[0] ?? "";

  updatedSession.missingFields = missingFields;
  updatedSession.nextField = nextField;
  updatedSession.nextQuestion = nextField ? FIELD_QUESTIONS[nextField] : "";
  updatedSession.isReadyForPayment = missingFields.length === 0;

  return updatedSession;
}

function resetSessionForFlowChange(currentSession: Sess, incomingData: Sess) {
  const previousType = currentSession.type;
  const nextType = incomingData.type;
  const switchingType = Boolean(
    nextType && previousType && nextType !== previousType,
  );
  const switchingToClaimGift =
    nextType === "gift" &&
    incomingData.claimGiftMode === true &&
    currentSession.claimGiftMode !== true;

  if (!switchingType && !switchingToClaimGift) {
    return currentSession;
  }

  const {
    missingFields,
    nextField,
    nextQuestion,
    isReadyForPayment,
    verifier,
    reply,
    requestFulfillment,
    claimGiftMode,
    giftReadyToClaim,
    id,
    totalcrypto,
    wallet_address,
    amountString,
    ...rest
  } = currentSession;

  if (nextType === "gift" && incomingData.claimGiftMode === true) {
    const {
      crypto,
      network,
      estimation,
      Amount,
      receiver_phoneNumber,
      ...claimGiftSession
    } = rest;

    return claimGiftSession;
  }

  if (nextType === "gift") {
    const {
      bank_name,
      acct_number,
      receiver_name,
      bankcode,
      ...giftSession
    } = rest;

    return giftSession;
  }

  if (nextType === "request") {
    const {
      crypto,
      network,
      estimation,
      receiver_phoneNumber,
      ...requestSession
    } = rest;

    return requestSession;
  }

  return rest;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  const { messageText, chatId } = req.body;
  console.log("the message.......", messageText);
  console.log("the chatId.......", chatId);
  // check for chatid
  if (!chatId)
    return res.status(400).json({ message: "ChatId must be included" });
  // check for message length
  if (!messageText)
    return res.status(400).json({ message: "Message must be included" });
  // valid chatid

  if (!session[chatId]) {
    session[chatId] = {};
  }

  if (!userAcctDetail[chatId]) {
    userAcctDetail[chatId] = {};
  }
  try {
    console.log("chatId", chatId);
    // Ensure user history exists
    if (!userHistories.has(chatId)) {
      userHistories.set(chatId, []);
    }

    // Add user message to history
    const history = userHistories.get(chatId);
    history.push(new HumanMessage(messageText));

    // 🧩 Step 1: Extract intent + entity
    const intentData = normalizeExtractedData(
      await extractIntentEntity(messageText),
      messageText,
    );
    // ✅ Remove keys that are null or empty
    const filtered = Object.fromEntries(
      Object.entries(intentData).filter(
        ([_, value]) => value !== "" && value !== "null" && value !== null,
      ),
    );

    if (
      session[chatId]?.type === "request" &&
      session[chatId]?.requestFulfillment
    ) {
      filtered.type = "request";
    }

    const wantsToClaimGift =
      /\bclaim(?:ing)?\s+(?:a\s+)?gift\b/i.test(messageText) ||
      session[chatId]?.claimGiftMode === true;

    if (wantsToClaimGift) {
      filtered.type = "gift";
      filtered.claimGiftMode = true;
    }

    const baseSession = resetSessionForFlowChange(session[chatId], filtered);
    let updatedSession = { ...baseSession, ...filtered };

    console.log("Updatedddd session:", updatedSession);
    if (updatedSession.crypto === "BTC") {
      updatedSession.network = "BTC";
    } else if (updatedSession.crypto === "ETH") {
      updatedSession.network = "ETH";
    } else if (updatedSession.crypto === "TRON") {
      updatedSession.network = "TRC20";
    } else if (updatedSession.crypto === "BNB") {
      updatedSession.network = "BEP20";
    }
    if (!updatedSession.type) {
      updatedSession.type = "transfer";
    }
    // 4. Auto-fetch info if ready
    // if (updatedSession.crypto  && !updatedSession.assetPrice) {
    // updatedSession.network;
    //   updatedSession.assetPrice = await fetchCoinPrice(updatedSession.network);
    //   console.log(updatedSession.assetPrice);
    // }
    // if (!updatedSession.rate) {
    //   // RATE HOOKS

    //  const rate = await fetchRate();
    //  updatedSession["current_rate"] = rate;
    //   updatedSession["merchant_rate"] = await fetchMerchantRate();
    //   updatedSession["profit_rate"] = await fetchProfitRate();

    // }

    if (updatedSession.name) {
      const beneficiaryDate = {
        beneficiary_nickname: updatedSession.name,
        beneficiary_acctNO: userAcctDetail[chatId].acct_number,
        beneficiary_acctName: userAcctDetail[chatId].receiver_name,
        beneficiary_bankName: userAcctDetail[chatId].bank_name,
        beneficiary_phoneNumber: userAcctDetail[chatId].receiver_phoneNumber,
      };
      createBeneficiary(beneficiaryDate);
    }

    if (
      updatedSession.bank_name &&
      updatedSession.acct_number &&
      !updatedSession.receiver_name
    ) {
      const bankDetails = await resolveBankAccount(
        updatedSession.bank_name,
        updatedSession.acct_number,
      );
      console.log("name........", bankDetails);
      if (bankDetails?.account_name)
        updatedSession["receiver_name"] = bankDetails.account_name;
      if (bankDetails?.bankCode) {
        updatedSession["bankcode"] = bankDetails.bankCode;
      }
      userAcctDetail[chatId]["bank_name"] = updatedSession.bank_name;
      userAcctDetail[chatId]["acct_number"] = updatedSession.acct_number;
      userAcctDetail[chatId]["receiver_name"] = updatedSession.receiver_name;
    }

    if (
      updatedSession.type === "request" &&
      updatedSession.id &&
      !updatedSession.requestFulfillment
    ) {
      try {
        console.log("checking request id before fulfillment.......");
        const result = await engineGet<PaymentResponse>(
          `/payments/${updatedSession.id}`,
        );

        if (result.payment.status === "created") {
          updatedSession.Amount = String(result.payment.fiatAmount);
          updatedSession.requestFulfillment = true;
          updatedSession.verifier = false;
          updatedSession.reply = `Request ${updatedSession.id} is valid.`;
        } else if (result.payment.status === "pending") {
          updatedSession.reply = `This request ${updatedSession.id} is pending. Please try again later.`;
          updatedSession.verifier = true;
        } else {
          updatedSession.reply = `this request id is not available ${updatedSession.id}`;
          updatedSession.verifier = true;
        }
      } catch (error: any) {
        console.error("Check request error:", error?.response?.data ?? error);
        updatedSession.reply = `this request id does not exist ${updatedSession.id}`;
        updatedSession.verifier = true;
      }
    }

    if (
      updatedSession.type === "gift" &&
      updatedSession.claimGiftMode &&
      updatedSession.id &&
      !updatedSession.giftReadyToClaim &&
      !updatedSession.verifier
    ) {
      try {
        console.log("checking gift id before claim.......");
        const result = await engineGet<PaymentResponse>(
          `/payments/${updatedSession.id}`,
        );
        const status = result.payment.status?.toLowerCase();

        if (result.payment.type !== "gift") {
          updatedSession.reply = `this gift id is not available ${updatedSession.id}`;
          updatedSession.verifier = true;
        } else if (status === "confirmed" || status === "pending_claim") {
          updatedSession.giftReadyToClaim = true;
          updatedSession.verifier = false;
          updatedSession.Amount = String(result.payment.fiatAmount);
          updatedSession.reply = `Gift ${updatedSession.id} is confirmed. Please provide your bank name so you can claim it.`;
        } else if (status === "settled" || status === "settling") {
          updatedSession.reply = "This gift has already been claimed.";
          updatedSession.verifier = true;
        } else if (
          status === "created" ||
          status === "pending" ||
          status === "confirming" ||
          status === "awaiting_payment"
        ) {
          updatedSession.reply = `this gift is still ${result.payment.status}, try again later `;
          updatedSession.verifier = true;
        } else {
          updatedSession.reply = `this gift id is not available ${updatedSession.id}`;
          updatedSession.verifier = true;
        }
      } catch (error: any) {
        console.error("Check gift error:", error?.response?.data ?? error);
        updatedSession.reply = `this gift id does not exist ${updatedSession.id}`;
        updatedSession.verifier = true;
      }
    }

    updatedSession = applyConversationState(updatedSession);
    
    if (
      updatedSession.type === "gift" &&
      updatedSession.claimGiftMode &&
      updatedSession.giftReadyToClaim &&
      updatedSession.id &&
      updatedSession.bankcode &&
      updatedSession.receiver_name &&
      /^\d{10}$/.test(String(updatedSession.acct_number ?? "")) &&
      !updatedSession.verifier
    ) {
      try {
        const gift: ClaimGiftInput = {
          bankCode: updatedSession.bankcode,
          accountNumber: updatedSession.acct_number,
        };
        await claimGift(updatedSession.id, gift);
        updatedSession.reply = `Your gift claim is successful. The payout will be sent to ${updatedSession.receiver_name}, ${updatedSession.bank_name} ${updatedSession.acct_number}.`;
      } catch (error: any) {
        console.error("Claim gift error:", error?.response?.data ?? error);
        const claimError = error?.response?.data?.error;
        updatedSession.reply =
          claimError === "Gift has already been claimed"
            ? "This gift has already been claimed."
            : claimError ?? "Failed to claim gift";
      }
      updatedSession.verifier = true;
    }

    if (
      updatedSession.type === "request" &&
      updatedSession.requestFulfillment &&
      updatedSession.receiver_phoneNumber
    ) {
      const request: FulfillRequestInput = {
        crypto: updatedSession.crypto,
        network: updatedSession.network,
        payer: {
          chatId: chatId,
          phone: updatedSession.receiver_phoneNumber,
        },
      };
      const payment = await fulfillRequest(updatedSession.id, request);
      console.log("fulfilled request........", payment);
      updatedSession.totalcrypto = payment.cryptoAmount;
      updatedSession.wallet_address = payment.depositAddress;
      updatedSession.amountString = payment.fiatAmount;
      updatedSession.id = payment.reference;
      updatedSession.verifier = true;
    } 


    if (updatedSession.isReadyForPayment && !updatedSession.verifier) {
     if (updatedSession.type === "transfer") {
        const user: CreatePaymentInput = {
          type: "transfer",
          fiatAmount: Number(updatedSession.Amount),
          fiatCurrency: "NGN",
          crypto: updatedSession.crypto,
          network: updatedSession.network,
          payer: {
            chatId: chatId,
          },
          receiver: {
            bankCode: updatedSession.bankcode,
            accountNumber: updatedSession.acct_number,
          },
        };
        const payment = await createEnginePayment(user);
        console.log("payment........", payment);
        updatedSession.totalcrypto = payment.cryptoAmount;
        updatedSession.wallet_address = payment.depositAddress;
        updatedSession.amountString = payment.fiatAmount;
        updatedSession.id = payment.reference;
        updatedSession.verifier = true;
      } else if (updatedSession.type === "gift" && !updatedSession.claimGiftMode) {
        const user: CreatePaymentInput = {
          type: "gift",
          fiatAmount: Number(updatedSession.Amount),
          fiatCurrency: "NGN",
          crypto: updatedSession.crypto,
          network: updatedSession.network,
          payer: {
            chatId: chatId,
          },
        };
        const payment = await createEnginePayment(user);
        console.log("gift........", payment);
        updatedSession.totalcrypto = payment.cryptoAmount;
        updatedSession.wallet_address = payment.depositAddress;
        updatedSession.amountString = payment.fiatAmount;
        updatedSession.id = payment.reference;
        updatedSession.verifier = true;
      } else if (updatedSession.type === "request") {
        const user: CreatePaymentInput = {
          type: "request",
          fiatAmount: Number(updatedSession.Amount),
          payer: {
            chatId: chatId,
          },
          receiver: {
            bankCode: updatedSession.bankcode,
            accountNumber: updatedSession.acct_number,
          },
        };
        const payment = await createEnginePayment(user);
        console.log("request ........", payment);
        updatedSession.amountString = payment.fiatAmount;
        updatedSession.id = payment.reference;
        updatedSession.verifier = true;
      }
    }

    if (updatedSession.type === "gift" && !updatedSession.claimGiftMode) {
      if (updatedSession.id) {
        try {
          console.log("i am working perfectly.......");
          const result = await engineGet<PaymentResponse>(
            `/payments/${updatedSession.id}`,
          );
          if (result.payment.status === "pending") {
            updatedSession.reply = `this gift is still ${result.payment.status}, try again later `;
            updatedSession.verifier = true;
          }
          console.log(result.payment.status);
        } catch (error: any) {
          console.error("Check gift error:", error?.response?.data ?? error);
          return res
            .status(error?.response?.status ?? 500)
            .json(error?.response?.data ?? { error: "Failed to check gift" });
        }
      }
    }

    if (
      updatedSession.type === "request" &&
      updatedSession.id &&
      !updatedSession.requestFulfillment &&
      !updatedSession.verifier
    ) {
      try {
        console.log("i am working perfectly.......");
        const result = await engineGet<PaymentResponse>(
          `/payments/${updatedSession.id}`,
        );
        if (result.payment.status === "created") {
          updatedSession.reply = `this request is still ${result.payment.status}, try again later `;
          updatedSession.verifier = true;
        } else if (result.payment.status === "pending") {
          updatedSession.reply = `This request ${updatedSession.id} is pending. Please try again later.`;
          updatedSession.verifier = true;
        } else {
          updatedSession.reply = `this request id does not exist ${updatedSession.id}`;
          updatedSession.verifier = true;
        }
        console.log(result.payment);
      } catch (error: any) {
        console.error("Check request error:", error?.response?.data ?? error);
        return res
          .status(error?.response?.status ?? 500)
          .json(error?.response?.data ?? { error: "Failed to check request" });
      }
    }

    const prompt = await chatPrompt(updatedSession);
    if (updatedSession.verifier) {
      updatedSession = {};
      session[chatId] = {};
    }
    // Get AI response
    const parser = new StringOutputParser();
    const chain = prompt.pipe(model).pipe(parser);

    const response = await chain.invoke({
      word: messageText,
      chat_history: history,
    });

    session[chatId] = updatedSession;

    // Add AI response to history
    history.push(new AIMessage(response));
    console.log("userHistories", userHistories);
    res.status(200).json({
      reply: response,
    });
  } catch (err: unknown) {
    console.error("Error in /api/openai:", err);
  }
}
