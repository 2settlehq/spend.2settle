"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";

function sanitizeAmount(value: string, maxDecimalPlaces: number): string {
  const withoutCommas = value.replace(/,/g, "");
  const cleaned = withoutCommas.replace(/[^\d.]/g, "");
  const decimalIndex = cleaned.indexOf(".");

  if (decimalIndex === -1) return cleaned;

  const integer = cleaned.slice(0, decimalIndex) || "0";
  const decimals = cleaned
    .slice(decimalIndex + 1)
    .replace(/\./g, "")
    .slice(0, maxDecimalPlaces);

  return `${integer}.${decimals}`;
}

function addThousandsSeparators(value: string): string {
  if (!value) return "";

  const hasDecimal = value.includes(".");
  const [integer, decimals = ""] = value.split(".");
  const groupedInteger = (integer || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return hasDecimal ? `${groupedInteger}.${decimals}` : groupedInteger;
}

function finalizeMoneyAmount(value: string): string {
  const sanitized = sanitizeAmount(value, 2);
  const numeric = Number(sanitized);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "";
}

type FormattedAmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
  formatAsCurrency?: boolean;
  maxDecimalPlaces?: number;
};

export function FormattedAmountInput({
  value,
  onValueChange,
  formatAsCurrency = true,
  maxDecimalPlaces = formatAsCurrency ? 2 : 18,
  onFocus,
  onBlur,
  ...props
}: FormattedAmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = formatAsCurrency
    ? addThousandsSeparators(
        isFocused || !value ? sanitizeAmount(value, 2) : finalizeMoneyAmount(value),
      )
    : value;

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(event) =>
        onValueChange(sanitizeAmount(event.target.value, maxDecimalPlaces))
      }
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        if (formatAsCurrency && value) {
          onValueChange(finalizeMoneyAmount(value));
        }
        onBlur?.(event);
      }}
    />
  );
}
