import type { NextApiRequest, NextApiResponse } from "next";
import { enginePost } from "@/lib/settle-client";

interface ResolveResponse {
  data: {
    account_name?: string;
    account_number?: string;
    bank_code?: string;
    accountName?: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { bank_code, account_number } = req.body;
  if (!bank_code || !account_number) {
    return res.status(400).json({ message: "bank_code and account_number are required" });
  }

  try {
    const data = await enginePost<ResolveResponse>("/banks/resolve", {
      bank_code,
      account_number,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const message = err?.response?.data?.message ?? "Failed to resolve bank account";
    return res.status(status).json({ message });
  }
}
