"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchBankNames, fetchBankDetails } from "@/services/bank/bank.service";

const FLOATING_LABEL_CLASS =
  "absolute left-3 top-0 z-10 bg-white px-1 text-xs font-medium leading-4 text-gray-700";
const BANK_SELECTION_ERROR = "Please select your bank from the dropdown list.";

interface BankDetailsInputsProps {
  compact?: boolean;
  idPrefix?: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  onBankSelect: (name: string, code: string) => void;
  onAccountNumberChange: (value: string) => void;
  onAccountNameChange: (value: string) => void;
}

interface BankSuggestion {
  name: string;
  code: string;
}

function parseBankItem(item: string): BankSuggestion {
  const clean = item.replace(/^\d+\.\s*/, "");
  const parts = clean.trim().split(" ");
  const code = parts[parts.length - 1];
  const name = parts.slice(0, -1).join(" ");
  return { name, code };
}

export function BankDetailsInputs({
  compact = false,
  idPrefix = "bank-details",
  bankName,
  bankCode,
  accountNumber,
  accountName,
  onBankSelect,
  onAccountNumberChange,
  onAccountNameChange,
}: BankDetailsInputsProps) {
  const [searchTerm, setSearchTerm] = useState(bankName);
  const [suggestions, setSuggestions] = useState<BankSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [showBankError, setShowBankError] = useState(false);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // A typed bank name is not a selection. Native form validation blocks
  // submission in every form using this field until a bank code is selected.
  useEffect(() => {
    bankInputRef.current?.setCustomValidity(bankCode ? "" : BANK_SELECTION_ERROR);
    if (bankCode) setShowBankError(false);
  }, [bankCode, searchTerm]);

  // Debounced bank search
  useEffect(() => {
    if (!searchTerm || bankCode) return; // skip search if bank already selected

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const result = await fetchBankNames(searchTerm);
        const items: BankSuggestion[] = (result.message ?? []).map(parseBankItem);
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, bankCode]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleBankSelect = (bank: BankSuggestion) => {
    setShowBankError(false);
    bankInputRef.current?.setCustomValidity("");
    setSearchTerm(bank.name);
    setSuggestions([]);
    onBankSelect(bank.name, bank.code);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowBankError(false);
    bankInputRef.current?.setCustomValidity(BANK_SELECTION_ERROR);
    // Clear previously selected bank if user edits the name
    if (bankCode) {
      onBankSelect("", "");
      onAccountNameChange("");
    }
    setResolveError("");
  };

  const handleResolve = async () => {
    if (!bankCode || accountNumber.length !== 10) return;
    setIsResolving(true);
    setResolveError("");
    try {
      const details = await fetchBankDetails(bankCode, accountNumber);
      if (details && details[0]) {
        onAccountNameChange(details[0].account_name);
      } else {
        setResolveError("Could not resolve account. Check details and retry.");
      }
    } catch {
      setResolveError("Could not resolve account. Check details and retry.");
    } finally {
      setIsResolving(false);
    }
  };

  // Clear resolved name when account number changes, then auto-resolve at 10 digits
  useEffect(() => {
    onAccountNameChange("");
    setResolveError("");
    if (bankCode && accountNumber.length === 10) {
      handleResolve();
    }
  }, [accountNumber, bankCode]);

  const fieldWrapperClass = compact
    ? "relative min-w-0 pt-2"
    : "relative pt-2";
  const labelClassName = compact
    ? "absolute left-2 top-0 z-10 bg-white px-1 text-[11px] font-medium leading-4 text-gray-700"
    : FLOATING_LABEL_CLASS;
  const inputClassName = compact
    ? "h-9 px-2.5 !text-base md:!text-xs"
    : "h-11 !text-base md:!text-xs";

  return (
    <>
      {/* Bank Search */}
      <div
        className={`${fieldWrapperClass} ${suggestions.length > 0 ? "z-50" : ""}`}
        ref={suggestionsRef}
      >
        <Label htmlFor={`${idPrefix}-bank-name`} className={labelClassName}>
          Bank Name
        </Label>
        <Input
          ref={bankInputRef}
          id={`${idPrefix}-bank-name`}
          placeholder="Search bank name..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onBlur={(event) => {
            // Moving focus to a suggestion must still allow selecting it.
            if (suggestionsRef.current?.contains(event.relatedTarget as Node)) return;
            if (searchTerm.trim() && !bankCode) setShowBankError(true);
          }}
          onInvalid={() => setShowBankError(true)}
          aria-invalid={showBankError}
          aria-describedby={showBankError ? `${idPrefix}-bank-error` : undefined}
          autoComplete="off"
          required
          className={`${inputClassName} ${showBankError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        />
        {showBankError && (
          <p id={`${idPrefix}-bank-error`} role="alert" className="mt-1 text-[11px] leading-4 text-red-500">
            {BANK_SELECTION_ERROR}
          </p>
        )}
        {isSearching && (
          <p className={compact ? "text-[11px] text-muted-foreground" : "text-xs text-muted-foreground"}>Searching...</p>
        )}
        {suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-md">
            {suggestions.map((bank) => (
              <button
                key={bank.code}
                type="button"
                title={bank.name}
                className={`block w-full truncate bg-white px-2.5 py-2 text-left hover:bg-gray-100 ${compact ? "text-[11px]" : "text-xs"}`}
                onClick={() => handleBankSelect(bank)}
              >
                {bank.name}
              </button>
            ))}
          </div>
        )}
        {bankCode && !compact && (
          <p className="text-xs text-muted-foreground">Code: {bankCode}</p>
        )}
      </div>

      {/* Account Number */}
      <div className={fieldWrapperClass}>
        <Label htmlFor={`${idPrefix}-account-number`} className={labelClassName}>
          Account Number
        </Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-account-number`}
            name="accountNumber"
            inputMode="numeric"
            placeholder="Enter 10-digit account number"
            value={accountNumber}
            onChange={(e) => {
              if (e.target.value.length <= 10) {
                onAccountNumberChange(e.target.value);
                setResolveError("");
              }
            }}
            className={`${inputClassName} ${compact && isResolving ? "pr-8" : ""}`}
          />
          {compact && isResolving && (
            <span
              role="status"
              className="absolute inset-y-0 right-2 flex items-center text-blue-500"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Verifying account details</span>
            </span>
          )}
        </div>
        {compact && resolveError && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[11px] leading-4 text-red-500">{resolveError}</p>
            <button
              type="button"
              onClick={handleResolve}
              className="shrink-0 text-[11px] font-medium text-blue-500 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Account Name (auto-resolved) */}
      {!compact && (
        <div className={fieldWrapperClass}>
          <Label htmlFor={`${idPrefix}-account-name`} className={labelClassName}>
            Account Name
          </Label>
          <div className="flex gap-2">
            <Input
              id={`${idPrefix}-account-name`}
              name="accountName"
              placeholder={isResolving ? "Resolving..." : "Auto-filled after resolve"}
              value={accountName}
              readOnly
              className={`${inputClassName} bg-muted`}
            />
            {bankCode && accountNumber.length === 10 && !accountName && !isResolving && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResolve}
                className="text-xs"
              >
                Resolve
              </Button>
            )}
          </div>
          {resolveError && <p className="text-xs text-red-500">{resolveError}</p>}
        </div>
      )}
    </>
  );
}
