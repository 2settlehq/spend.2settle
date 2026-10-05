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
    const body = req.method === "PUT"
      ? JSON.stringify({ profitRate: req.body?.profitRate })
      : undefined;

    const engineResponse = await fetch(`${engineBase}/admin/rates`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${adminSecret}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    const data = await engineResponse.json().catch(() => ({
      error: "The payment engine returned an invalid response.",
    }));

    if (!engineResponse.ok) {
      return res.status(engineResponse.status).json(data);
    }

    // Read the public rate endpoint as well so this page always displays the
    // exact adjusted rate used on the homepage, even when an older admin API
    // response does not include `rate` yet.
    const publicRateResponse = await fetch(`${engineBase}/rate/all`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const publicRateData = await publicRateResponse.json().catch(() => ({}));

    const rate = publicRateResponse.ok
      ? publicRateData.rateNumeric ?? publicRateData.rate
      : undefined;

    return res.status(engineResponse.status).json({
      ...data,
      rate: rate ?? data.rate ?? data.rateNumeric ?? data.currentRate ?? data.current_rate,
      merchantRate: data.merchantRate ?? data.merchant_rate,
      profitRate: data.profitRate ?? data.profit_rate,
    });
  } catch (error) {
    console.error("Rate management request failed:", error);
    return res.status(502).json({
      error: "Unable to communicate with the payment engine.",
    });
  }
}
