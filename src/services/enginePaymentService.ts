import api from "./api-client";

// Maps chat app network names to payment engine network names
const NETWORK_MAP: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  bnb: "bsc",
  trx: "tron",
  erc20: "erc20",
  bep20: "bep20",
  trc20: "trc20",
};

export function mapNetwork(network: string): string {
  return NETWORK_MAP[network.toLowerCase()] ?? network.toLowerCase();
}

function mapCrypto(crypto: string): string {
  const normalized = crypto.toUpperCase();
  return normalized === "TRON" ? "TRX" : normalized;
}

function mapPaymentNetwork(crypto: string | undefined, network: string): string {
  const normalizedCrypto = crypto ? mapCrypto(crypto) : "";

  if (normalizedCrypto === "BNB") return "bsc";
  if (normalizedCrypto === "TRX") return "tron";

  return mapNetwork(network);
}

export interface EnginePayment {
  reference: string;
  type: string;
  depositAddress: string | null;
  cryptoAmount: number | null;
  fiatAmount: number;
  crypto: string;
  network: string;
  status: string;
  expiresAt: string | null;
}

interface CreatePaymentInput {
  type: "transfer" | "gift";
  fiatAmount?: number;
  cryptoAmount?: number;
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

interface FulfillRequestInput {
  crypto: string;
  network: string;
  payer: { chatId: string; phone?: string };
}

interface ClaimGiftInput {
  bankCode: string;
  accountNumber: string;
}

const GENERIC_PAYMENT_ERROR = "Failed to create payment. Please try again.";
const GENERIC_NETWORK_ERROR = "Could not reach the server. Please check your connection and try again.";

// Patterns that indicate a message is leaking implementation details (stack
// traces, file paths, DB/driver errors, etc.) rather than a clean, user-facing
// validation message. Any match means we must not show the raw text to the user.
const INTERNAL_LEAK_PATTERNS: RegExp[] = [
  /\bat\s+.+\(.+:\d+:\d+\)/i, // stack trace frame: "at fn (file:line:col)"
  /\.(ts|js|tsx|jsx|mjs|cjs):\d+/i, // "file.ts:42" style references
  /node_modules/i,
  /[a-zA-Z]:\\[^\s]+/, // Windows absolute path
  /\/(?:home|var|usr|etc|src|app)\/[^\s]+/i, // Unix absolute path
  /\b(SQLSTATE|ER_[A-Z_]+|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND)\b/,
  /\b(MongoServerError|MongooseError|PrismaClientKnownRequestError|SequelizeError|Sequelize\w*Error)\b/,
  /\b(TypeError|ReferenceError|SyntaxError|RangeError)\b/,
  /cannot read propert(y|ies)/i,
  /is not a function/i,
  /undefined is not/i,
  /(mongodb|postgres|postgresql|mysql|redis|amqp):\/\//i,
  /\b(process\.env|api[_-]?key|secret|authorization:\s*bearer)\b/i,
  /duplicate entry/i,
  /stack\s*trace/i,
];

function isSafeForUser(message: unknown): message is string {
  if (typeof message !== "string" || message.trim().length === 0) return false;
  if (message.length > 200) return false;
  if (message.includes("\n")) return false; // multi-line text is almost always a dump/trace
  return !INTERNAL_LEAK_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Returns a message safe to show end users. Backend text is only trusted for
 * 4xx responses (expected, client-correctable errors) and must pass a leak
 * check; everything else (5xx, network failures, unexpected shapes) falls
 * back to a generic message so internals never reach the UI.
 */
export function getEnginePaymentErrorMessage(error: any): string {
  if (error?.response?.data?.code === "DEPOSIT_ADDRESS_IN_USE") {
    return "That deposit wallet is already tied to an active payment session. Please complete the current payment or wait for it to expire before starting another one.";
  }

  const message =
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.message ??
    "Failed to create payment. Please try again.";
  const code = error?.response?.data?.code;
  const isSafeCode = typeof code === "string" && /^[A-Z0-9_]+$/.test(code);

  return isSafeCode ? `${message} (${code})` : message;
}

export async function createEnginePayment(
  input: CreatePaymentInput | CreateRequestPaymentInput,
): Promise<EnginePayment> {
  const body: Record<string, unknown> = {
    type: input.type,
    fiatCurrency: input.fiatCurrency ?? "NGN",
  };

  if (input.fiatAmount !== undefined) body.fiatAmount = input.fiatAmount;
  if (input.receiver) body.receiver = input.receiver;

  if (input.type !== "request") {
    if (input.cryptoAmount !== undefined) body.cryptoAmount = input.cryptoAmount;
    if (input.crypto) body.crypto = mapCrypto(input.crypto);
    if (input.network) {
      body.network = mapPaymentNetwork(input.crypto, input.network);
    }
    if (input.chargeFrom) body.chargeFrom = input.chargeFrom;
    if (input.payer) body.payer = input.payer;
  }

  try {
    const response = await api.post<{ success: boolean; payment: EnginePayment }>(
      "/api/payments",
      body,
      { timeout: 45000 }
    );

    return response.data.payment;
  } catch (error: any) {
    console.error("Create engine payment failed:", {
      requestBody: body,
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw error;
  }
}

export async function fulfillRequest(
  reference: string,
  input: FulfillRequestInput
): Promise<EnginePayment> {
  const response = await api.post<{ success: boolean; payment: EnginePayment }>(
    `/api/payments/requests/${reference}/fulfill`,
    {
      crypto: mapCrypto(input.crypto),
      network: mapPaymentNetwork(input.crypto, input.network),
      payer: input.payer,
    }
  );

  return response.data.payment;
}

export async function verifyReceiver(input: ClaimGiftInput): Promise<void> {
  await api.post("/api/payments/verify-receiver", {
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
  });
}

export interface ManualPaymentInput {
  fiatAmount: number;
  crypto: string;
  network: string;
  cryptoAmount: number;
  /** Payer's sending wallet address */
  walletAddress: string;
  /** Optional blockchain tx hash to record against the settled payment */
  txHash?: string;
  /** Optional internal settlement/disbursement reference */
  settlementReference?: string;
  payer: { phone: string };
  receiver: { bankCode: string; accountNumber: string };
}

export async function createManualPayment(input: ManualPaymentInput): Promise<EnginePayment> {
  const response = await api.post<{ success: boolean; payment: EnginePayment }>(
    "/api/payments",
    {
      type: "transfer",
      autoSettle: true,
      fiatAmount: input.fiatAmount,
      fiatCurrency: "NGN",
      crypto: mapCrypto(input.crypto),
      network: mapPaymentNetwork(input.crypto, input.network),
      cryptoAmount: input.cryptoAmount,
      txHash: input.txHash,
      settlementReference: input.settlementReference,
      payer: {
        chatId: input.payer.phone,
        phone: input.payer.phone,
        walletAddress: input.walletAddress,
      },
      receiver: input.receiver,
      chargeFrom: "fiat",
    }
  );

  return response.data.payment;
}

export async function claimGift(
  reference: string,
  input: ClaimGiftInput
): Promise<void> {
  await api.post(`/api/payments/gifts/${reference}/claim`, {
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
  });
}
