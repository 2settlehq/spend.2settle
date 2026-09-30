// Rules for debiting a connected wallet for an already-created payment session:
// - the user has CONSENT_TIMEOUT_MS to approve the transaction in their wallet
// - if nothing was sent (not enough funds, rejected / closed the wallet popup,
//   or timed out), the payment session is closed so its deposit address is freed
// - once a transaction was sent, the session is never closed from here

export const CONSENT_TIMEOUT_MS = 5 * 60 * 1000;

export class InsufficientBalanceError extends Error {}

export class WalletDebitError extends Error {
  constructor(
    message: string,
    /** False: no transaction left the wallet */
    readonly sent: boolean,
    /** The payment session was closed after the failed debit */
    readonly sessionClosed: boolean,
  ) {
    super(message);
    this.name = "WalletDebitError";
  }
}

interface RunWalletDebitOptions {
  /** Throws InsufficientBalanceError when the wallet can't cover the payment */
  checkBalance: () => Promise<void>;
  /** Opens the wallet prompt; calls onSubmitted as soon as it's broadcast; resolves with the tx hash */
  send: (onSubmitted: (hash: string) => void) => Promise<string>;
  /** Closes the payment session; resolves true when closed */
  closeSession: () => Promise<boolean>;
  /** The user approved in their wallet after the session was already closed */
  onLateApproval: (hash: string) => void;
  timeoutMs?: number;
}

function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /reject|denied|cancel/i.test(message);
}

export async function runWalletDebit({
  checkBalance,
  send,
  closeSession,
  onLateApproval,
  timeoutMs = CONSENT_TIMEOUT_MS,
}: RunWalletDebitOptions): Promise<string> {
  let submittedHash: string | null = null;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sending: Promise<string> | undefined;

  const markSubmitted = (hash: string) => {
    submittedHash = hash;
    clearTimeout(timer);
  };

  try {
    await checkBalance();

    sending = send(markSubmitted);
    // TRON/BTC senders only resolve once broadcast, so resolution also counts
    sending.then(markSubmitted, () => undefined);

    const consentWindow = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        if (submittedHash) return;
        timedOut = true;
        reject(new Error("consent timeout"));
      }, timeoutMs);
    });

    return await Promise.race([sending, consentWindow]);
  } catch (error) {
    // Sent but failed later (e.g. confirmation): funds moved, keep the session
    if (submittedHash) throw error;

    const sessionClosed = await closeSession().catch(() => false);

    if (timedOut && sending) {
      // A wallet prompt can't be withdrawn; if it's approved later, say so
      sending.then(onLateApproval, () => undefined);
    }

    const minutes = Math.round(timeoutMs / 60000);
    const reason = timedOut
      ? `You didn't approve the payment in your wallet within ${minutes} minutes.`
      : error instanceof InsufficientBalanceError
        ? error.message
        : isUserRejection(error)
          ? "The payment wasn't approved in your wallet."
          : error instanceof Error && error.message
            ? error.message
            : "The wallet transaction failed.";

    throw new WalletDebitError(reason, false, sessionClosed);
  } finally {
    clearTimeout(timer);
  }
}
