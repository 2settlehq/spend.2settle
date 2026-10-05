// import { useEffect, useState } from "react";

export function getFormattedDateTime(date?: Date | string): string {
  const now = typeof date === "string" ? new Date(date) : new Date();

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  const time = `${formattedHours}:${formattedMinutes}${ampm}`;

  const day = now.getDate();
  const month = now.getMonth() + 1; // Months are zero-based in JavaScript
  const year = now.getFullYear();

  const formattedDate = `${day < 10 ? `0${day}` : day}/${
    month < 10 ? `0${month}` : month
  }/${year}`;

  return `${time} ${formattedDate}`;
}

import React, { useEffect, useState } from "react";
import { useConfirmDialogStore } from "stores/useConfirmDialogStore";
import { useStatusStore } from "stores/statusStore";

interface CountdownTimerProps {
  expiryTime: Date | string | number;
  reference?: string;
  pollStatus?: boolean;
  // Show only the payment status (no countdown), e.g. after a direct wallet debit
  statusOnly?: boolean;
}

function toTimeMs(value?: Date | string | number | null): number | undefined {
  if (!value) return undefined;

  const timeMs = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isFinite(timeMs) ? timeMs : undefined;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiryTime,
  reference,
  pollStatus = true,
  statusOnly = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const setWalletIsExpired = useConfirmDialogStore((s) => s.setWalletIsExpired);
  const statusRecord = useStatusStore((state) =>
    reference ? state.statusesByReference[reference] : undefined,
  );
  const trackStatus = useStatusStore((state) => state.trackStatus);
  const currentStatus = statusRecord?.status ?? "pending";
  const effectiveExpiryTimeMs = statusRecord?.expiresAt
    ? toTimeMs(statusRecord.expiresAt)
    : toTimeMs(expiryTime);
  const effectiveExpiryTime =
    typeof effectiveExpiryTimeMs === "number"
      ? new Date(effectiveExpiryTimeMs)
      : undefined;
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference =
        effectiveExpiryTime instanceof Date
          ? effectiveExpiryTime.getTime() - new Date().getTime()
          : 0;
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    if (statusOnly || currentStatus !== "pending") {
      return;
    }

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        setWalletIsExpired();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [effectiveExpiryTime, currentStatus, setWalletIsExpired, statusOnly]);

  // Polling happens app-wide (PaymentStatusBootstrap); this only makes sure
  // the payment is tracked so it keeps updating after this message unmounts
  useEffect(() => {
    if (!pollStatus || !reference) return;

    const expiresAt =
      typeof effectiveExpiryTimeMs === "number"
        ? new Date(effectiveExpiryTimeMs).toISOString()
        : null;
    trackStatus({ reference, status: "pending", expiresAt });
  }, [reference, pollStatus, effectiveExpiryTimeMs, trackStatus]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

  const getDisplayText = () => {
    switch (currentStatus) {
      case "pending":
        return statusOnly ? "Payment status: Awaiting confirmation" : "countdown";
      case "confirming":
        return "Payment status: Confirming";
      case "confirmed":
        return "Payment status: Confirmed";
      case "settling":
        return "Payment status: Settling";
      case "settled":
        return "Payment status: Settled";
      case "expired":
        return "Payment status: Wallet expired";
      case "failed":
        return "Payment status: Failed";
      case "settlement_reversed":
        return "Payment status: Reversed";
      default:
        return "countdown";
    }
  };

  if (getDisplayText() === "countdown") {
    return (
      <span className="text-xs font-normal text-gray-900">
        You have{" "}
        <strong
          className={`text-sm ${
            timeLeft > 2 * 60
              ? "text-green-600"
              : "animate-pulse text-red-600"
          }`}
        >
          {formattedTime}
        </strong>{" "}
        to complete this payment
      </span>
    );
  }

  const className =
    currentStatus === "settled"
        ? "font-bold text-sm text-green-600"
        : ["expired", "failed", "settlement_reversed"].includes(currentStatus)
          ? "font-bold text-sm text-red-600"
          : "font-bold text-sm text-blue-600";

  return (
    <span className={className}>{getDisplayText()}</span>
  );
};
