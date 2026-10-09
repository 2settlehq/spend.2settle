"use client";

import { Copy, WalletCards } from "lucide-react";
import ConnectWallet from "@/components/crypto/ConnectWallet";
import { Button } from "@/components/ui/button";

export type PaymentMethodChoiceValue = "wallet" | "copy";

interface PaymentMethodChoiceProps {
  value: PaymentMethodChoiceValue | null;
  walletName: string | null;
  onChange: (value: PaymentMethodChoiceValue | null) => void;
}

export function PaymentMethodChoice({
  value,
  walletName,
  onChange,
}: PaymentMethodChoiceProps) {
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600">
            Payment method
          </p>
          <p className="truncate font-semibold text-gray-900">
            {value === "wallet"
              ? `${walletName ?? "Connected"} wallet`
              : "Deposit wallet address"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange(null)}
          className="h-8 shrink-0 px-2 text-[11px] text-blue-700 hover:bg-blue-100"
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <section className="w-full rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">
          How would you like to pay?
        </p>
        <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
          Choose a payment method before entering your transaction details.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {walletName ? (
          <Button
            type="button"
            onClick={() => onChange("wallet")}
            className="h-10 rounded-lg bg-blue-500 px-2 text-xs text-white hover:bg-blue-400"
          >
            <WalletCards className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Use {walletName}
          </Button>
        ) : (
          <div className="[&_button]:h-10 [&_button]:w-full [&_button]:rounded-lg [&_button]:px-2 [&_button]:text-xs">
            <ConnectWallet onConnected={() => onChange("wallet")} />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => onChange("copy")}
          className="h-10 rounded-lg border-blue-200 px-2 text-xs text-blue-700 hover:bg-blue-50"
        >
          <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Wallet address
        </Button>
      </div>
    </section>
  );
}
