import * as Sentry from "@sentry/nextjs";

export const WALLETCONNECT_RELAY_HOST = "relay.walletconnect.org";

export type RelayStatus = "unknown" | "reachable" | "blocked";

// Matches the error @walletconnect/core throws when the relay socket cannot open.
export const RELAY_ERROR_PATTERN =
  /WebSocket connection failed for host: wss:\/\/relay\.walletconnect\.(org|com)/;

let relayStatus: RelayStatus = "unknown";
let probe: Promise<RelayStatus> | null = null;

export const getRelayStatus = () => relayStatus;

// A no-cors fetch resolves (opaque) whenever DNS, TCP and TLS succeed, and
// rejects when the host is blocked (DNS filter, ad blocker, firewall, VPN).
// That separates "user's network can't reach WalletConnect" from config/code bugs.
export function probeWalletConnectRelay(timeoutMs = 8000): Promise<RelayStatus> {
  if (probe) return probe;

  probe = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetch(`https://${WALLETCONNECT_RELAY_HOST}/health`, {
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      relayStatus = "reachable";
    } catch {
      relayStatus = "blocked";
    } finally {
      clearTimeout(timer);
    }

    Sentry.setTag("wc_relay", relayStatus);
    console.info(`[walletconnect] relay ${relayStatus}`);
    // Re-check next time if blocked, in case the user switched networks.
    if (relayStatus === "blocked") probe = null;
    return relayStatus;
  })();

  return probe;
}
