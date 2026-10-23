import React from "react";
import { WalletDebitError } from "@/lib/wallets/walletDebitSession";

function isWalletConnectionError(message: string) {
  return /(?:connect(?:ed|ion)?|not found).*?(?:wallet|tronlink)|(?:wallet|tronlink).*?(?:connect(?:ed|ion)?|not found)/i.test(
    message,
  );
}

/** Chat message for a wallet debit that didn't complete */
export function debitFailureMessage(error: unknown, reference: string) {
  // Nothing left the wallet: the session was closed (or will expire)
  if (error instanceof WalletDebitError && !error.sent) {
    const shouldReconnectWallet = isWalletConnectionError(error.message);

    return (
      <span>
        {error.message}
        <br />
        No payment was sent from your wallet
        {error.sessionClosed ? (
          <>
            , and payment <b>{reference}</b> has been closed.
          </>
        ) : (
          "."
        )}
        <br />
        {shouldReconnectWallet ? (
          <>
            If TronLink already shows as connected, disconnect it and reconnect
            it, then start the transaction again.
          </>
        ) : (
          <>Start again whenever you&apos;re ready.</>
        )}
      </span>
    );
  }

  // A transaction may have been sent (e.g. it failed while confirming)
  const reason =
    error instanceof Error ? error.message : "The wallet transaction failed";
  return (
    <span>
      We could not complete the debit from your wallet: {reason}
      <br />
      If your wallet shows the transaction as sent, contact support with
      reference <b>{reference}</b>.
    </span>
  );
}
