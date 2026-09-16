import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

type PaymentWebhookEvent =
  | "payment.confirming"
  | "payment.confirmed"
  | "payment.settling"
  | "payment.settled"
  | "payment.failed"
  | "payment.expired"
  | "payment.settlement_reversed";

type PaymentWebhookPayload = {
  event: PaymentWebhookEvent;
  timestamp: string;
  payment: {
    id: string;
    reference: string;
    giftId?: string | null;
    type: string;
    status: string;
    fiatAmount: number;
    fiatCurrency: string;
    cryptoAmount: number | null;
    crypto: string | null;
    network: string | null;
    txHash: string | null;
    receivedAmount: number | null;
    metadata?: Record<string, unknown> | null;
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

function hmacSha256(key: string, data: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const secret = process.env.SETTLE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: "Webhook secret not configured" });
  }

  const signature = req.headers["x-webhook-signature"];
  if (typeof signature !== "string" || !signature) {
    return res.status(401).json({ ok: false, error: "Missing webhook signature" });
  }

  try {
    const rawBody = await readRawBody(req);
    const expectedSignature = hmacSha256(secret, rawBody);

    if (!signaturesMatch(expectedSignature, signature)) {
      return res.status(401).json({ ok: false, error: "Invalid webhook signature" });
    }

    const payload = JSON.parse(rawBody) as PaymentWebhookPayload;

    if (!payload?.event || !payload?.payment?.reference) {
      return res.status(400).json({ ok: false, error: "Invalid webhook payload" });
    }

    return res.status(200).json({
      ok: true,
      received: true,
      event: payload.event,
      reference: payload.payment.reference,
    });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return res.status(400).json({ ok: false, error: "Failed to process webhook" });
  }
}
