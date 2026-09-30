import crypto from "node:crypto";

// Server-only. Proves a cancel request comes from the browser that created the
// payment: only the creator receives this token, and every chat user shares
// one engine API key, so the engine alone can't tell payers apart.

function tokenSecret(): string {
  const secret =
    process.env.PAYMENT_CANCEL_SECRET ?? process.env.SETTLE_API_SECRET;
  if (!secret) {
    throw new Error("PAYMENT_CANCEL_SECRET or SETTLE_API_SECRET must be set");
  }
  return secret;
}

export function createCancelToken(reference: string): string {
  return crypto
    .createHmac("sha256", tokenSecret())
    .update(`cancel-payment:${reference}`)
    .digest("base64url");
}

export function isValidCancelToken(reference: string, token: unknown): boolean {
  if (typeof token !== "string" || !token) return false;
  const expected = Buffer.from(createCancelToken(reference));
  const actual = Buffer.from(token);
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}

/** Adds a cancel token to an engine `{ payment }` response for its creator */
export function withCancelToken<T>(result: T): T {
  const payment = (result as { payment?: { reference?: string } })?.payment;
  if (payment?.reference) {
    (payment as { cancelToken?: string }).cancelToken = createCancelToken(
      payment.reference,
    );
  }
  return result;
}
