"use client";

import { Label } from "@/components/ui/label";
import { FormattedAmountInput } from "@/components/ui/formatted-amount-input";
import { formatCurrency } from "@/helpers/format_currency";

interface ReceiverAmountInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReceiverAmountInput({
  value,
  onChange,
}: ReceiverAmountInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="receiverAmount">Receiver Amount</Label>
      <FormattedAmountInput
        id="receiverAmount"
        name="receiverAmount"
        placeholder="Enter receiver amount"
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
