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
import { createBeneficiary } from "@/helpers/api_calls";
import { resolveBankAccount } from "@/services/bank/bank.service";

import { fetchRate } from "@/services/rate/rates.service";

import {
  claimGift,
  createEnginePayment,
  fulfillRequest,
} from "@/services/enginePaymentService";
import { engineGet, enginePost } from "@/lib/settle-client";
import { chat } from "googleapis/build/src/apis/chat";
// at top of the file (outside handler)
type Sess = Record<string, any>;
type PaymentType = "transfer" | "gift" | "request" | "report";
type ComplaintType = "track_transaction" | "stolen_funds" | "fraud";

const SUPPORTED_CRYPTO = new Set(["BTC", "ETH", "BNB", "TRON", "USDT"]);
const SUPPORTED_USDT_NETWORKS = new Set(["ERC20", "TRC20", "BEP20"]);
const SUPPORTED_ESTIMATIONS = new Set(["crypto", "naira", "dollar"]);
const SUPPORTED_COMPLAINT_TYPES = new Set<ComplaintType>([
  "track_transaction",
  "stolen_funds",
  "fraud",
]);
const CRYPTO_ALIASES: Array<[string, RegExp]> = [
  ["BTC", /\b(?:btc|bitcoin|xbt)\b/i],
  ["ETH", /\b(?:eth|ethereum|ether)\b/i],
  ["BNB", /\b(?:bnb|binance\s+(?:coin|token)|binance)\b/i],
  ["TRON", /\b(?:tron|trx)\b/i],
  ["USDT", /\b(?:usdt|tether|tether\s+usd)\b/i],
];

const FIELD_QUESTIONS: Record<string, string> = {
  type: "What would you like to do today: send crypto, create or claim a gift, or request payment?",
  crypto:
    "Which crypto asset do you want to use? You can choose BTC/Bitcoin, ETH/Ethereum, BNB/Binance token, TRON/TRX, or USDT/Tether.",
  network: "Which USDT network do you want to use: ERC20, TRC20, or BEP20?",
  estimation:
    "How would you like to estimate the amount: crypto, naira, or dollar?",
  Amount: "Please enter the amount again.",
  bank_name: "What bank should receive the payment?",
  acct_number: "Please enter the 10-digit account number.",
  receiver_name:
    "Please confirm the bank name and account number so I can verify the account name.",
  accountDetailsConfirmed: "",
  receiver_phoneNumber: "Please enter the recipient phone number.",
  id: "Please enter the gift id.",
  complaintType:
    "What type of report is this: stolen funds, fraud, or track transaction?",
  reportName: "Please enter your full name for the report.",
  reportPhoneNumber: "Please enter your phone number for the report.",
  reportWalletAddress: "Please enter your wallet address.",
  fraudsterWalletAddress:
    "Please enter the fraudster wallet address, or type skip if you do not have it.",
  reportDescription: "Please briefly describe what happened.",
};

const GREETING_TYPE_QUESTION = FIELD_QUESTIONS.type;

interface ReportResponse {
  success: boolean;
  data: {
    report: {
      reportId: string;
      status: string;
    };
  };
}

interface CreatePaymentInput {
  type: "transfer" | "gift";
  fiatAmount: number;
  fiatCurrency?: string;
  crypto?: string;
  network?: string;
  chargeFrom?: "fiat" | "crypto";
  payer?: { chatId: string; phone?: string };
  receiver?: { bankCode: string; accountNumber: string };
}

interface CreateRequestPaymentInput {
  type: "request";
  fiatAmount: number;
  fiatCurrency?: string;
  receiver: {
    bankCode: string;
    accountNumber: string;
    phone: string;
  };
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
  model: "google/gemini-3.5-flash",
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
      "The crypto asset/token the user wants to use. Return only one supported symbol in CAPITAL LETTERS: BTC for btc/bitcoin, ETH for eth/ethereum/ether, BNB for bnb/binance coin/binance token, TRON for tron/trx, or USDT for usdt/tether. Return an empty string '' if no supported crypto is provided.",
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
    name: "the name of the person it can be any tribe name or english name e.g (olawale,maxwell,john) detect any name provided by the user or empty string ''",
    complaintType:
      "The complaint type for a report. Return exactly one of: stolen_funds, fraud, track_transaction. If user says stolen funds, missing funds, disappeared funds, phishing, wrong address, or funds were stolen, use stolen_funds. If user says scam or fraud, use fraud. If user wants to track a transaction, use track_transaction. Return empty string '' if no report complaint type is provided.",
    walletAddress:
      "The reporter/user wallet address. Detect crypto wallet addresses, for example Tron addresses starting with T, EVM addresses starting with 0x, or BTC addresses. Return empty string '' if missing.",
    fraudsterWalletAddress:
      "The fraudster/scammer wallet address, if the user provides one. Detect crypto wallet addresses. Return empty string '' if missing or if the user says skip/no/none.",
    description:
      "A short report description of what happened. Return the user's explanation if they describe the issue. Return empty string '' if missing.",
    id: "The id is in this format: '2S-HKVT5E'. It must always start with '2S-' followed by exactly 6 uppercase letters and/or numbers. Example: '2S-HKVT5E'. Return an empty string '' if no id is provided.",
    type: "set type to be report when a user wants to report stolen funds, fraud, scam, phishing, missing funds, or track a transaction. set type to be transfer when a user to transact or send crypto or set type to be gift when user to send gift, or set type to be request when a user want to request for there payment ",
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
      complaintType: null,
      walletAddress: null,
      fraudsterWalletAddress: null,
      description: null,
      gift_id: null,
    };
  }
}

function normalizeComplaintType(value: unknown): ComplaintType | "" {
  const complaint = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    complaint.includes("stolen") ||
    complaint.includes("missing") ||
    complaint.includes("disappear") ||
    complaint.includes("phishing")
  ) {
    return "stolen_funds";
  }

  if (complaint.includes("track") || complaint.includes("transaction")) {
    return "track_transaction";
  }

  if (complaint.includes("fraud") || complaint.includes("scam")) {
    return "fraud";
  }

  return SUPPORTED_COMPLAINT_TYPES.has(complaint as ComplaintType)
    ? (complaint as ComplaintType)
    : "";
}

function looksLikeReportRequest(phrase: string) {
  return /\b(report|complain|complaint|fraud|scam|stolen|missing|disappear(?:ed)?|phishing|track\s+transaction)\b/i.test(
    phrase,
  );
}

function looksLikeClaimGiftRequest(phrase: string) {
  return /\b(?:claim(?:ing)?|receiv(?:e|ing)|redeem(?:ing)?|collect(?:ing)?|get(?:ting)?)\s+(?:a\s+)?gift\b/i.test(
    phrase,
  );
}

function looksLikeCreateGiftRequest(phrase: string, currentSession: Sess = {}) {
  return (
    /\b(?:creat(?:e|ing)|send(?:ing)?|mak(?:e|ing)|generat(?:e|ing))\s+(?:a\s+)?gift\b/i.test(
      phrase,
    ) ||
    (currentSession.claimGiftMode === true &&
      /\b(?:creat(?:e|ing)|send(?:ing)?|mak(?:e|ing)|generat(?:e|ing))(?:\s+(?:one|it))?\s+instead\b/i.test(
        phrase,
      ))
  );
}

function normalizeCryptoAsset(value: unknown) {
  const crypto = String(value ?? "").trim();

  if (!crypto) return "";

  for (const [symbol, pattern] of CRYPTO_ALIASES) {
    if (pattern.test(crypto)) {
      return symbol;
    }
  }

  const upperCrypto = crypto.toUpperCase();
  return SUPPORTED_CRYPTO.has(upperCrypto) ? upperCrypto : "";
}

function isGreetingOnly(phrase: string) {
  const normalized = phrase
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return false;

  return /^(?:hi+|hello+|hey+|yo+|sup|good\s+(?:morning|afternoon|evening)|how\s+far|how\s+body|how\s+you\s+dey|wetin\s+dey|what'?s\s+up|whats\s+up|how\s+are\s+you|how\s+are\s+you\s+doing|how\s+is\s+it\s+going)(?:\s+(?:there|boss|chief|bro|sis|my\s+g|fam|dear|please|pls))?$/.test(
    normalized,
  );
}

// Streams the greeting reply chunk-by-chunk instead of blocking on the full
// completion. Quote-stripping only applies to the first chunk (can't know
// which chunk is "last" while streaming, so trailing-quote cleanup is
// dropped — acceptable cosmetic tradeoff for genuine token-level streaming).
async function* streamGreetingReply(messageText: string): AsyncGenerator<string> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a cheerful Nigerian crypto assistant for 2settle.
Reply to the user's greeting with one short, friendly greeting only.
Use natural Nigerian warmth when it fits.
Do not ask what they want to do.
Do not mention crypto, gifts, requests, payments, fees, or transactions.
Do not use markdown.
Keep it under 12 words.`,
    ],
    ["human", "{word}"],
  ]);

  let sawAnyChunk = false;
  let isFirstChunk = true;

  try {
    const parser = new StringOutputParser();
    const stream = await prompt.pipe(model).pipe(parser).stream({
      word: messageText,
    });

    for await (const chunk of stream) {
      let toSend = chunk;
      if (isFirstChunk) {
        toSend = toSend.replace(/^["']/, "");
        isFirstChunk = false;
      }
      if (toSend) {
        sawAnyChunk = true;
        yield toSend;
      }
    }
  } catch (error) {
    console.error("Greeting response failed:", error);
  }

  if (!sawAnyChunk) {
    yield "How far my chief! Everything dey soft.";
  }

  yield ` ${GREETING_TYPE_QUESTION}`;
}

function extractWalletAddresses(phrase: string) {
  const matches =
    phrase.match(
      /\b(?:0x[a-fA-F0-9]{40}|T[a-zA-Z0-9]{33}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,39})\b/g,
    ) ?? [];
  return matches;
}

function normalizeReportInput(
  filtered: Sess,
  currentSession: Sess,
  phrase: string,
) {
  const isReportFlow =
    filtered.type === "report" ||
    currentSession.type === "report" ||
    looksLikeReportRequest(phrase);

  if (!isReportFlow) {
    return filtered;
  }

  const nextField = currentSession.nextField;
  const normalized: Sess = { ...filtered, type: "report" };

  if (filtered.complaintType) {
    normalized.complaintType = normalizeComplaintType(filtered.complaintType);
  }

  if (filtered.name && !filtered.reportName) {
    normalized.reportName = filtered.name;
    delete normalized.name;
  }

  if (filtered.receiver_phoneNumber && !filtered.reportPhoneNumber) {
    normalized.reportPhoneNumber = filtered.receiver_phoneNumber;
    delete normalized.receiver_phoneNumber;
  }

  if (filtered.walletAddress && !filtered.reportWalletAddress) {
    normalized.reportWalletAddress = filtered.walletAddress;
    delete normalized.walletAddress;
  }

  if (filtered.description && !filtered.reportDescription) {
    normalized.reportDescription = filtered.description;
    delete normalized.description;
  }

  if (
    nextField === "fraudsterWalletAddress" &&
    /^(skip|no|none|nil|n\/a)$/i.test(phrase.trim())
  ) {
    normalized.fraudsterWalletAddress = "";
  }

  if (nextField === "reportName" && !normalized.reportName) {
    normalized.reportName = phrase.trim();
  }

  if (nextField === "reportPhoneNumber" && !normalized.reportPhoneNumber) {
    const phone = phrase.replace(/\D/g, "");
    if (phone) normalized.reportPhoneNumber = phone;
  }

  if (nextField === "reportWalletAddress" && !normalized.reportWalletAddress) {
    normalized.reportWalletAddress = phrase.trim();
  }

  if (
    nextField === "fraudsterWalletAddress" &&
    normalized.fraudsterWalletAddress === undefined
  ) {
    normalized.fraudsterWalletAddress = phrase.trim();
  }

  if (nextField === "reportDescription" && !normalized.reportDescription) {
    normalized.reportDescription = phrase.trim();
  }

  return normalized;
}

function parseYesNo(phrase: string) {
  const normalized = phrase
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");

  if (
    /\b(?:no|n|nope|incorrect|wrong)\b|\bnot\s+correct\b/.test(normalized)
  ) {
    return false;
  }

  if (
    /\b(?:yes|y|yeah|yep|correct|right|ok|okay|sure|confirm|confirmed)\b/.test(
      normalized,
    )
  ) {
    return true;
  }

  return null;
}

function normalizeAccountDetailsConfirmation(
  filtered: Sess,
  currentSession: Sess,
  phrase: string,
) {
  if (currentSession.nextField !== "accountDetailsConfirmed") {
    return filtered;
  }

  const confirmation = parseYesNo(phrase);

  if (confirmation === true) {
    return { ...filtered, accountDetailsConfirmed: true };
  }

  if (confirmation === false) {
    return {
      ...filtered,
      accountDetailsConfirmed: false,
      bank_name: undefined,
      acct_number: undefined,
      receiver_name: undefined,
      bankcode: undefined,
    };
  }

  return filtered;
}

// Deterministic fast-path for narrowly-typed fields we're already regex-matching
// downstream. Skips the extraction LLM call entirely when it returns non-null.
// Returns null when the field needs real semantic understanding (bank_name,
// free-text report fields) or when no nextField is set yet — those always
// defer to extractIntentEntity().
function tryDeterministicExtraction(
  currentSession: Sess,
  phrase: string,
): Record<string, any> | null {
  const nextField = currentSession?.nextField;
  const trimmed = phrase.trim();

  switch (nextField) {
    case "accountDetailsConfirmed":
      // normalizeAccountDetailsConfirmation() re-derives yes/no from the raw
      // phrase downstream, so an empty object is enough to skip the LLM call.
      return parseYesNo(phrase) !== null ? {} : null;

    case "acct_number":
      return /^\d{10}$/.test(trimmed) ? { acct_number: trimmed } : null;

    case "receiver_phoneNumber":
      return /^\d{11}$/.test(trimmed)
        ? { receiver_phoneNumber: trimmed }
        : null;

    case "Amount": {
      const amountMatch = trimmed.match(
        /^(?:[$₦#]\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)$/,
      );
      const amount = amountMatch?.[1]?.replace(/,/g, "");
      return amount ? { Amount: amount } : null;
    }

    case "id":
      return /^2S-[A-Z0-9]{6}$/i.test(trimmed)
        ? { id: trimmed.toUpperCase() }
        : null;

    case "crypto": {
      for (const [symbol, pattern] of CRYPTO_ALIASES) {
        if (pattern.test(phrase)) return { crypto: symbol };
      }
      return null;
    }

    case "network": {
      const networkMatch = phrase.toUpperCase().match(/\b(ERC20|TRC20|BEP20)\b/);
      return networkMatch ? { network: networkMatch[1] } : null;
    }

    case "estimation": {
      const estimation = trimmed.toLowerCase();
      if (["crypto", "crypt", "naira", "dollar"].includes(estimation)) {
        return { estimation: estimation === "crypt" ? "crypto" : estimation };
      }
      return null;
    }

    default:
      return null;
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
    normalized.crypto = normalizeCryptoAsset(normalized.crypto);
  }

  if (normalized.network) {
    normalized.network = String(normalized.network).trim().toUpperCase();
  }

  if (!normalized.crypto) {
    for (const [symbol, pattern] of CRYPTO_ALIASES) {
      if (pattern.test(phrase)) {
        normalized.crypto = symbol;
        break;
      }
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
    String(normalized.Amount) === String(normalized.network).replace(/\D/g, "")
  ) {
    normalized.Amount = "";
  }

  if (!normalized.id) {
    const idMatch = phrase.toUpperCase().match(/\b2S-[A-Z0-9]{6}\b/);
    if (idMatch) {
      normalized.id = idMatch[0];
    }
  }

  const walletAddresses = extractWalletAddresses(phrase);
  if (!normalized.walletAddress && walletAddresses[0]) {
    normalized.walletAddress = walletAddresses[0];
  }
  if (!normalized.fraudsterWalletAddress && walletAddresses[1]) {
    normalized.fraudsterWalletAddress = walletAddresses[1];
  }

  if (normalized.complaintType) {
    normalized.complaintType = normalizeComplaintType(normalized.complaintType);
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
      const isEmbeddedInWord =
        /[a-z]/i.test(previousChar) || /[a-z]/i.test(nextChar);

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

function getAccountDetailsConfirmationQuestion(updatedSession: Sess) {
  return `Please confirm if these account details are correct:\nName: ${updatedSession.receiver_name}\nBank name: ${updatedSession.bank_name}\nAccount number: ${updatedSession.acct_number}\nReply yes to continue or no to correct them.`;
}

function getMissingFields(updatedSession: Sess) {
  const type = (updatedSession.type || "transfer") as PaymentType;
  const missing: string[] = [];
  const crypto = String(updatedSession.crypto ?? "").toUpperCase();
  const network = String(updatedSession.network ?? "").toUpperCase();
  const estimation = String(updatedSession.estimation ?? "").toLowerCase();
  const isRequestFulfillment =
    type === "request" && updatedSession.requestFulfillment === true;
  const isClaimGift = type === "gift" && updatedSession.claimGiftMode === true;

  if (type === "report") {
    if (!SUPPORTED_COMPLAINT_TYPES.has(updatedSession.complaintType)) {
      missing.push("complaintType");
    }

    if (!updatedSession.reportName) {
      missing.push("reportName");
    }

    if (!/^\d{11,15}$/.test(String(updatedSession.reportPhoneNumber ?? ""))) {
      missing.push("reportPhoneNumber");
    }

    if (!updatedSession.reportWalletAddress) {
      missing.push("reportWalletAddress");
    }

    if (updatedSession.fraudsterWalletAddress === undefined) {
      missing.push("fraudsterWalletAddress");
    }

    if (!updatedSession.reportDescription) {
      missing.push("reportDescription");
    }

    return missing;
  }

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

    if (
      updatedSession.bank_name &&
      /^\d{10}$/.test(String(updatedSession.acct_number ?? "")) &&
      updatedSession.receiver_name &&
      updatedSession.accountDetailsConfirmed !== true
    ) {
      missing.push("accountDetailsConfirmed");
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
  updatedSession.nextQuestion =
    nextField === "accountDetailsConfirmed"
      ? getAccountDetailsConfirmationQuestion(updatedSession)
      : nextField
        ? FIELD_QUESTIONS[nextField]
        : "";
  updatedSession.isReadyForPayment = missingFields.length === 0;

  return updatedSession;
}

// Deterministic reply resolver: the chatPrompt() rules already tell the LLM
// to just parrot back one of these precomputed strings in every currently
// modeled flow, so we can skip the reply-generation LLM call entirely and
// return the string directly. Returns null only for session shapes this
// resolver doesn't recognize, as a safety net that falls through to the LLM.
//
// Priority is `verifier`-first rather than a flat reply-then-nextField order:
// gift-claim/request-fulfillment lookups can set both `reply` (an invalid/
// pending/claimed status message) and a stale `nextField` (computed from
// getMissingFields without knowing the id turned out to be unusable) on the
// same turn. `verifier === true` marks a terminal turn (session resets right
// after), so when it's set, the terminal message (`reply`, or the creation
// success template) must win over any leftover `nextField` question.
function resolveDeterministicReply(session: Sess): string | null {
  if (session.type === "report" && session.reply) {
    return session.reply;
  }

  if (session.verifier === true) {
    if (session.reply) {
      return session.reply;
    }

    if (session.isReadyForPayment) {
      const creationReply = resolveCreationSuccessReply(session);
      if (creationReply) return creationReply;
    }
  }

  if (session.nextField === "accountDetailsConfirmed") {
    return getAccountDetailsConfirmationQuestion(session);
  }

  if (session.nextField) {
    return FIELD_QUESTIONS[session.nextField] ?? null;
  }

  if (session.isReadyForPayment) {
    const creationReply = resolveCreationSuccessReply(session);
    if (creationReply) return creationReply;
  }

  if (session.reply) {
    return session.reply;
  }

  return null;
}

function resolveCreationSuccessReply(session: Sess): string | null {
  const isClaimGift = session.type === "gift" && session.claimGiftMode === true;
  const isRequestFulfillment =
    session.type === "request" && session.requestFulfillment === true;

  if (session.type === "transfer") {
    const summary =
      session.transferSummary ||
      `You are sending ${session.totalcrypto} ${session.crypto} and you will be receiving ₦${session.amountString}.`;
    // Mentioning the wallet address here (matching the gift/request templates
    // below) is what lets the frontend's getCopyableReplyItems() regex pick
    // it up and render the Please Note / Copy Wallet Address / countdown
    // timer bubbles — the original chatPrompt() rules for transfer never
    // actually gave the LLM this value, so those bubbles never appeared.
    return `${summary}\nWallet Address: ${session.wallet_address}`;
  }

  if (session.type === "gift" && !isClaimGift) {
    return `You are sending ${session.totalcrypto} ${session.crypto} to this wallet address ${session.wallet_address} and recipient will be receiving ₦${session.amountString} Gift_id: ${session.id}.`;
  }

  if (session.type === "request" && isRequestFulfillment) {
    return `You are sending ${session.totalcrypto} ${session.crypto} to this wallet address ${session.wallet_address} for request_id: ${session.id}.`;
  }

  if (session.type === "request" && !isRequestFulfillment) {
    return `You will receive ₦${session.amountString}.\nIt would be paid into:\nBank Name: ${session.bank_name}\nAccount Number: ${session.acct_number}\nAccount Name: ${session.receiver_name}\nYou can copy the requestId below and share with the person to fulfill the request.\nrequest_id: ${session.id}`;
  }

  return null;
}

function getApiErrorResponse(error: any) {
  const code = error?.response?.data?.code;
  const status = error?.response?.status ?? 500;

  if (code === "DEPOSIT_ADDRESS_IN_USE") {
    return {
      status,
      body: {
        code,
        error:
          "That deposit wallet is already tied to an active payment session. Please complete the current payment or wait for it to expire before starting another one.",
      },
    };
  }

  return {
    status,
    body: {
      code,
      error:
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        "Something went wrong. Please try again.",
    },
  };
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
  const switchingFromClaimGiftToCreate =
    nextType === "gift" &&
    incomingData.claimGiftMode === false &&
    currentSession.claimGiftMode === true;

  if (
    !switchingType &&
    !switchingToClaimGift &&
    !switchingFromClaimGiftToCreate
  ) {
    return currentSession;
  }

  const {
    missingFields,
    nextField,
    nextQuestion,
    isReadyForPayment,
    verifier,
    reply,
    accountDetailsConfirmed,
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
    const { bank_name, acct_number, receiver_name, bankcode, ...giftSession } =
      rest;

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

  let shouldClearSessionAfterEngineCall = false;

  try {
    console.log("chatId", chatId);
    // Ensure user history exists
    if (!userHistories.has(chatId)) {
      userHistories.set(chatId, []);
    }

    // Add user message to history
    const history = userHistories.get(chatId);
    history.push(new HumanMessage(messageText));

    if (isGreetingOnly(messageText)) {
      session[chatId] = {};

      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      });

      let greetingReply = "";
      for await (const chunk of streamGreetingReply(messageText)) {
        greetingReply += chunk;
        res.write(chunk);
      }

      history.push(new AIMessage(greetingReply));
      return res.end();
    }

    // 🧩 Step 1: Extract intent + entity
    // Skip the extraction LLM call when the answer is a narrowly-typed field
    // we already regex-match downstream (yes/no, digits, known id format).
    const rawIntentData =
      tryDeterministicExtraction(session[chatId], messageText) ??
      (await extractIntentEntity(messageText));
    const intentData = normalizeExtractedData(rawIntentData, messageText);
    // ✅ Remove keys that are null or empty
    let filtered = Object.fromEntries(
      Object.entries(intentData).filter(
        ([_, value]) => value !== "" && value !== "null" && value !== null,
      ),
    );

    filtered = normalizeReportInput(filtered, session[chatId], messageText);
    filtered = normalizeAccountDetailsConfirmation(
      filtered,
      session[chatId],
      messageText,
    );

    if (
      session[chatId]?.type === "request" &&
      session[chatId]?.requestFulfillment
    ) {
      filtered.type = "request";
    }

    const wantsToCreateGift = looksLikeCreateGiftRequest(
      messageText,
      session[chatId],
    );
    const wantsToClaimGift =
      !wantsToCreateGift &&
      (looksLikeClaimGiftRequest(messageText) ||
        session[chatId]?.claimGiftMode === true);

    if (wantsToCreateGift) {
      filtered.type = "gift";
      filtered.claimGiftMode = false;
    } else if (wantsToClaimGift) {
      filtered.type = "gift";
      filtered.claimGiftMode = true;
    }

    const baseSession = resetSessionForFlowChange(session[chatId], filtered);
    const bankDetailsChanged =
      (filtered.bank_name && filtered.bank_name !== baseSession.bank_name) ||
      (filtered.acct_number &&
        filtered.acct_number !== baseSession.acct_number);

    if (bankDetailsChanged) {
      baseSession.receiver_name = undefined;
      baseSession.bankcode = undefined;
      baseSession.accountDetailsConfirmed = false;
    }

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

    if (updatedSession.type !== "report" && updatedSession.name) {
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
      updatedSession.type === "report" &&
      updatedSession.isReadyForPayment &&
      !updatedSession.verifier
    ) {
      try {
        shouldClearSessionAfterEngineCall = true;
        const report = await enginePost<ReportResponse>("/reports", {
          complaintType: updatedSession.complaintType,
          name: updatedSession.reportName,
          phoneNumber: updatedSession.reportPhoneNumber,
          walletAddress: updatedSession.reportWalletAddress,
          fraudsterWalletAddress:
            updatedSession.fraudsterWalletAddress || undefined,
          description: updatedSession.reportDescription,
        });

        updatedSession.reportId = report.data.report.reportId;
        updatedSession.reportStatus = report.data.report.status;
        updatedSession.reply = `Report submitted successfully. Your report ID is ${updatedSession.reportId}. Status: ${updatedSession.reportStatus}.`;
        updatedSession.verifier = true;
      } catch (error: any) {
        console.error("Create report error:", error?.response?.data ?? error);
        updatedSession.reply =
          error?.response?.data?.error ??
          "Failed to submit report. Please try again.";
        updatedSession.verifier = true;
      }
    }

    if (
      updatedSession.type === "gift" &&
      updatedSession.claimGiftMode &&
      updatedSession.giftReadyToClaim &&
      updatedSession.id &&
      updatedSession.bankcode &&
      updatedSession.receiver_name &&
      updatedSession.accountDetailsConfirmed === true &&
      /^\d{10}$/.test(String(updatedSession.acct_number ?? "")) &&
      !updatedSession.verifier
    ) {
      try {
        const gift: ClaimGiftInput = {
          bankCode: updatedSession.bankcode,
          accountNumber: updatedSession.acct_number,
        };
        shouldClearSessionAfterEngineCall = true;
        await claimGift(updatedSession.id, gift);
        updatedSession.reply = `Your gift claim is successful. The payout will be sent to ${updatedSession.receiver_name}, ${updatedSession.bank_name} ${updatedSession.acct_number}.`;
      } catch (error: any) {
        console.error("Claim gift error:", error?.response?.data ?? error);
        const claimError = error?.response?.data?.error;
        updatedSession.reply =
          claimError === "Gift has already been claimed"
            ? "This gift has already been claimed."
            : (claimError ?? "Failed to claim gift");
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
      shouldClearSessionAfterEngineCall = true;
      const payment = await fulfillRequest(updatedSession.id, request);
      console.log("fulfilled request........", payment);
      updatedSession.totalcrypto = payment.cryptoAmount;
      updatedSession.wallet_address = payment.depositAddress;
      updatedSession.amountString = payment.fiatAmount;
      updatedSession.id = payment.reference;
      updatedSession.verifier = true;
    }

    if (updatedSession.isReadyForPayment && !updatedSession.verifier) {
      // The payment engine only accepts NGN. When the user chose to estimate
      // in dollars, `Amount` is a USD figure and must be converted before
      // being sent as fiatAmount — "naira" estimation is already NGN as-is.
      // Request creation doesn't offer a dollar estimation (always NGN), so
      // it's untouched.
      let fiatAmountInNgn = Number(updatedSession.Amount);
      if (String(updatedSession.estimation).toLowerCase() === "dollar") {
        const rateNumeric = await fetchRate();
        fiatAmountInNgn = fiatAmountInNgn * rateNumeric;
      }

      if (updatedSession.type === "transfer") {
        const user: CreatePaymentInput = {
          type: "transfer",
          fiatAmount: fiatAmountInNgn,
          fiatCurrency: "NGN",
          crypto: updatedSession.crypto,
          network: updatedSession.network,
          chargeFrom: "crypto",
          payer: {
            chatId: chatId,
          },
          receiver: {
            bankCode: updatedSession.bankcode,
            accountNumber: updatedSession.acct_number,
          },
        };
        shouldClearSessionAfterEngineCall = true;
        const payment = await createEnginePayment(user);
        console.log("payment........", payment);
        updatedSession.totalcrypto = payment.cryptoAmount;
        updatedSession.wallet_address = payment.depositAddress;
        updatedSession.amountString = payment.fiatAmount;
        updatedSession.id = payment.reference;
        updatedSession.transferSummary = `You are sending ${updatedSession.totalcrypto} ${updatedSession.crypto} and you will be receiving ₦${updatedSession.amountString}.`;
        updatedSession.verifier = true;
      } else if (
        updatedSession.type === "gift" &&
        !updatedSession.claimGiftMode
      ) {
        const user: CreatePaymentInput = {
          type: "gift",
          fiatAmount: Number(updatedSession.Amount),
          fiatCurrency: "NGN",
          crypto: updatedSession.crypto,
          network: updatedSession.network,
          chargeFrom: "crypto",
          payer: {
            chatId: chatId,
          },
        };
        shouldClearSessionAfterEngineCall = true;
        const payment = await createEnginePayment(user);
        console.log("gift........", payment);
        updatedSession.totalcrypto = payment.cryptoAmount;
        updatedSession.wallet_address = payment.depositAddress;
        updatedSession.amountString = payment.fiatAmount;
        updatedSession.id = payment.reference;
        updatedSession.verifier = true;
      } else if (updatedSession.type === "request") {
        const user: CreateRequestPaymentInput = {
          type: "request",
          fiatAmount: Number(updatedSession.Amount),
          fiatCurrency: "NGN",
          receiver: {
            bankCode: updatedSession.bankcode,
            accountNumber: updatedSession.acct_number,
            phone: updatedSession.receiver_phoneNumber,
          },
        };
        shouldClearSessionAfterEngineCall = true;
        const payment = await createEnginePayment(user);
        console.log("request ........", payment);
        updatedSession.amountString = payment.fiatAmount;
        updatedSession.id = payment.reference;
        updatedSession.verifier = true;
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

    // Most turns already have their reply fully determined by the session
    // state above (chatPrompt()'s own rules just tell the LLM to parrot it
    // back) — skip building the prompt and calling the LLM entirely when we
    // can resolve it ourselves. Must run before the verifier reset below,
    // since it reads pre-reset session fields.
    const deterministicReply = resolveDeterministicReply(updatedSession);
    const shouldClearHistoryAfterReply =
      shouldClearSessionAfterEngineCall ||
      (updatedSession.verifier === true && Boolean(updatedSession.wallet_address));

    if (updatedSession.verifier || shouldClearSessionAfterEngineCall) {
      updatedSession = {};
      session[chatId] = {};
    }

    session[chatId] = updatedSession;

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });

    let response: string;

    if (deterministicReply !== null) {
      response = deterministicReply;
      res.write(response);
    } else {
      // Fallback for session shapes the resolver doesn't recognize (and the
      // greeting-adjacent edge cases): stream the LLM's reply token-by-token
      // instead of blocking on the full completion.
      const prompt = await chatPrompt(updatedSession);
      const parser = new StringOutputParser();
      const chain = prompt.pipe(model).pipe(parser);
      const stream = await chain.stream({
        word: messageText,
        chat_history: history,
      });

      response = "";
      for await (const chunk of stream) {
        response += chunk;
        res.write(chunk);
      }
    }

    // Add AI response to history
    history.push(new AIMessage(response));
    if (shouldClearHistoryAfterReply) {
      userHistories.set(chatId, []);
    }
    console.log("userHistories", userHistories);
    res.end();
  } catch (err: unknown) {
    console.error("Error in /api/ai/geminiApi:", err);
    if (shouldClearSessionAfterEngineCall) {
      session[chatId] = {};
      userHistories.set(chatId, []);
    }

    if (!res.headersSent) {
      const { status, body } = getApiErrorResponse(err);
      res.status(status).json(body);
    } else {
      res.end();
    }
  }
}
