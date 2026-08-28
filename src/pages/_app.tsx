import type { AppProps } from "next/app";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { config } from "../wagmi";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { SharedStateProvider } from "../context/SharedStateContext";
import ErrorBoundary from "@/components/social/telegram/TelegramError";
import { SessionProvider } from "next-auth/react";
import "@rainbow-me/rainbowkit/styles.css";
import "../../globals.css";
import { RateBootstrapper } from "@/components/dashboard/RateBootstrapper";
import UserBootstrap from "@/components/dashboard/checkTelUser";
import { WalletBootstrap } from "@/components/crypto/WalletBootstrap";
import { Toaster } from "@/components/ui/toaster";

export const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {


  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SessionProvider session={pageProps.session}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={client}>
            <RainbowKitProvider>
              <SharedStateProvider>
                <ErrorBoundary>
                  {/* usefull for fetching rates in
                  intervals and saving to zustand */}
                  <RateBootstrapper />
                  <UserBootstrap />
                  <WalletBootstrap />
                  <Component {...pageProps} />
                  <Toaster />
                  <ReactQueryDevtools />
                  <Analytics />
                  <SpeedInsights />
                </ErrorBoundary>
              </SharedStateProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </SessionProvider>
    </>
  );
}

export default MyApp;
