"use client";

import { useEffect } from "react";
import { startPaymentStatusPolling } from "@/services/paymentStatusPoller";

// this is an invisible component that keeps tracked payment statuses fresh
// for as long as the app is open, independent of which chat messages are mounted
export function PaymentStatusBootstrap() {
  useEffect(() => startPaymentStatusPolling(), []);

  return null;
}
