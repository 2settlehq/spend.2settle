"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  handleClaimGiftFormSubmission,
  handleFulfillRequestFormSubmission,
  handleGiftFormSubmission,
  handleReportFormSubmission,
  handleRequestPaymentFormSubmission,
} from "@/features/chatbot/handlers/chatHandlers/handle.ai.chat";
import {
  getPhoneCountry,
  normalizeInternationalPhoneNumber,
  PHONE_COUNTRIES,
  splitPhoneNumber,
} from "@/utils/phoneNumber";
import type {
  ClaimGiftFormData,
  FulfillRequestFormData,
  GiftFormData,
  ReportFormData,
  RequestPaymentFormData,
} from "@/services/ai/ai-services";

const CRYPTO_OPTIONS = [
  { value: "BTC", label: "BTC (Bitcoin)" },
  { value: "ETH", label: "ETH (Ethereum)" },
  { value: "BNB", label: "BNB (Binance token)" },
  { value: "TRON", label: "TRON (TRX)" },
  { value: "USDT", label: "USDT (Tether)" },
];
const ESTIMATION_OPTIONS = ["naira", "dollar", "crypto"];
const USDT_NETWORKS = ["ERC20", "TRC20", "BEP20"];
const DEFAULT_NETWORKS: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  BNB: "BEP20",
  TRON: "TRC20",
};
const FLOATING_LABEL_CLASS =
  "absolute left-2 top-0 z-10 bg-white px-1 text-[11px] font-medium leading-4 text-gray-700";
const FORM_CLASS =
  "grid w-full grid-cols-2 gap-x-2.5 gap-y-2.5 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm";
const FIELD_CLASS = "relative min-w-0 pt-2";
const INPUT_CLASS = "h-9 px-2.5 !text-xs";

function useSubmittedState(formId: string | undefined, storagePrefix: string) {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (
      formId &&
      window.localStorage.getItem(`${storagePrefix}:${formId}`) === "true"
    ) {
      setSubmitted(true);
    }
  }, [formId, storagePrefix]);

  const complete = () => {
    if (formId) {
      window.localStorage.setItem(`${storagePrefix}:${formId}`, "true");
    }
    setSubmitted(true);
  };

  return { submitted, complete };
}

function SubmittedNotice({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs text-gray-700">
      {children}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return message ? (
    <p className="col-span-2 text-[11px] text-red-600">{message}</p>
  ) : null;
}

interface CryptoFieldsProps {
  idPrefix: string;
  crypto: string;
  network: string;
  estimation?: string;
  amount?: string;
  onCryptoChange: (crypto: string, network: string) => void;
  onNetworkChange: (network: string) => void;
  onEstimationChange?: (estimation: string) => void;
  onAmountChange?: (amount: string) => void;
}

function CryptoFields({
  idPrefix,
  crypto,
  network,
  estimation,
  amount,
  onCryptoChange,
  onNetworkChange,
  onEstimationChange,
  onAmountChange,
}: CryptoFieldsProps) {
  const hasAmount = amount !== undefined && onAmountChange;
  const amountUnit =
    estimation === "crypto"
      ? crypto || "crypto"
      : estimation === "dollar"
        ? "USD"
        : "NGN";

  return (
    <>
      <div
        className={`${FIELD_CLASS} ${
          !onEstimationChange && !hasAmount && crypto !== "USDT"
            ? "col-span-2"
            : ""
        }`}
      >
        <Label htmlFor={`${idPrefix}-crypto`} className={FLOATING_LABEL_CLASS}>
          Crypto asset
        </Label>
        <Select
          value={crypto}
          onValueChange={(value) =>
            onCryptoChange(
              value,
              value === "USDT" ? "" : DEFAULT_NETWORKS[value] || "",
            )
          }
        >
          <SelectTrigger id={`${idPrefix}-crypto`} className={INPUT_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRYPTO_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {crypto === "USDT" ? (
        <div className={FIELD_CLASS}>
          <Label htmlFor={`${idPrefix}-network`} className={FLOATING_LABEL_CLASS}>
            Network
          </Label>
          <Select value={network} onValueChange={onNetworkChange}>
            <SelectTrigger id={`${idPrefix}-network`} className={INPUT_CLASS}>
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {USDT_NETWORKS.map((option) => (
                <SelectItem key={option} value={option} className="text-xs">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {estimation !== undefined && onEstimationChange && (
        <div className={FIELD_CLASS}>
          <Label htmlFor={`${idPrefix}-estimation`} className={FLOATING_LABEL_CLASS}>
            Estimate in
          </Label>
          <Select value={estimation} onValueChange={onEstimationChange}>
            <SelectTrigger
              id={`${idPrefix}-estimation`}
              className={`${INPUT_CLASS} capitalize`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTIMATION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option} className="text-xs capitalize">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasAmount && (
        <div
          className={
            crypto === "USDT" ? FIELD_CLASS : `${FIELD_CLASS} col-span-2`
          }
        >
          <Label htmlFor={`${idPrefix}-amount`} className={FLOATING_LABEL_CLASS}>
            Amount ({amountUnit})
          </Label>
          <Input
            id={`${idPrefix}-amount`}
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="Enter amount"
            className={INPUT_CLASS}
            required
          />
        </div>
      )}
    </>
  );
}

interface PhoneFieldProps {
  idPrefix: string;
  country: string;
  number: string;
  onCountryChange: (country: string) => void;
  onNumberChange: (number: string) => void;
  className?: string;
}

function PhoneField({
  idPrefix,
  country,
  number,
  onCountryChange,
  onNumberChange,
  className = "col-span-2",
}: PhoneFieldProps) {
  const selectedCountry = getPhoneCountry(country);

  return (
    <div className={`${FIELD_CLASS} ${className}`}>
      <Label htmlFor={`${idPrefix}-phone`} className={FLOATING_LABEL_CLASS}>
        Phone number
      </Label>
      <div className="flex h-9 overflow-hidden rounded-md border border-input bg-white shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger
            aria-label="Select phone country"
            className="h-full w-16 shrink-0 rounded-none border-0 border-r px-2 text-xs shadow-none focus:ring-0"
          >
            <SelectValue aria-label={selectedCountry.name}>
              <span className="text-sm" aria-hidden="true">
                {selectedCountry.flag}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72 min-w-[250px]">
            {PHONE_COUNTRIES.map((option) => (
              <SelectItem key={option.code} value={option.code} className="text-xs">
                <span className="flex items-center gap-2">
                  <span className="text-sm" aria-hidden="true">{option.flag}</span>
                  <span>{option.name}</span>
                  <span className="text-gray-500">+{option.dialCode}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex shrink-0 items-center pl-2 text-xs font-medium text-gray-700">
          +{selectedCountry.dialCode}
        </span>
        <Input
          id={`${idPrefix}-phone`}
          aria-label="Phone number"
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={(event) =>
            onNumberChange(event.target.value.replace(/\D/g, "").slice(0, 15))
          }
          placeholder="Phone number"
          className="h-full min-w-0 flex-1 rounded-none border-0 px-2 !text-xs shadow-none focus-visible:ring-0"
          required
        />
      </div>
    </div>
  );
}

interface BankFieldsProps {
  idPrefix: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  confirmed: boolean;
  onChange: (
    values: Partial<
      Pick<
        RequestPaymentFormData,
        | "bankName"
        | "bankCode"
        | "accountNumber"
        | "accountName"
        | "accountDetailsConfirmed"
      >
    >,
  ) => void;
}

function BankFields({
  idPrefix,
  bankName,
  bankCode,
  accountNumber,
  accountName,
  confirmed,
  onChange,
}: BankFieldsProps) {
  return (
    <>
      <BankDetailsInputs
        compact
        idPrefix={idPrefix}
        bankName={bankName}
        bankCode={bankCode}
        accountNumber={accountNumber}
        accountName={accountName}
        onBankSelect={(name, code) =>
          onChange({
            bankName: name,
            bankCode: code,
            accountName: "",
            accountDetailsConfirmed: false,
          })
        }
        onAccountNumberChange={(value) =>
          onChange({
            accountNumber: value.replace(/\D/g, ""),
            accountName: "",
            accountDetailsConfirmed: false,
          })
        }
        onAccountNameChange={(value) =>
          onChange({ accountName: value, accountDetailsConfirmed: false })
        }
      />

      {accountName && (
        <fieldset className="col-span-2 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <legend className="px-1 text-[11px] font-medium text-gray-900">
            Confirm account details
          </legend>
          <dl className="space-y-0.5 text-[11px] leading-4 text-gray-700">
            <div className="truncate">
              <dt className="inline font-medium">Name: </dt>
              <dd className="inline">{accountName}</dd>
            </div>
            <div className="truncate">
              <dt className="inline font-medium">Bank name: </dt>
              <dd className="inline">{bankName}</dd>
            </div>
            <div className="truncate">
              <dt className="inline font-medium">Account number: </dt>
              <dd className="inline">{accountNumber}</dd>
            </div>
          </dl>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-800">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) =>
                onChange({ accountDetailsConfirmed: event.target.checked })
              }
              className="h-4 w-4 accent-blue-500"
            />
            <span>These account details are correct</span>
          </label>
        </fieldset>
      )}
    </>
  );
}

function getBankError(form: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountDetailsConfirmed: boolean;
}) {
  if (form.bankCode && form.accountNumber.length === 10 && !form.accountName) {
    return "Wait for the account name to be verified.";
  }
  if (form.accountName && !form.accountDetailsConfirmed) {
    return "Confirm that the account details are correct.";
  }
  return "Please complete every field with valid details.";
}

export function GiftForm({
  initialValues,
  formId,
}: {
  initialValues?: Partial<GiftFormData>;
  formId?: string;
}) {
  const phone = splitPhoneNumber(
    initialValues?.phoneNumber ?? "",
    initialValues?.phoneCountry ?? "NG",
  );
  const crypto = initialValues?.crypto || "BTC";
  const [form, setForm] = useState<GiftFormData>({
    crypto,
    network:
      crypto === "USDT"
        ? initialValues?.network || ""
        : initialValues?.network || DEFAULT_NETWORKS[crypto] || "",
    estimation: initialValues?.estimation || "naira",
    amount: initialValues?.amount || "",
    phoneCountry: phone.countryCode,
    phoneNumber: phone.nationalNumber,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitted, complete } = useSubmittedState(
    formId,
    "completed-gift-form",
  );
  const update = (values: Partial<GiftFormData>) => {
    setForm((current) => ({ ...current, ...values }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phoneNumber = normalizeInternationalPhoneNumber(
      form.phoneCountry,
      form.phoneNumber,
    );
    if (
      !form.crypto ||
      !form.network ||
      !form.estimation ||
      !form.amount ||
      !phoneNumber
    ) {
      setError("Please complete every field with valid details.");
      return;
    }
    setIsSubmitting(true);
    const success = await handleGiftFormSubmission({ ...form, phoneNumber });
    setIsSubmitting(false);
    if (success) complete();
  };

  if (submitted) {
    return <SubmittedNotice>Gift details submitted.</SubmittedNotice>;
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_CLASS}>
      <CryptoFields
        idPrefix="chat-gift"
        crypto={form.crypto}
        network={form.network}
        estimation={form.estimation}
        amount={form.amount}
        onCryptoChange={(nextCrypto, network) =>
          update({ crypto: nextCrypto, network })
        }
        onNetworkChange={(network) => update({ network })}
        onEstimationChange={(estimation) => update({ estimation })}
        onAmountChange={(amount) => update({ amount })}
      />
      <div className="col-span-2 grid grid-cols-3 items-end gap-2.5">
        <PhoneField
          idPrefix="chat-gift"
          country={form.phoneCountry}
          number={form.phoneNumber}
          onCountryChange={(phoneCountry) => update({ phoneCountry })}
          onNumberChange={(phoneNumber) => update({ phoneNumber })}
          className="col-span-2"
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="col-span-1 h-9 rounded-lg bg-blue-500 px-2 text-xs text-white hover:bg-blue-500"
        >
          {isSubmitting ? "Creating..." : "Create gift"}
        </Button>
      </div>
      <FormError message={error} />
    </form>
  );
}

export function RequestPaymentForm({
  initialValues,
  formId,
}: {
  initialValues?: Partial<RequestPaymentFormData>;
  formId?: string;
}) {
  const phone = splitPhoneNumber(
    initialValues?.phoneNumber ?? "",
    initialValues?.phoneCountry ?? "NG",
  );
  const [form, setForm] = useState<RequestPaymentFormData>({
    amount: initialValues?.amount || "",
    bankName: initialValues?.bankName || "",
    bankCode: initialValues?.bankCode || "",
    accountNumber: initialValues?.accountNumber || "",
    accountName: initialValues?.accountName || "",
    accountDetailsConfirmed: false,
    phoneCountry: phone.countryCode,
    phoneNumber: phone.nationalNumber,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitted, complete } = useSubmittedState(
    formId,
    "completed-request-payment-form",
  );
  const update = (values: Partial<RequestPaymentFormData>) => {
    setForm((current) => ({ ...current, ...values }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phoneNumber = normalizeInternationalPhoneNumber(
      form.phoneCountry,
      form.phoneNumber,
    );
    if (
      !form.amount ||
      !form.bankName ||
      !form.bankCode ||
      form.accountNumber.length !== 10 ||
      !form.accountName ||
      !form.accountDetailsConfirmed ||
      !phoneNumber
    ) {
      setError(getBankError(form));
      return;
    }
    setIsSubmitting(true);
    const success = await handleRequestPaymentFormSubmission({
      ...form,
      phoneNumber,
    });
    setIsSubmitting(false);
    if (success) complete();
  };

  if (submitted) {
    return <SubmittedNotice>Payment request details submitted.</SubmittedNotice>;
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_CLASS}>
      <div className={`${FIELD_CLASS} col-span-2`}>
        <Label htmlFor="chat-request-amount" className={FLOATING_LABEL_CLASS}>
          Amount (NGN)
        </Label>
        <Input
          id="chat-request-amount"
          type="number"
          min="0"
          step="any"
          value={form.amount}
          onChange={(event) => update({ amount: event.target.value })}
          placeholder="Enter amount"
          className={INPUT_CLASS}
          required
        />
      </div>
      <BankFields
        idPrefix="chat-request"
        {...form}
        confirmed={form.accountDetailsConfirmed}
        onChange={update}
      />
      <div className="col-span-2 grid grid-cols-3 items-end gap-2.5">
        <PhoneField
          idPrefix="chat-request"
          country={form.phoneCountry}
          number={form.phoneNumber}
          onCountryChange={(phoneCountry) => update({ phoneCountry })}
          onNumberChange={(phoneNumber) => update({ phoneNumber })}
          className="col-span-2"
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="col-span-1 h-9 rounded-lg bg-blue-500 px-2 text-xs text-white hover:bg-blue-500"
        >
          {isSubmitting ? "Creating..." : "Request"}
        </Button>
      </div>
      <FormError message={error} />
    </form>
  );
}

export function ClaimGiftForm({
  initialValues,
  formId,
}: {
  initialValues?: Partial<ClaimGiftFormData>;
  formId?: string;
}) {
  const [form, setForm] = useState<ClaimGiftFormData>({
    giftId: initialValues?.giftId || "",
    bankName: initialValues?.bankName || "",
    bankCode: initialValues?.bankCode || "",
    accountNumber: initialValues?.accountNumber || "",
    accountName: initialValues?.accountName || "",
    accountDetailsConfirmed: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitted, complete } = useSubmittedState(
    formId,
    "completed-claim-gift-form",
  );
  const update = (values: Partial<ClaimGiftFormData>) => {
    setForm((current) => ({ ...current, ...values }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !/^2S-[A-Z0-9]{6}$/i.test(form.giftId.trim()) ||
      !form.bankName ||
      !form.bankCode ||
      form.accountNumber.length !== 10 ||
      !form.accountName ||
      !form.accountDetailsConfirmed
    ) {
      setError(
        !/^2S-[A-Z0-9]{6}$/i.test(form.giftId.trim())
          ? "Enter a valid gift ID, for example 2S-HKVT5E."
          : getBankError(form),
      );
      return;
    }
    setIsSubmitting(true);
    const success = await handleClaimGiftFormSubmission({
      ...form,
      giftId: form.giftId.trim().toUpperCase(),
    });
    setIsSubmitting(false);
    if (success) complete();
  };

  if (submitted) {
    return <SubmittedNotice>Gift claim submitted.</SubmittedNotice>;
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_CLASS}>
      <div className={`${FIELD_CLASS} col-span-2`}>
        <Label htmlFor="chat-claim-gift-id" className={FLOATING_LABEL_CLASS}>
          Gift ID
        </Label>
        <Input
          id="chat-claim-gift-id"
          value={form.giftId}
          onChange={(event) =>
            update({ giftId: event.target.value.toUpperCase() })
          }
          placeholder="2S-HKVT5E"
          className={INPUT_CLASS}
          required
        />
      </div>
      <BankFields
        idPrefix="chat-claim"
        {...form}
        confirmed={form.accountDetailsConfirmed}
        onChange={update}
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="col-span-2 h-9 rounded-lg bg-blue-500 text-xs text-white hover:bg-blue-500"
      >
        {isSubmitting ? "Claiming..." : "Claim gift"}
      </Button>
      <FormError message={error} />
    </form>
  );
}

export function FulfillRequestForm({
  initialValues,
  formId,
}: {
  initialValues?: Partial<FulfillRequestFormData>;
  formId?: string;
}) {
  const phone = splitPhoneNumber(
    initialValues?.phoneNumber ?? "",
    initialValues?.phoneCountry ?? "NG",
  );
  const crypto = initialValues?.crypto || "BTC";
  const [form, setForm] = useState<FulfillRequestFormData>({
    requestId: initialValues?.requestId || "",
    crypto,
    network:
      crypto === "USDT"
        ? initialValues?.network || ""
        : initialValues?.network || DEFAULT_NETWORKS[crypto] || "",
    phoneCountry: phone.countryCode,
    phoneNumber: phone.nationalNumber,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitted, complete } = useSubmittedState(
    formId,
    "completed-fulfill-request-form",
  );
  const update = (values: Partial<FulfillRequestFormData>) => {
    setForm((current) => ({ ...current, ...values }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phoneNumber = normalizeInternationalPhoneNumber(
      form.phoneCountry,
      form.phoneNumber,
    );
    if (
      !/^2S-[A-Z0-9]{6}$/i.test(form.requestId.trim()) ||
      !form.crypto ||
      !form.network ||
      !phoneNumber
    ) {
      setError(
        !/^2S-[A-Z0-9]{6}$/i.test(form.requestId.trim())
          ? "Enter a valid request ID, for example 2S-HKVT5E."
          : "Please complete every field with valid details.",
      );
      return;
    }
    setIsSubmitting(true);
    const success = await handleFulfillRequestFormSubmission({
      ...form,
      requestId: form.requestId.trim().toUpperCase(),
      phoneNumber,
    });
    setIsSubmitting(false);
    if (success) complete();
  };

  if (submitted) {
    return <SubmittedNotice>Payment request details submitted.</SubmittedNotice>;
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_CLASS}>
      <div className={`${FIELD_CLASS} col-span-2`}>
        <Label htmlFor="chat-fulfill-request-id" className={FLOATING_LABEL_CLASS}>
          Request ID
        </Label>
        <Input
          id="chat-fulfill-request-id"
          value={form.requestId}
          onChange={(event) =>
            update({ requestId: event.target.value.toUpperCase() })
          }
          placeholder="2S-HKVT5E"
          className={INPUT_CLASS}
          required
        />
      </div>
      <CryptoFields
        idPrefix="chat-fulfill"
        crypto={form.crypto}
        network={form.network}
        onCryptoChange={(nextCrypto, network) =>
          update({ crypto: nextCrypto, network })
        }
        onNetworkChange={(network) => update({ network })}
      />
      <div className="col-span-2 grid grid-cols-3 items-end gap-2.5">
        <PhoneField
          idPrefix="chat-fulfill"
          country={form.phoneCountry}
          number={form.phoneNumber}
          onCountryChange={(phoneCountry) => update({ phoneCountry })}
          onNumberChange={(phoneNumber) => update({ phoneNumber })}
          className="col-span-2"
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="col-span-1 h-9 rounded-lg bg-blue-500 px-2 text-xs text-white hover:bg-blue-500"
        >
          {isSubmitting ? "Paying..." : "Pay request"}
        </Button>
      </div>
      <FormError message={error} />
    </form>
  );
}

export function ReportForm({
  initialValues,
  formId,
}: {
  initialValues?: Partial<ReportFormData>;
  formId?: string;
}) {
  const phone = splitPhoneNumber(
    initialValues?.phoneNumber ?? "",
    initialValues?.phoneCountry ?? "NG",
  );
  const [form, setForm] = useState<ReportFormData>({
    complaintType: initialValues?.complaintType || "",
    name: initialValues?.name || "",
    phoneCountry: phone.countryCode,
    phoneNumber: phone.nationalNumber,
    walletAddress: initialValues?.walletAddress || "",
    fraudsterWalletAddress: initialValues?.fraudsterWalletAddress || "",
    description: initialValues?.description || "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitted, complete } = useSubmittedState(
    formId,
    "completed-report-form",
  );
  const update = (values: Partial<ReportFormData>) => {
    setForm((current) => ({ ...current, ...values }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phoneNumber = normalizeInternationalPhoneNumber(
      form.phoneCountry,
      form.phoneNumber,
    );
    if (
      !form.complaintType ||
      !form.name.trim() ||
      !phoneNumber ||
      !form.walletAddress.trim() ||
      !form.description.trim()
    ) {
      setError("Please complete every required field with valid details.");
      return;
    }
    setIsSubmitting(true);
    const success = await handleReportFormSubmission({ ...form, phoneNumber });
    setIsSubmitting(false);
    if (success) complete();
  };

  if (submitted) {
    return <SubmittedNotice>Report submitted.</SubmittedNotice>;
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_CLASS}>
      <div className={FIELD_CLASS}>
        <Label htmlFor="chat-report-type" className={FLOATING_LABEL_CLASS}>
          Report type
        </Label>
        <Select
          value={form.complaintType}
          onValueChange={(complaintType) => update({ complaintType })}
        >
          <SelectTrigger id="chat-report-type" className={INPUT_CLASS}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stolen_funds" className="text-xs">Stolen funds</SelectItem>
            <SelectItem value="fraud" className="text-xs">Fraud or scam</SelectItem>
            <SelectItem value="track_transaction" className="text-xs">Track transaction</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className={FIELD_CLASS}>
        <Label htmlFor="chat-report-name" className={FLOATING_LABEL_CLASS}>
          Full name
        </Label>
        <Input
          id="chat-report-name"
          value={form.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="Enter full name"
          className={INPUT_CLASS}
          required
        />
      </div>
      <PhoneField
        idPrefix="chat-report"
        country={form.phoneCountry}
        number={form.phoneNumber}
        onCountryChange={(phoneCountry) => update({ phoneCountry })}
        onNumberChange={(phoneNumber) => update({ phoneNumber })}
      />
      <div className={`${FIELD_CLASS} col-span-2`}>
        <Label htmlFor="chat-report-wallet" className={FLOATING_LABEL_CLASS}>
          Your wallet address
        </Label>
        <Input
          id="chat-report-wallet"
          value={form.walletAddress}
          onChange={(event) => update({ walletAddress: event.target.value })}
          placeholder="Enter wallet address"
          className={INPUT_CLASS}
          required
        />
      </div>
      <div className={`${FIELD_CLASS} col-span-2`}>
        <Label htmlFor="chat-report-fraudster-wallet" className={FLOATING_LABEL_CLASS}>
          Fraudster wallet address (optional)
        </Label>
        <Input
          id="chat-report-fraudster-wallet"
          value={form.fraudsterWalletAddress}
          onChange={(event) => update({ fraudsterWalletAddress: event.target.value })}
          placeholder="Leave blank if unavailable"
          className={INPUT_CLASS}
        />
      </div>
      <div className={`${FIELD_CLASS} col-span-2`}>
        <Label htmlFor="chat-report-description" className={FLOATING_LABEL_CLASS}>
          What happened?
        </Label>
        <Textarea
          id="chat-report-description"
          value={form.description}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Briefly describe the issue"
          className="min-h-16 resize-none px-2.5 py-2 !text-xs"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="col-span-2 h-9 rounded-lg bg-blue-500 text-xs text-white hover:bg-blue-500"
      >
        {isSubmitting ? "Submitting..." : "Submit report"}
      </Button>
      <FormError message={error} />
    </form>
  );
}
