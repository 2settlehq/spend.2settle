"use client";

import { type FormEvent, useState } from "react";
import { BankDetailsInputs } from "@/components/manualTransactionForm/bank-details-inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { handleTransferFormSubmission } from "@/features/chatbot/handlers/chatHandlers/handle.ai.chat";

const CRYPTO_OPTIONS = ["BTC", "ETH", "BNB", "TRON", "USDT"];
const ESTIMATION_OPTIONS = ["naira", "dollar", "crypto"];
const USDT_NETWORKS = ["ERC20", "TRC20", "BEP20"];

const DEFAULT_NETWORKS: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  BNB: "BEP20",
  TRON: "TRC20",
};

interface FormState {
  crypto: string;
  network: string;
  estimation: string;
  amount: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  phoneNumber: string;
}

const initialState: FormState = {
  crypto: "",
  network: "",
  estimation: "naira",
  amount: "",
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountName: "",
  phoneNumber: "",
};

export default function TransferForm() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const amountUnit =
    form.estimation === "crypto"
      ? form.crypto || "crypto"
      : form.estimation === "dollar"
        ? "USD"
        : "NGN";

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleCryptoChange = (crypto: string) => {
    setForm((current) => ({
      ...current,
      crypto,
      network: crypto === "USDT" ? "" : DEFAULT_NETWORKS[crypto] || "",
    }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !form.crypto ||
      !form.network ||
      !form.estimation ||
      !form.amount ||
      !form.bankName ||
      !form.bankCode ||
      form.accountNumber.length !== 10 ||
      !form.accountName ||
      form.phoneNumber.length !== 11
    ) {
      setError(
        form.bankCode && form.accountNumber.length === 10 && !form.accountName
          ? "Wait for the account name to be verified."
          : "Please complete every field with valid details.",
      );
      return;
    }

    setIsSubmitting(true);
    const success = await handleTransferFormSubmission(form);
    setIsSubmitting(false);

    if (success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-gray-700">
        Transfer details submitted.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="chat-transfer-crypto">Crypto asset</Label>
        <Select value={form.crypto} onValueChange={handleCryptoChange}>
          <SelectTrigger id="chat-transfer-crypto" className="h-11">
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            {CRYPTO_OPTIONS.map((crypto) => (
              <SelectItem key={crypto} value={crypto}>
                {crypto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chat-transfer-network">Network</Label>
        {form.crypto === "USDT" ? (
          <Select
            value={form.network}
            onValueChange={(value) => update("network", value)}
          >
            <SelectTrigger id="chat-transfer-network" className="h-11">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {USDT_NETWORKS.map((network) => (
                <SelectItem key={network} value={network}>
                  {network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="chat-transfer-network"
            value={form.network}
            placeholder="Select an asset first"
            readOnly
            className="h-11 bg-gray-50"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="chat-transfer-estimation">Estimate in</Label>
        <Select
          value={form.estimation}
          onValueChange={(value) => update("estimation", value)}
        >
          <SelectTrigger
            id="chat-transfer-estimation"
            className="h-11 capitalize"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTIMATION_OPTIONS.map((estimation) => (
              <SelectItem
                key={estimation}
                value={estimation}
                className="capitalize"
              >
                {estimation}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chat-transfer-amount">Amount ({amountUnit})</Label>
        <Input
          id="chat-transfer-amount"
          type="number"
          min="0"
          step="any"
          value={form.amount}
          onChange={(event) => update("amount", event.target.value)}
          placeholder="Enter amount"
          className="h-11"
          required
        />
      </div>

      <BankDetailsInputs
        bankName={form.bankName}
        bankCode={form.bankCode}
        accountNumber={form.accountNumber}
        accountName={form.accountName}
        onBankSelect={(name, code) =>
          setForm((current) => ({
            ...current,
            bankName: name,
            bankCode: code,
            accountName: "",
          }))
        }
        onAccountNumberChange={(value) =>
          update("accountNumber", value.replace(/\D/g, ""))
        }
        onAccountNameChange={(value) => update("accountName", value)}
      />

      <div className="space-y-2">
        <Label htmlFor="chat-transfer-phone">Recipient phone number</Label>
        <Input
          id="chat-transfer-phone"
          type="tel"
          inputMode="numeric"
          value={form.phoneNumber}
          onChange={(event) =>
            update(
              "phoneNumber",
              event.target.value.replace(/\D/g, "").slice(0, 11),
            )
          }
          placeholder="Enter 11-digit phone number"
          className="h-11"
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-xl bg-blue-500 text-white hover:bg-blue-500"
      >
        {isSubmitting ? "Creating payment..." : "Submit transfer"}
      </Button>
    </form>
  );
}
