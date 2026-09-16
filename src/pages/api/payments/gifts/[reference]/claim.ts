import type { NextApiRequest, NextApiResponse } from "next";
import { enginePost } from "@/lib/settle-client";
import { normalizeGiftId } from "@/services/gift-flow";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { reference } = req.query;
  // Keep the public route shape for existing clients; this parameter is a
  // shareable gift ID, never the internal payment tracking reference.
  let giftId: string;
  try {
    giftId = normalizeGiftId(reference);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }

  try {
    const result = await enginePost(`/payments/gifts/${giftId}/claim/confirm`, req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Claim gift error:", error?.response?.data ?? error);
    return res.status(error?.response?.status ?? 500).json(
      error?.response?.data ?? { error: "Failed to claim gift" }
    );
  }
}
