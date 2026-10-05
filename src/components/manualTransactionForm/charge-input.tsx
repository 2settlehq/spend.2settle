"use client";

import { Label } from "@/components/ui/label";
import { FormattedAmountInput } from "@/components/ui/formatted-amount-input";
import { formatCurrency } from "@/helpers/format_currency";

interface ChargeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ChargeInput({ value, onChange }: ChargeInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="charge">Charge</Label>
      <FormattedAmountInput
        id="charge"
        name="charge"
        placeholder="Enter charge"
        value={value}
        onValueChange={onChange}
      />
      {value && (
        <p className="text-sm text-muted-foreground">
          {formatCurrency(value, "NGN", "en-NG")}
        </p>
      )}
    </div>
  );
}
