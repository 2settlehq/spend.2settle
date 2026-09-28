// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  RELAY_ERROR_PATTERN,
  getRelayStatus,
} from "@/lib/wallets/walletConnectRelay";

Sentry.init({
  dsn: "https://3cb62aae5448811e6e131819659dc858@o4508857024053248.ingest.us.sentry.io/4508886131933184",

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // WalletConnect relay failures are usually the user's network (DNS filters,
  // ad blockers, VPNs). Keep them for volume, but label them so they don't read
  // as code bugs. A "reachable" wc_relay tag means it's worth investigating.
  beforeSend(event, hint) {
    const error = hint.originalException;
    const message =
      error instanceof Error ? error.message : String(error ?? event.message ?? "");

    if (RELAY_ERROR_PATTERN.test(message)) {
      const relay = getRelayStatus();
      event.level = relay === "reachable" ? "error" : "warning";
      event.tags = {
        ...event.tags,
        wc_relay: relay,
        failure_class: relay === "reachable" ? "walletconnect" : "network-blocked",
      };
      event.fingerprint = ["walletconnect-relay", relay];
    }

    return event;
  },
});
