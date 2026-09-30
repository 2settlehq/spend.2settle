import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  bsc,
  arbitrum,
  base,
  optimism,
  polygon,
  bscTestnet,
  bscGreenfield,
} from "wagmi/chains";
import { TESTNETS_ENABLED } from "@/services/transactionService/cryptoService/chainConfig";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

// Fail the build instead of silently shipping a placeholder id that the
// WalletConnect relay rejects (which surfaces as a generic WebSocket error).
if (!projectId || !/^[0-9a-f]{32}$/i.test(projectId)) {
  throw new Error(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing or malformed (expected 32 hex chars from cloud.reown.com)",
  );
}

export const config = getDefaultConfig({
  appName: "2settle Livechat",
  projectId,
  chains: [
    mainnet,
    bsc,
    polygon,
    optimism,
    arbitrum,
    base,
    bscGreenfield,
    // Testnets only where NEXT_PUBLIC_ENABLE_TESTNETS=true (dev), never in prod
    ...(TESTNETS_ENABLED ? [bscTestnet] : []),
  ],
  ssr: true,
});

