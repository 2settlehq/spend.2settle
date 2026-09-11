import { BankName } from "@/types/general_types";
import api from "../api-client";
import axios from "axios";

const nubanApi = process.env.NEXT_PUBLIC_NUBAN_API;
export const fetchBankNames = async (extracted: string): Promise<BankName> => {
  try {
    const response = await api.get<BankName>(`/api/banks/list`, {
      params: { name: extracted },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching bank names:", error);
    throw new Error("Failed to fetch bank names");
  }
};

interface FetchBankDetailsResponse {
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_code: string;
}

interface ResolveBankApiResponse {
  data: {
    accountName?: string;
    accountNumber?: string;
    bankCode?: string;
    bankName?: string;
    account_name?: string;
    account_number?: string;
    bank_code?: string;
    bank_name?: string;
  };
}

export const fetchBankDetails = async (
  bank_code: string,
  acc_no: string,
): Promise<FetchBankDetailsResponse[] | null> => {
  try {
    const response = await api.post<ResolveBankApiResponse>(
      "/api/banks/resolve",
      { bank_code, account_number: acc_no },
    );
    const details = response.data.data;
    const accountName = details.accountName ?? details.account_name ?? "";
    const accountNumber =
      details.accountNumber ?? details.account_number ?? acc_no;
    const bankCode = details.bankCode ?? details.bank_code ?? bank_code;
    const bankName = details.bankName ?? details.bank_name ?? "";

    if (!accountName) return null;

    // Return in the same shape the rest of the code expects
    return [
      {
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
      },
    ];
  } catch (error) {
    console.error(
      `Error resolving bank account for code ${bank_code} / acc ${acc_no}:`,
      error,
    );
    return null;
  }
};

export const resolveBankAccount = async (
  bank_name: string,
  acc_no: string,
): Promise<any | null> => {
  try {
    const bank = await fetchBankNames(bank_name);

    const text = bank.message[0]; // "1. OPAY 100004"

    // Remove the "1." at the start
    const cleanText = text.replace(/^\d+\.\s*/, ""); // "OPAY 100004"

    // Split by space
    const parts = cleanText.split(" ");

    // Bank name is everything except the last part
    const bankName = parts.slice(0, -1).join(" ");
    // "OPAY"

    // Bank code is the last part
    const bankCode = parts[parts.length - 1];

    const bank_details = await fetchBankDetails(bankCode, acc_no);

   return {
     account_name: bank_details ? bank_details[0].account_name : null,
     bankCode,
   };
  } catch (error) {
    console.error(
      `Error fetching bank details for bank code ${bank_name} and account number ${acc_no}:`,
      error,
    );
    return null;
  }
};
