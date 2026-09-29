import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { enginePost } from "@/lib/settle-client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!session?.email) {
    return res.status(401).json({ error: "Sign in before recording a manual transaction." });
  }

  const allowedEmails = (process.env.RATE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes(session.email.toLowerCase())) {
    return res.status(403).json({ error: "You are not allowed to record manual transactions." });
  }

  try {
    const result = await enginePost<{
      success: boolean;
      transferId: number;
      reference: string;
    }>("/transfer/save", req.body);

    return res.status(201).json(result);
  } catch (error: any) {
    console.error("Manual transaction creation failed:", {
      message: error?.message,
      status: error?.response?.status,
      response: error?.response?.data,
    });

    return res.status(error?.response?.status ?? 502).json(
      error?.response?.data ?? {
        error: "Unable to save the manual transaction in the payment engine.",
      },
    );
  }
}
