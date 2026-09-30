import { useChains } from "wagmi";
import { PAYMENT_CHAINS, PaymentChain } from "@/lib/wallets/walletNetworks";

/**
 * Payment chains that are also configured in wagmi (src/wagmi.ts), i.e. the
 * networks a user can actually switch their wallet to and pay on.
 */
export function usePaymentChains(): PaymentChain[] {
  const configuredChains = useChains();
  return PAYMENT_CHAINS.filter((chain) =>
    configuredChains.some((configured) => configured.id === chain.chainId),
  );
}
