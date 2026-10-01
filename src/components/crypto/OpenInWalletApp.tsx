"use client";

import { useEffect, useState } from "react";
import {
  getWalletAppLinks,
  shouldOfferWalletAppLinks,
  type WalletAppLink,
} from "@/lib/wallets/walletAppLinks";

/**
 * On phones, offers to open 2Settle inside a wallet app's browser, where the
 * wallet connects directly instead of through the WalletConnect relay (which
 * some networks block). Hidden on desktop and inside wallet browsers.
 */
export function OpenInWalletApp() {
  // Decided after mount: depends on the device and on window.ethereum
  const [links, setLinks] = useState<WalletAppLink[]>([]);

  useEffect(() => {
    if (!shouldOfferWalletAppLinks()) return;
    const siteUrl = `${window.location.origin}${window.location.pathname}`;
    setLinks(getWalletAppLinks(siteUrl));
  }, []);

  if (links.length === 0) return null;

  return (
    <div className="mt-1 border-t border-gray-200 pt-3">
      <p className="mb-2 text-center text-xs text-gray-600">
        Trouble connecting? Open 2Settle in your wallet app instead:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            rel="noopener noreferrer"
            className="rounded-md border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-900 hover:bg-gray-50"
          >
            Open in {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}
