// Links that open this site inside a wallet app's built-in browser. There the
// wallet is injected into the page (window.ethereum), so connecting needs no
// WalletConnect relay — the main reason mobile connections fail on some
// networks (carrier/DNS/ad-blocker blocks on relay.walletconnect.org).

export interface WalletAppLink {
  id: string;
  name: string;
  href: string;
}

const withoutProtocol = (url: string) => url.replace(/^https?:\/\//, "");

const toBase64 = (value: string) =>
  typeof btoa === "function"
    ? btoa(value)
    : Buffer.from(value, "utf8").toString("base64");

export function getWalletAppLinks(siteUrl: string): WalletAppLink[] {
  const { host } = new URL(siteUrl);

  return [
    {
      id: "metamask",
      name: "MetaMask",
      // https://metamask.app.link/dapp/<site without protocol>
      href: `https://metamask.app.link/dapp/${withoutProtocol(siteUrl)}`,
    },
    {
      id: "trust",
      name: "Trust Wallet",
      // developer.trustwallet.com deep linking: coin_id is the SLIP-44 id (60 = Ethereum/EVM)
      href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(siteUrl)}`,
    },
    {
      id: "binance",
      name: "Binance Wallet",
      // Binance app dApp browser. Not in Binance's public docs we could reach —
      // confirm on a device; an unknown path opens the Binance app home instead.
      href:
        "bnc://app.binance.com/mp/app?appId=yFK5FCqYprrXDiVFbhyRx7" +
        `&startPagePath=${encodeURIComponent(toBase64("/pages/browser/index"))}` +
        `&startPageQuery=${encodeURIComponent(toBase64(`url=${encodeURIComponent(siteUrl)}`))}`,
    },
    {
      id: "coin98",
      name: "Coin98",
      // docs.coin98.com deeplink: https://coin98.com/dapp/:link/:chainId
      href: `https://coin98.com/dapp/${host}/1`,
    },
  ];
}

/** Phone browser without an injected wallet, i.e. would need WalletConnect */
export function shouldOfferWalletAppLinks(): boolean {
  if (typeof window === "undefined") return false;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const insideWalletBrowser = Boolean((window as { ethereum?: unknown }).ethereum);
  return isMobile && !insideWalletBrowser;
}
