import React, { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SpendEstimation = "naira" | "dollar" | "crypto";

export interface SpendAmountValues {
  amount: string;
  estimation: SpendEstimation;
}

interface SendMoneyProps {
  onSubmit: (values: SpendAmountValues) => void;
}

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
        <select
          id="home-spend-currency"
          aria-label="Amount currency"
          value={estimation}
          onChange={(event) => {
            setEstimation(event.target.value as SpendEstimation);
            setError("");
          }}
          className="w-20 shrink-0 cursor-pointer border-0 bg-blue-50 px-1.5 text-xs font-semibold text-blue-700 outline-none sm:w-24"
        >
          <option value="naira">Naira</option>
          <option value="dollar">Dollar</option>
          <option value="crypto">Crypto</option>
        </select>

        <label htmlFor="home-spend-amount" className="sr-only">
          Amount to spend
        </label>
        <input
          id="home-spend-amount"
          aria-label="Amount to spend"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
          }}
          placeholder="Enter amount"
          className="min-w-0 flex-1 border-0 bg-white px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
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
