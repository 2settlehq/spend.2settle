import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
// Components use JSX without importing React
vi.hoisted(() => {
  (globalThis as any).React = require("react");
});

import { getWalletAppLinks } from "@/lib/wallets/walletAppLinks";
import { OpenInWalletApp } from "@/components/crypto/OpenInWalletApp";

const SITE = "https://spend.2settle.io/";
const hrefs = () =>
  Object.fromEntries(getWalletAppLinks(SITE).map((link) => [link.id, link.href]));

describe("wallet app links", () => {
  it("builds each wallet's documented dapp-browser link", () => {
    const links = hrefs();
    expect(links.metamask).toBe("https://metamask.app.link/dapp/spend.2settle.io/");
    expect(links.trust).toBe(
      "https://link.trustwallet.com/open_url?coin_id=60&url=https%3A%2F%2Fspend.2settle.io%2F",
    );
    expect(links.coin98).toBe("https://coin98.com/dapp/spend.2settle.io/1");
  });

  it("encodes the site into the Binance dApp browser link", () => {
    const url = new URL(hrefs().binance.replace("bnc://", "https://"));
    expect(atob(url.searchParams.get("startPagePath")!)).toBe("/pages/browser/index");
    expect(atob(url.searchParams.get("startPageQuery")!)).toBe(
      `url=${encodeURIComponent(SITE)}`,
    );
  });
});

describe("OpenInWalletApp", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete (window as any).ethereum;
  });

  const useUserAgent = (ua: string) =>
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);

  it("offers the four wallets on a phone browser without a wallet", async () => {
    useUserAgent("Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36");
    render(<OpenInWalletApp />);

    for (const name of ["MetaMask", "Trust Wallet", "Binance Wallet", "Coin98"]) {
      expect(await screen.findByRole("link", { name: `Open in ${name}` })).toBeTruthy();
    }
  });

  it("stays hidden inside a wallet's own browser", () => {
    useUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari");
    (window as any).ethereum = {};
    render(<OpenInWalletApp />);
    expect(screen.queryByText(/Trouble connecting/)).toBeNull();
  });

  it("stays hidden on desktop", () => {
    useUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130");
    render(<OpenInWalletApp />);
    expect(screen.queryByText(/Trouble connecting/)).toBeNull();
  });
});
