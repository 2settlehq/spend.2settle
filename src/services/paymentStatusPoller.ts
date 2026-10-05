import { getConfirmedGiftId } from "@/services/gift-flow";
import {
  useStatusStore,
  type PaymentLifecycleStatus,
  type StatusRecord,
} from "stores/statusStore";

// Polls every tracked payment from the app root, so status keeps updating
// after the chat message that started it unmounts (and resumes after a reload
// because the status store is persisted). A payment stops being polled once the
// engine reports a final status, or once a gift's ID has been confirmed.

export const POLL_INTERVAL_MS = 10000;
const REQUEST_TIMEOUT_MS = 16000;
// The engine expires unpaid sessions itself; keep polling a little past the
// deposit deadline so the UI sees that (or a late deposit) before giving up
export const PENDING_EXPIRY_GRACE_MS = 10 * 60 * 1000;

const TERMINAL_STATUSES: PaymentLifecycleStatus[] = [
  "settled",
  "failed",
  "expired",
  "settlement_reversed",
];

const inFlight = new Set<string>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function toTimeMs(value?: string | null): number | undefined {
  if (!value) return undefined;
  const timeMs = new Date(value).getTime();
  return Number.isFinite(timeMs) ? timeMs : undefined;
}

export function shouldPoll(record: StatusRecord, now = Date.now()): boolean {
  if (TERMINAL_STATUSES.includes(record.status)) return false;
  if (record.type === "gift" && getConfirmedGiftId(record)) return false;

  const expiresAtMs = toTimeMs(record.expiresAt);
  if (
    record.status === "pending" &&
    typeof expiresAtMs === "number" &&
    now > expiresAtMs + PENDING_EXPIRY_GRACE_MS
  ) {
    return false;
  }

  return true;
}

async function pollReference(reference: string): Promise<void> {
  if (inFlight.has(reference)) return;
  inFlight.add(reference);

  const request = new AbortController();
  const requestTimeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(
      `/api/payments/status?reference=${encodeURIComponent(reference)}`,
      { signal: request.signal },
    );
    if (!res.ok) return;

    const data = await res.json();
    const payment = data?.payment;
    if (
      !data?.ok ||
      payment?.reference !== reference ||
      typeof payment.status !== "string"
    ) {
      return;
    }

    const existing = useStatusStore.getState().statusesByReference[reference];
    // A record cleared while the request was in flight is no longer tracked
    if (!existing) return;

    useStatusStore.getState().patchStatus(reference, {
      status: payment.status,
      type: payment.type,
      txHash: payment.txHash,
      confirmations: payment.confirmations,
      expiresAt: payment.expiresAt,
      ...(payment.type === "gift"
        ? { giftId: getConfirmedGiftId(payment) ?? existing.giftId ?? null }
        : {}),
    });
  } catch (error) {
    console.error(`Failed to fetch payment status for ${reference}:`, error);
  } finally {
    clearTimeout(requestTimeout);
    inFlight.delete(reference);
  }
}

export async function pollPaymentStatuses(now = Date.now()): Promise<void> {
  const records = Object.values(useStatusStore.getState().statusesByReference);
  await Promise.all(
    records
      .filter((record) => shouldPoll(record, now))
      .map((record) => pollReference(record.reference)),
  );
}

export function startPaymentStatusPolling(): () => void {
  if (!intervalId) {
    void pollPaymentStatuses();
    intervalId = setInterval(() => {
      void pollPaymentStatuses();
    }, POLL_INTERVAL_MS);
  }

  return stopPaymentStatusPolling;
}

export function stopPaymentStatusPolling(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
