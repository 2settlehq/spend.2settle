"use client";

import { type FormEvent, useEffect, useState } from "react";
import { BankDetailsInputs } from "@/components/manualTransactionForm/bank-details-inputs";
import { Button } from "@/components/ui/button";
import { FormattedAmountInput } from "@/components/ui/formatted-amount-input";
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
import { useSupportedAssets } from "@/hooks/wallet/useSupportedAssets";
import { useFormWalletDebit } from "@/hooks/chatbot/useFormWalletDebit";
import { WalletAssetNotice } from "@/components/chatbot/WalletAssetNotice";
import {
  PaymentMethodChoice,
  type PaymentMethodChoiceValue,
} from "@/components/chatbot/PaymentMethodChoice";
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

const formatSummaryAmount = (
  amount: string,
  estimation: string,
  crypto: string,
) => {
  if (!amount) return "";

  const numericAmount = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(numericAmount)) return amount;

  if (estimation === "naira" || estimation === "dollar") {
    return new Intl.NumberFormat(estimation === "naira" ? "en-NG" : "en-US", {
      style: "currency",
      currency: estimation === "naira" ? "NGN" : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 18,
  }).format(numericAmount)} ${crypto}`;
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
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodChoiceValue | null>(null);
  const { walletName, isAssetSupported, isUsdtNetworkSupported } =
    useSupportedAssets();
  const getWalletDebit = useFormWalletDebit();
  const restrictToConnectedWallet = paymentMethod === "wallet";
  const cryptoOptions = CRYPTO_OPTIONS.filter(
    (crypto) =>
      !restrictToConnectedWallet || isAssetSupported(crypto.value),
  );
  const usdtNetworks = USDT_NETWORKS.filter(
    (network) =>
      !restrictToConnectedWallet || isUsdtNetworkSupported(network),
  );
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
    if (!formId) return;

    const storedSubmission = window.localStorage.getItem(
      `completed-transfer-form:${formId}`,
    );
    if (!storedSubmission) return;

    if (storedSubmission !== "true") {
      try {
        setForm(
          getInitialState(JSON.parse(storedSubmission) as Partial<FormState>),
        );
      } catch {
        // Keep the form's current values for legacy or malformed saved data.
      }
    }

    setSubmitted(true);
  }, [formId]);

  // Drop a preset (e.g. from the AI) or selection the wallet can't pay with,
  // and pick the USDT network when only one is possible
  const supportedKey = `${cryptoOptions.map((c) => c.value)}|${usdtNetworks}`;
  useEffect(() => {
    setForm((current) => {
      if (
        restrictToConnectedWallet &&
        current.crypto &&
        !isAssetSupported(current.crypto)
      ) {
        return { ...current, crypto: "", network: "" };
      }
      if (current.crypto !== "USDT") return current;
      if (
        restrictToConnectedWallet &&
        current.network &&
        !isUsdtNetworkSupported(current.network)
      ) {
        return { ...current, network: usdtNetworks.length === 1 ? usdtNetworks[0] : "" };
      }
      if (!current.network && usdtNetworks.length === 1) {
        return { ...current, network: usdtNetworks[0] };
      }
      return current;
    });
    // supportedKey captures every input of the checks above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedKey, form.crypto, form.network, restrictToConnectedWallet]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleCryptoChange = (crypto: string) => {
    setForm((current) => ({
      ...current,
      crypto,
      network:
        crypto === "USDT"
          ? usdtNetworks.length === 1
            ? usdtNetworks[0]
            : ""
          : DEFAULT_NETWORKS[crypto] || "",
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

    const walletDebit =
      paymentMethod === "wallet"
        ? getWalletDebit(form.crypto, form.network)
        : undefined;
    if (paymentMethod === "wallet" && !walletDebit) {
      setError(
        "Connect a wallet that supports the selected crypto and network.",
      );
      return;
    }

    setIsSubmitting(true);
    const success = await handleTransferFormSubmission(
      {
        ...form,
        phoneNumber: internationalPhoneNumber,
      },
      walletDebit,
      paymentMethod ?? undefined,
    );
    setIsSubmitting(false);

    if (success) {
      if (formId) {
        window.localStorage.setItem(
          `completed-transfer-form:${formId}`,
          JSON.stringify({
            ...form,
            phoneNumber: internationalPhoneNumber,
          }),
        );
      }
      setSubmitted(true);
    }
  };

  if (submitted) {
    const transactionSummary = [
      {
        label: "Amount",
        value: formatSummaryAmount(form.amount, form.estimation, form.crypto),
      },
      { label: "Crypto", value: form.crypto },
      { label: "Network", value: form.network },
      { label: "Recipient", value: form.accountName },
      { label: "Bank", value: form.bankName },
      { label: "Account number", value: form.accountNumber },
      { label: "Phone number", value: internationalPhoneNumber },
    ].filter(({ value }) => Boolean(value));

    return (
      <div className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs text-gray-700 shadow-sm">
        <div className="flex items-center gap-2 border-b border-blue-100 pb-2.5">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white"
          >
            ✓
          </span>
          <div>
            <p className="font-semibold text-gray-900">
              Transfer details submitted
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500">
              Transaction summary
            </p>
          </div>
        </div>

        <dl className="mt-2.5 divide-y divide-gray-100">
          {transactionSummary.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
            >
              <dt className="shrink-0 text-[11px] text-gray-500">{label}</dt>
              <dd className="min-w-0 break-words text-right text-[11px] font-medium text-gray-800">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (!paymentMethod) {
    return (
      <PaymentMethodChoice
        value={paymentMethod}
        walletName={walletName}
        onChange={setPaymentMethod}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-2 gap-x-2.5 gap-y-2.5 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm"
    >
      <div className="col-span-2">
        <PaymentMethodChoice
          value={paymentMethod}
          walletName={walletName}
          onChange={setPaymentMethod}
        />
      </div>
      {paymentMethod === "wallet" && (
        <WalletAssetNotice
          walletName={walletName}
          hasOptions={cryptoOptions.length > 0}
        />
      )}
      <div className="relative min-w-0 pt-2">
        <Label
          htmlFor="chat-transfer-crypto"
          className={FLOATING_LABEL_CLASS}
        >
          Crypto asset
        </Label>
        <Select
          value={form.crypto}
          onValueChange={handleCryptoChange}
          disabled={cryptoOptions.length === 0}
        >
          <SelectTrigger
            id="chat-transfer-crypto"
            className="h-9 px-2.5 text-xs"
          >
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            {cryptoOptions.map((crypto) => (
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
              {usdtNetworks.map((network) => (
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
        <FormattedAmountInput
          id="chat-transfer-amount"
          value={form.amount}
          onValueChange={(amount) => update("amount", amount)}
          formatAsCurrency={form.estimation !== "crypto"}
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
          {isSubmitting ? "Sending..." : "Send money"}
        </Button>
      </div>

      {error && (
        <p className="col-span-2 text-[11px] text-red-600">{error}</p>
      )}

    </form>
  );
}
