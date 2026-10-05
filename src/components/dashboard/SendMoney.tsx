import React, { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedAmountInput } from "@/components/ui/formatted-amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type SpendEstimation = "naira" | "dollar" | "crypto";

export interface SpendAmountValues {
  amount: string;
  estimation: SpendEstimation;
}

interface SendMoneyProps {
  onSubmit: (values: SpendAmountValues) => void;
}

const currencyOptions: Array<{
  value: SpendEstimation;
  symbol: string;
  label: string;
}> = [
  { value: "naira", symbol: "₦", label: "Naira" },
  { value: "dollar", symbol: "$", label: "Dollar" },
  { value: "crypto", symbol: "₿", label: "Crypto" },
];

const SendMoney = ({ onSubmit }: SendMoneyProps) => {
  const [amount, setAmount] = useState("");
  const [estimation, setEstimation] = useState<SpendEstimation>("naira");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setError("");
    onSubmit({ amount, estimation });
  };

  return (
    <div className="w-full max-w-[21rem]">
      <form
        onSubmit={handleSubmit}
        className="flex h-11 w-full items-stretch overflow-hidden rounded-full border-2 border-white bg-white shadow-md focus-within:ring-2 focus-within:ring-blue-400"
      >
        <label htmlFor="home-spend-currency" className="sr-only">
          Amount currency
        </label>
        <Select
          value={estimation}
          onValueChange={(value) => {
            setEstimation(value as SpendEstimation);
            setError("");
          }}
        >
          <SelectTrigger
            id="home-spend-currency"
            aria-label="Amount currency"
            className="h-full w-[4.75rem] shrink-0 rounded-l-full rounded-r-none border-0 border-r border-blue-100 bg-blue-50 px-3 text-blue-700 shadow-none focus:ring-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-blue-600 [&>svg]:opacity-100"
          >
            <span className="text-xl font-extrabold leading-none" aria-hidden="true">
              {currencyOptions.find((option) => option.value === estimation)?.symbol}
            </span>
          </SelectTrigger>
          <SelectContent className="min-w-[10rem] rounded-xl border-blue-100 bg-white p-1 shadow-xl">
            {currencyOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer rounded-lg py-2.5 text-sm text-gray-700 focus:bg-blue-50 focus:text-blue-700"
              >
                <span className="inline-flex items-center gap-3">
                  <span className="w-6 text-center text-lg font-extrabold text-blue-700">
                    {option.symbol}
                  </span>
                  <span className="font-medium">{option.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label htmlFor="home-spend-amount" className="sr-only">
          Amount to spend
        </label>
        <FormattedAmountInput
          id="home-spend-amount"
          aria-label="Amount to spend"
          value={amount}
          onValueChange={(value) => {
            setAmount(value);
            setError("");
          }}
          formatAsCurrency={estimation !== "crypto"}
          placeholder="Enter amount"
          className="h-full min-w-0 flex-1 rounded-none border-0 bg-white px-2 text-sm text-gray-900 shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0"
        />

        <Button
          type="submit"
          aria-label="Continue in chat"
          className="h-full shrink-0 rounded-none bg-blue-500 px-2.5 text-white hover:bg-blue-600"
        >
          <span className="hidden sm:inline">Go</span>
          <ArrowRight className="h-4 w-4 sm:ml-1.5" aria-hidden="true" />
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
};

export default SendMoney;
