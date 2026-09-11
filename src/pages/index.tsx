import type { NextPage } from "next";
import Head from "next/head";
import Layout from "../components/Layout";
import PageBody from "../components/dashboard/Body";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { checkReferralExists } from "@/helpers/api_calls";

const Home: NextPage = () => {
  const router = useRouter();
  useEffect(() => {
    const processReferral = async () => {
      const { ref } = router.query;

      if (typeof ref === "string") {
        try {
          const referral = await checkReferralExists(ref);

          if (referral && referral.user) {
            localStorage.setItem("referralCode", referral.user.ref_code);
            localStorage.setItem("referralCategory", referral.user.category);

            // Remove the referral parameters from the URL
            const { ref, ...restQuery } = router.query;
            await router.replace(
              {
                pathname: router.pathname,
                query: restQuery,
              },

              undefined,
              { shallow: true }
            );
          } else {
            // Remove the referral parameters from the URL either way
            const { ref, ...restQuery } = router.query;
            await router.replace(
              {
                pathname: router.pathname,
                query: restQuery,
              },

              undefined,
              { shallow: true }
            );
            console.warn("Invalid referral data received");
          }
        } catch (error) {
          console.error("Error processing referral:", error);
        }
      }
    };

    if (router.isReady) {
      processReferral();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-custom-blue via-custom-pink to-pink-500">
      <Head>
        <title>2Settle – Crypto to Fiat Payments for Africa</title>
        <meta
          name="spend,send,integrate"
          content="Send, spend, and integrate crypto payments seamlessly in Africa with 2Settle. Fast, secure, and reliable crypto-to-fiat conversion and payments."
        />
        <meta
          name="keywords"
          content="crypto to fiat Africa, send crypto Nigeria, crypto payments, stablecoin payments, 2Settle, spend crypto, crypto to naira, crypto commerce"
        />
        <meta name="author" content="2Settle Team" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#ffffff" />

        {/* Open Graph (for Facebook, LinkedIn) */}
        <meta
          property="og:title"
          content="2Settle – Crypto to Fiat Payments for Africa"
        />
        <meta
          property="og:description"
          content="Send, spend, and integrate crypto payments across Africa using 2Settle's fast, reliable gateway."
        />
        <meta property="og:url" content="https://spend.2settle.io" />
        <meta
          property="og:image"
          content="https://spend.2settle.io/og-image.jpg"
        />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="2Settle – Crypto to Fiat Payments for Africa"
        />
        <meta
          name="twitter:description"
          content="Seamless crypto-to-fiat payments for African users and businesses."
        />
        <meta
          name="twitter:image"
          content="https://spend.2settle.io/og-image.jpg"
        />
        {/* web favicon */}
        <link rel="me" href="https://twitter.com/2settlehq" />
        <link rel="me" href="https://t.me/2settle" />
        <link rel="me" href="https://linkedin.com/company/2settle" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="favicon-16x16.png"
        />
        <link rel="manifest" href="site.webmanifest" />
        <link rel="mask-icon" href="safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="favicon.ico" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="msapplication-config" content="browserconfig.xml" />
        <meta name="theme-color" content="#ffffff"></meta>
      </Head>

      <Layout>
        <PageBody />
      </Layout>
    </div>
  );
};

export default Home;
