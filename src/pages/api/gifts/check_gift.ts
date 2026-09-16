import type { NextApiRequest, NextApiResponse } from "next";
import { engineGet } from "@/lib/settle-client";
import { normalizeGiftId } from "@/services/gift-flow";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { gift_id } = req.query;

  let giftId: string;
  try {
    giftId = normalizeGiftId(gift_id);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }

  try {
    const result = await engineGet(`/payments/gifts/${giftId}`);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Check gift error:", error?.response?.data ?? error);
    return res.status(error?.response?.status ?? 500).json(
      error?.response?.data ?? { error: "Failed to check gift" }
    );
  }
}
