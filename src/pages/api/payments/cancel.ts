import type { NextApiRequest, NextApiResponse } from "next";
import { enginePost } from "@/lib/settle-client";
import { isValidCancelToken } from "@/lib/paymentCancelToken";

/**
 * POST /api/payments/cancel { reference, cancelToken }
 *
 * Closes a pending payment session the caller created (e.g. the wallet debit
 * was rejected or not approved in time), freeing its deposit address. The
 * engine only allows this for pending sessions that haven't expired.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { reference, cancelToken } = req.body ?? {};

  if (typeof reference !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(reference)) {
    return res.status(400).json({ error: "A valid payment reference is required" });
  }
  if (!isValidCancelToken(reference, cancelToken)) {
    return res.status(403).json({ error: "Not allowed to cancel this payment" });
  }

  try {
    const result = await enginePost(
      `/payments/${encodeURIComponent(reference)}/cancel`,
      {},
    );
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Payment cancel error:", error?.response?.data ?? error);
    return res.status(error?.response?.status ?? 500).json(
      error?.response?.data ?? { error: "Failed to cancel payment" },
    );
  }
}
