import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  }

  const adminSecret = process.env.SETTLE_ADMIN_SECRET;
  const engineBase = process.env.NEXT_PUBLIC_SETTLE_API_URL?.replace(/\/$/, "");
  if (!engineBase || !adminSecret) {
    return res.status(500).json({ error: "Rate management is not configured." });
  }

  try {
    const engineResponse = await fetch(`${engineBase}/admin/rates`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${adminSecret}`,
        "Content-Type": "application/json",
      },
      body: req.method === "PUT" ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const data = await engineResponse.json().catch(() => ({
      error: "The payment engine returned an invalid response.",
    }));

    return res.status(engineResponse.status).json(data);
  } catch (error) {
    console.error("Rate management request failed:", error);
    return res.status(502).json({
      error: "Unable to communicate with the payment engine.",
    });
  }
}
