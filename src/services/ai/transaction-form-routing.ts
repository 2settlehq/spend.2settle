type TransactionSession = Record<string, unknown>;

const FORM_INPUT_FIELDS = [
  "crypto",
  "network",
  "estimation",
  "Amount",
  "bank_name",
  "bankcode",
  "acct_number",
  "receiver_name",
  "accountDetailsConfirmed",
  "receiver_phoneCountry",
  "receiver_phoneNumber",
] as const;

const USDT_NETWORKS = new Set(["ERC20", "TRC20", "BEP20"]);

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && value !== "";

export function hasTransactionFormInput(details: TransactionSession): boolean {
  return FORM_INPUT_FIELDS.some((field) => hasValue(details[field]));
}

export function looksLikeTransferRequest(phrase: string): boolean {
  if (
    /\b(?:gift|request|claim|report|complain|track|status|check)\b/i.test(
      phrase,
    )
  ) {
    return false;
  }

  return /\b(?:spend|transact|transfer|send|sell|withdraw|cash\s*out|pay)\b/i.test(
    phrase,
  );
}

/**
 * Moves partial transaction details into the appropriate structured form.
 * This also upgrades sessions that began in the retired question-by-question
 * flow: the next valid field the user enters opens the form with everything
 * already collected prefilled.
 */
export function routePartialTransactionInputToForm(
  incoming: TransactionSession,
  currentSession: TransactionSession = {},
): TransactionSession {
  const routed = { ...incoming };
  const hasFormInput = hasTransactionFormInput(routed);

  if (!hasFormInput) return routed;

  const network = String(routed.network ?? currentSession.network ?? "")
    .trim()
    .toUpperCase();
  const existingCrypto = String(
    routed.crypto ?? currentSession.crypto ?? "",
  ).trim();

  if (!existingCrypto && USDT_NETWORKS.has(network)) {
    routed.crypto = "USDT";
  }

  const type = String(routed.type ?? currentSession.type ?? "transfer")
    .trim()
    .toLowerCase();
  routed.type ??= type;

  if (type === "transfer") {
    routed.transferFormMode = true;
    return routed;
  }

  if (type === "gift") {
    const isClaim =
      routed.claimGiftMode === true || currentSession.claimGiftMode === true;
    routed[isClaim ? "claimGiftFormMode" : "giftFormMode"] = true;
    return routed;
  }

  if (type === "request") {
    const isFulfillment =
      routed.requestFulfillment === true ||
      currentSession.requestFulfillment === true;
    routed[
      isFulfillment ? "fulfillRequestFormMode" : "requestPaymentFormMode"
    ] = true;
  }

  return routed;
}
