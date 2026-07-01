import type { NextApiRequest, NextApiResponse } from "next";
import { enginePost } from "@/lib/settle-client";
import {
  REQUEST_LIMITS_CRYPTO,
  REQUEST_LIMITS_ESTIMATE_ASSET,
  type RateLimits,
} from "@/services/rate/getLimits";

const ENGINE_BASE =
  process.env.NEXT_PUBLIC_SETTLE_API_URL ?? "http://localhost:3500/v1";

async function fetchRequestLimits(): Promise<RateLimits> {
  const params = new URLSearchParams({
    crypto: REQUEST_LIMITS_CRYPTO,
    estimateAsset: REQUEST_LIMITS_ESTIMATE_ASSET,
  });

  const response = await fetch(`${ENGINE_BASE}/rate/limits?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to fetch request limits");
  }

  return data as RateLimits;
}

async function validateRequestAmount(req: NextApiRequest, res: NextApiResponse) {
  if (req.body?.type !== "request") {
    return true;
  }

  const fiatAmount = Number(req.body?.fiatAmount);

  if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
    res.status(400).json({ error: "Request amount must be a positive number" });
    return false;
  }

  const limits = await fetchRequestLimits();

  if (fiatAmount < limits.min || fiatAmount > limits.max) {
    res.status(400).json({
      error: `Request amount must be between ${limits.min} and ${limits.max} ${limits.unit}`,
      limits,
    });
    return false;
  }

  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const amountIsValid = await validateRequestAmount(req, res);
    if (!amountIsValid) return;

    const result = await enginePost("/payments", req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    console.error(
      "Payment creation error:",
      JSON.stringify(
        {
          message: error?.message,
          code: error?.code,
          response: error?.response?.data,
          status: error?.response?.status,
        },
        null,
        2,
      ),
    );
    return res.status(error?.response?.status ?? 500).json(
      error?.response?.data ?? { error: error?.message ?? "Failed to create payment" }
    );
  }
}
