"use client";

import Link from "next/link";
import React, {
  type ReactNode,
  useRef,
  useState,
} from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const PRIVACY_POLICY_VERSION = "2026-08-20";
export const PRIVACY_CONSENT_STORAGE_KEY =
  "2settle:privacy-policy-consent";

type StoredPrivacyConsent = {
  accepted: true;
  acceptedAt: string;
  policyVersion: string;
  skipFuturePrompts: boolean;
};

export function hasStoredPrivacyConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    if (!stored) return false;

    const consent = JSON.parse(stored) as Partial<StoredPrivacyConsent>;
    return (
      consent.accepted === true &&
      consent.policyVersion === PRIVACY_POLICY_VERSION &&
      consent.skipFuturePrompts === true
    );
  } catch {
    return false;
  }
}

type PrivacyConsentActionGateProps = {
  children: (requestPrivacyConsent: () => Promise<boolean>) => ReactNode;
};

/**
 * Leaves transaction forms visible and asks for consent when the user chooses
 * how to fund a transaction. A normal acceptance lasts for this gate instance;
 * only the explicit skip option suppresses prompts for future transactions.
 */
export function PrivacyConsentActionGate({
  children,
}: PrivacyConsentActionGateProps) {
  const [open, setOpen] = useState(false);
  const [skipFuturePrompts, setSkipFuturePrompts] = useState(false);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const acceptedForCurrentTransaction = useRef(false);

  const finishRequest = (accepted: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOpen(false);
    resolve?.(accepted);
  };

  const requestPrivacyConsent = () => {
    if (
      acceptedForCurrentTransaction.current ||
      hasStoredPrivacyConsent()
    ) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setSkipFuturePrompts(false);
      setOpen(true);
    });
  };

  const acceptPrivacyPolicy = () => {
    const consent: StoredPrivacyConsent = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      policyVersion: PRIVACY_POLICY_VERSION,
      skipFuturePrompts,
    };

    try {
      window.localStorage.setItem(
        PRIVACY_CONSENT_STORAGE_KEY,
        JSON.stringify(consent),
      );
    } catch (error) {
      console.warn("Privacy consent could not be saved:", error);
    }

    acceptedForCurrentTransaction.current = true;
    finishRequest(true);
  };

  return (
    <>
      {children(requestPrivacyConsent)}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && open) finishRequest(false);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="text-left">
                <DialogTitle className="text-base text-gray-900">
                  Before starting a transaction
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5 text-gray-600">
                  Please confirm that you have read and accept the 2Settle{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                  >
                    Privacy Policy
                  </Link>
                  . It explains how your personal and transaction information
                  is collected, used, and protected.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <label
            htmlFor="privacy-skip-future-prompts"
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left"
          >
            <input
              id="privacy-skip-future-prompts"
              type="checkbox"
              checked={skipFuturePrompts}
              onChange={(event) =>
                setSkipFuturePrompts(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue-500"
            />
            <span className="text-xs leading-5 text-gray-700">
              Don&apos;t show this again
            </span>
          </label>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => finishRequest(false)}
              className="h-10 border-gray-200 text-xs text-gray-600"
            >
              Not now
            </Button>
            <Button
              type="button"
              onClick={acceptPrivacyPolicy}
              className="h-10 bg-blue-500 text-xs text-white hover:bg-blue-600"
            >
              I accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
