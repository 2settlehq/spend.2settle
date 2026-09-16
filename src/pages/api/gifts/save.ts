import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Gift IDs may only be issued by the payment engine after funding confirms.
  // Never recreate existing gifts or issue unpaid claim codes through this route.
  return res.status(410).json({
    error: "This gift creation endpoint is no longer available. Create a gift payment through /api/payments; its gift ID is issued after payment confirmation.",
  });
}
