import type { NextApiRequest, NextApiResponse } from "next";
import { enginePost } from "@/lib/settle-client";
import { withCancelToken } from "@/lib/paymentCancelToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { reference } = req.query;

  try {
    const result = await enginePost(`/payments/requests/${reference}/fulfill`, req.body);
    // Lets the payer close the session if the wallet debit doesn't happen
    return res.status(200).json(withCancelToken(result));
  } catch (error: any) {
    console.error("Fulfill request error:", error?.response?.data ?? error);
    return res.status(error?.response?.status ?? 500).json(
      error?.response?.data ?? { error: "Failed to fulfill request" }
    );
  }
}
