"use client";

import Link from "next/link";
import React, { type ReactNode, useEffect, useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PRIVACY_POLICY_VERSION = "2026-08-20";
export const PRIVACY_CONSENT_STORAGE_KEY =
  "2settle:privacy-policy-consent";
const PRIVACY_CONSENT_EVENT = "2settle:privacy-policy-consent-accepted";

type StoredPrivacyConsent = {
  accepted: true;
  acceptedAt: string;
  policyVersion: string;
};

function hasStoredPrivacyConsent(): boolean {
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

export function PrivacyConsentGate({ children }: { children: ReactNode }) {
  const titleId = useId();
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    setAccepted(hasStoredPrivacyConsent());

    const handleAccepted = () => setAccepted(true);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PRIVACY_CONSENT_STORAGE_KEY) {
        setAccepted(hasStoredPrivacyConsent());
      }
    };

    window.addEventListener(PRIVACY_CONSENT_EVENT, handleAccepted);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PRIVACY_CONSENT_EVENT, handleAccepted);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

    setAccepted(true);
    setDeclined(false);
    window.dispatchEvent(new Event(PRIVACY_CONSENT_EVENT));
  };

  if (accepted === null) {
    return (
      <div
        role="status"
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 shadow-sm"
      >
        Checking your privacy preference…
      </div>
    );
  }

  if (accepted) return <>{children}</>;

  return (
    <section
      aria-labelledby={titleId}
      className="w-full rounded-xl border border-blue-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-sm font-semibold text-gray-900"
          >
            Before your first transaction
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Please confirm that you have read and accept the 2Settle{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Privacy Policy
            </Link>
            . It explains how your personal and transaction information is
            collected, used, and protected.
          </p>
        </div>
      </div>

      {declined && (
        <p role="alert" className="mt-3 text-xs leading-5 text-red-600">
          You must accept the Privacy Policy before starting a transaction.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setDeclined(true)}
          className="h-9 border-gray-200 text-xs text-gray-600"
        >
          Not now
        </Button>
        <Button
          type="button"
          onClick={acceptPrivacyPolicy}
          className="h-9 bg-blue-500 text-xs text-white hover:bg-blue-600"
        >
          I accept
        </Button>
      </div>
    </section>
  );
}
