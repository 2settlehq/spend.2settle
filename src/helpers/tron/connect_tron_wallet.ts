import useTronWallet from "../../../stores/tronWalletStore";

/**
 * Attempts to connect to TronLink.
 *
 * If the wallet is already unlocked, connects immediately.
 * If locked, returns { pending: true } so the caller can
 * show a "Please unlock TronLink" message to the user.
 * The caller should then call listenForTronUnlock() to
 * wait for the user to unlock via the extension icon.
 */
export async function connectTronWallet(): Promise<
  { connected: true } | { pending: true }
> {
  if (!window.tronLink) {
    window.open("https://www.tronlink.org/", "_blank");
    throw new Error("TronLink is not installed");
  }

  try {
    await window.tronLink.request({ method: "tron_requestAccounts" });
  } catch {
    // Some versions throw instead of returning a code — continue anyway
  }

  // If tronWeb is already ready (user was already unlocked), connect now
  if (window.tronWeb?.ready) {
    finishConnection();
    return { connected: true };
  }

  // Wallet is locked — caller needs to prompt user to unlock
  return { pending: true };
}

/**
 * Listens for TronLink unlock/account events.
 * Resolves when the user unlocks and connects.
 * Rejects after timeout.
 */
export function listenForTronUnlock(timeout = 60000): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Timed out waiting for TronLink unlock"));
    }, timeout);

    function handler(e: MessageEvent) {
      if (e.data?.message?.action === "setAccount") {
        // TronLink fires this when user unlocks or switches accounts
        cleanup();

        // Give tronWeb a moment to update after the event
        setTimeout(() => {
          if (window.tronWeb?.ready && window.tronWeb.defaultAddress?.base58) {
            finishConnection();
            resolve(true);
          } else {
            reject(new Error("TronLink unlocked but tronWeb not ready"));
          }
        }, 500);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("message", handler);
    }

    window.addEventListener("message", handler);
  });
}

/**
 * Re-reads the TronLink address and balances for an already-connected
 * wallet (e.g. after a page load). No-op when TronLink isn't ready.
 */
export function refreshTronWallet() {
  if (!window.tronWeb?.ready) return;
  try {
    finishConnection();
  } catch (error) {
    console.error("Failed to refresh Tron wallet:", error);
  }
}

function finishConnection() {
  const address = window.tronWeb.defaultAddress.base58;
  if (!address || address === "false") {
    throw new Error("Could not read wallet address");
  }

  const store = useTronWallet.getState();
  store.setWalletAddress(address);
  store.setConnected(true);

  // Fetch balances in the background
  fetchBalances(address).catch(console.error);
}

async function fetchBalances(address: string) {
  const store = useTronWallet.getState();

  const trxBalance = await window.tronWeb.trx.getBalance(address);
  store.setTrxBalance(window.tronWeb.fromSun(trxBalance));

  const usdtBalance = await getUSDTBalance();
  store.setUSDTBalance(usdtBalance ?? 0);
}

async function getUSDTBalance(): Promise<number | undefined> {
  if (!window.tronWeb || !window.tronWeb.ready) {
    return undefined;
  }

  const tronWeb = window.tronWeb;
  const address = tronWeb.defaultAddress.base58;
  const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_TRC20_CONTRACT;

  if (!usdtContractAddress) {
    console.error("USDT contract address is not defined");
    return undefined;
  }

  try {
    const contract = await tronWeb.contract().at(usdtContractAddress);
    const balance = await contract.methods.balanceOf(address).call();
    return parseFloat(balance.toString()) / 1e6;
  } catch (err) {
    console.error("Failed to fetch USDT balance", err);
    return undefined;
  }
}
