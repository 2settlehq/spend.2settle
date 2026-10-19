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
};

export function hasStoredPrivacyConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    if (!stored) return false;

    const consent = JSON.parse(stored) as Partial<StoredPrivacyConsent>;
    return (
      consent.accepted === true &&
      consent.policyVersion === PRIVACY_POLICY_VERSION
    );
  } catch {
    return false;
  }
}

type PrivacyConsentActionGateProps = {
  children: (requestPrivacyConsent: () => Promise<boolean>) => ReactNode;
};

/**
 * Leaves transaction forms visible and asks for consent only when a wallet
 * action calls requestPrivacyConsent(). The selected action can then continue
 * after the user accepts.
 */
export function PrivacyConsentActionGate({
  children,
}: PrivacyConsentActionGateProps) {
  const [open, setOpen] = useState(false);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);

  const finishRequest = (accepted: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOpen(false);
    resolve?.(accepted);
  };

  const requestPrivacyConsent = () => {
    if (hasStoredPrivacyConsent()) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOpen(true);
    });
  };

  const acceptPrivacyPolicy = () => {
    const consent: StoredPrivacyConsent = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      policyVersion: PRIVACY_POLICY_VERSION,
    };

    try {
      window.localStorage.setItem(
        PRIVACY_CONSENT_STORAGE_KEY,
        JSON.stringify(consent),
      );
    } catch (error) {
      console.warn("Privacy consent could not be saved:", error);
    }

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
                  Before using a wallet
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
