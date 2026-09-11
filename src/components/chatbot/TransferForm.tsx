"use client";

import { type FormEvent, useEffect, useState } from "react";
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
import {
  getPhoneCountry,
  normalizeInternationalPhoneNumber,
  PHONE_COUNTRIES,
  splitPhoneNumber,
} from "@/utils/phoneNumber";

const CRYPTO_OPTIONS = [
  { value: "BTC", label: "BTC (Bitcoin)" },
  { value: "ETH", label: "ETH (Ethereum)" },
  { value: "BNB", label: "BNB (Binance token)" },
  { value: "TRON", label: "TRON (TRX)" },
  { value: "USDT", label: "USDT (Tether)" },
];
const ESTIMATION_OPTIONS = ["naira", "dollar", "crypto"];
const USDT_NETWORKS = ["ERC20", "TRC20", "BEP20"];
const FLOATING_LABEL_CLASS =
  "absolute left-2 top-0 z-10 bg-white px-1 text-[11px] font-medium leading-4 text-gray-700";

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
  accountDetailsConfirmed: boolean;
  phoneCountry: string;
  phoneNumber: string;
}

interface TransferFormProps {
  initialValues?: Partial<FormState>;
  formId?: string;
}

const initialState: FormState = {
  crypto: "BTC",
  network: "BTC",
  estimation: "naira",
  amount: "",
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountName: "",
  accountDetailsConfirmed: false,
  phoneCountry: "NG",
  phoneNumber: "",
};

const getInitialState = (initialValues?: Partial<FormState>): FormState => {
  const crypto = initialValues?.crypto?.trim() || initialState.crypto;
  const network =
    crypto === "USDT"
      ? initialValues?.network ?? ""
      : initialValues?.network || DEFAULT_NETWORKS[crypto] || "";
  const phone = splitPhoneNumber(
    initialValues?.phoneNumber ?? "",
    initialValues?.phoneCountry ?? "NG",
  );

  return {
    ...initialState,
    ...initialValues,
    crypto,
    network,
    accountDetailsConfirmed: false,
    phoneCountry: phone.countryCode,
    phoneNumber: phone.nationalNumber,
  };
};

export default function TransferForm({
  initialValues,
  formId,
}: TransferFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    getInitialState(initialValues),
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const selectedPhoneCountry = getPhoneCountry(form.phoneCountry);
  const internationalPhoneNumber = normalizeInternationalPhoneNumber(
    form.phoneCountry,
    form.phoneNumber,
  );
  const amountUnit =
    form.estimation === "crypto"
      ? form.crypto || "crypto"
      : form.estimation === "dollar"
        ? "USD"
        : "NGN";

  useEffect(() => {
    if (
      formId &&
      window.localStorage.getItem(`completed-transfer-form:${formId}`) ===
        "true"
    ) {
      setSubmitted(true);
    }
  }, [formId]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
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
      !form.accountDetailsConfirmed ||
      !internationalPhoneNumber
    ) {
      setError(
        form.bankCode && form.accountNumber.length === 10 && !form.accountName
          ? "Wait for the account name to be verified."
          : form.accountName && !form.accountDetailsConfirmed
            ? "Confirm that the account details are correct."
            : "Please complete every field with valid details.",
      );
      return;
    }

    setIsSubmitting(true);
    const success = await handleTransferFormSubmission({
      ...form,
      phoneNumber: internationalPhoneNumber,
    });
    setIsSubmitting(false);

    if (success) {
      if (formId) {
        window.localStorage.setItem(
          `completed-transfer-form:${formId}`,
          "true",
        );
      }
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs text-gray-700">
        Transfer details submitted.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-2 gap-x-2.5 gap-y-2.5 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm"
    >
      <div className="relative min-w-0 pt-2">
        <Label
          htmlFor="chat-transfer-crypto"
          className={FLOATING_LABEL_CLASS}
        >
          Crypto asset
        </Label>
        <Select value={form.crypto} onValueChange={handleCryptoChange}>
          <SelectTrigger
            id="chat-transfer-crypto"
            className="h-9 px-2.5 text-xs"
          >
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            {CRYPTO_OPTIONS.map((crypto) => (
              <SelectItem
                key={crypto.value}
                value={crypto.value}
                className="text-xs"
              >
                {crypto.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.crypto === "USDT" && (
        <div className="relative min-w-0 pt-2">
          <Label
            htmlFor="chat-transfer-network"
            className={FLOATING_LABEL_CLASS}
          >
            Network
          </Label>
          <Select
            value={form.network}
            onValueChange={(value) => update("network", value)}
          >
            <SelectTrigger
              id="chat-transfer-network"
              className="h-9 px-2.5 text-xs"
            >
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {USDT_NETWORKS.map((network) => (
                <SelectItem
                  key={network}
                  value={network}
                  className="text-xs"
                >
                  {network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="relative min-w-0 pt-2">
        <Label
          htmlFor="chat-transfer-estimation"
          className={FLOATING_LABEL_CLASS}
        >
          Estimate in
        </Label>
        <Select
          value={form.estimation}
          onValueChange={(value) => update("estimation", value)}
        >
          <SelectTrigger
            id="chat-transfer-estimation"
            className="h-9 px-2.5 text-xs capitalize"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTIMATION_OPTIONS.map((estimation) => (
              <SelectItem
                key={estimation}
                value={estimation}
                className="text-xs capitalize"
              >
                {estimation}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={
          form.crypto === "USDT"
            ? "relative min-w-0 pt-2"
            : "relative col-span-2 w-full min-w-0 pt-2"
        }
      >
        <Label
          htmlFor="chat-transfer-amount"
          className={FLOATING_LABEL_CLASS}
        >
          Amount ({amountUnit})
        </Label>
        <Input
          id="chat-transfer-amount"
          type="number"
          min="0"
          step="any"
          value={form.amount}
          onChange={(event) => update("amount", event.target.value)}
          placeholder="Enter amount"
          className="h-9 px-2.5 !text-base md:!text-xs"
          required
        />
      </div>

      <BankDetailsInputs
        compact
        idPrefix="chat-transfer"
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
            accountDetailsConfirmed: false,
          }))
        }
        onAccountNumberChange={(value) =>
          setForm((current) => ({
            ...current,
            accountNumber: value.replace(/\D/g, ""),
            accountName: "",
            accountDetailsConfirmed: false,
          }))
        }
        onAccountNameChange={(value) =>
          setForm((current) => ({
            ...current,
            accountName: value,
            accountDetailsConfirmed: false,
          }))
        }
      />

      {form.accountName && (
        <fieldset className="col-span-2 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <legend className="px-1 text-[11px] font-medium text-gray-900">
            Confirm account details
          </legend>
          <dl className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[11px] leading-4 text-gray-700">
            <div className="col-span-2 truncate">
              <dt className="inline font-medium">Name: </dt>
              <dd className="inline">{form.accountName}</dd>
            </div>
            <div className="col-span-2 truncate">
              <dt className="inline font-medium">Bank name: </dt>
              <dd className="inline">{form.bankName}</dd>
            </div>
            <div className="col-span-2 truncate">
              <dt className="inline font-medium">Account number: </dt>
              <dd className="inline">{form.accountNumber}</dd>
            </div>
          </dl>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-800">
            <input
              type="checkbox"
              checked={form.accountDetailsConfirmed}
              onChange={(event) =>
                update("accountDetailsConfirmed", event.target.checked)
              }
              className="h-4 w-4 accent-blue-500"
            />
            <span>These account details are correct</span>
          </label>
        </fieldset>
      )}

      <div className="col-span-2 grid grid-cols-3 items-end gap-2.5">
        <div className="relative col-span-2 min-w-0 pt-2">
          <Label
            htmlFor="chat-transfer-phone"
            className={FLOATING_LABEL_CLASS}
          >
            Phone number
          </Label>
          <div className="flex h-9 overflow-hidden rounded-md border border-input bg-white shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Select
              value={form.phoneCountry}
              onValueChange={(value) => update("phoneCountry", value)}
            >
              <SelectTrigger
                aria-label="Select phone country"
                className="h-full w-16 shrink-0 rounded-none border-0 border-r px-2 text-xs shadow-none focus:ring-0"
              >
                <SelectValue aria-label={selectedPhoneCountry.name}>
                  <span className="text-sm" aria-hidden="true">
                    {selectedPhoneCountry.flag}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72 min-w-[250px]">
                {PHONE_COUNTRIES.map((country) => (
                  <SelectItem
                    key={country.code}
                    value={country.code}
                    className="text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm" aria-hidden="true">
                        {country.flag}
                      </span>
                      <span>{country.name}</span>
                      <span className="text-gray-500">
                        +{country.dialCode}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="flex shrink-0 items-center pl-2 text-xs font-medium text-gray-700">
              +{selectedPhoneCountry.dialCode}
            </span>
            <Input
              id="chat-transfer-phone"
              aria-label="Phone number"
              type="tel"
              inputMode="numeric"
              value={form.phoneNumber}
              onChange={(event) =>
                update(
                  "phoneNumber",
                  event.target.value.replace(/\D/g, "").slice(0, 15),
                )
              }
              placeholder="Phone number"
              className="h-full min-w-0 flex-1 rounded-none border-0 px-2 !text-base shadow-none focus-visible:ring-0 md:!text-xs"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="col-span-1 h-9 w-full rounded-lg bg-blue-500 px-2 text-xs text-white hover:bg-blue-500"
        >
          {isSubmitting ? "Creating..." : "Submit transfer"}
        </Button>
      </div>

      {error && (
        <p className="col-span-2 text-[11px] text-red-600">{error}</p>
      )}

    </form>
  );
}
