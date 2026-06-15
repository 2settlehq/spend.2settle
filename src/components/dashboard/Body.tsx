
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import ChatBot from "../../core/ChatBot";
import SendMoney from "./SendMoney";
import { formatCurrency } from "../../helpers/format_currency";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "../social/telegram/TelegramError";
import useRate from "@/hooks/rates/useRate";
import useTotalVolume from "@/hooks/dashboard/useTotalVolume";
import Maintenance from "./Maintenance";
import DisplayTransactions from "./DisplayTransactions";
import { usePaymentStore } from "stores/paymentStore";

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
};

const formatRateUpdatedAt = (timestamp: number | string | null | undefined) => {
  if (!timestamp) return null;

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
    // IANA "Etc/GMT+1" is fixed UTC-1.
    timeZone: "Etc/GMT",
  })
    .format(new Date(timestamp))
    .replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
};

export default function Body() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const isMobile = useMediaQuery("(max-width: 425px)");
  const isTab = useMediaQuery("(max-width: 768px)");
  const isDeskTop = useMediaQuery("(max-width: 1440px)");

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCategory, setReferralCategory] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    data: rateDetails,
    isLoading: rateLoading,
    error: rateError,
  } = useRate();
  const {
    data: tvt,
    isLoading: TvtLoading,
    error: tvtError,
  } = useTotalVolume();
  const [showMaintenance, setShowMaintenance] = useState(false);
  const rate = rateDetails?.rateNumeric;
  const formattedRateUpdatedAt = formatRateUpdatedAt(rateDetails?.updatedAt);

  // set rate for global use
  useEffect(() => {
    if (!rateLoading && !rateError && rateDetails?.rateNumeric) {
      usePaymentStore.getState().setRate(rateDetails.rateNumeric.toString());
      return;
    }
  }, [rateDetails?.rateNumeric, rateLoading, rateError]);

  // set maintaince by setting showMaintenance = false
  useEffect(() => {
    setShowMaintenance(false);
  }, []);

  useEffect(() => {
    setIsClient(true);
    const code = localStorage.getItem("referralCode");
    const category = localStorage.getItem("referralCategory");

    if (code && category) {
      setReferralCode(code);
      setReferralCategory(category);
      // Clear the referral information from localStorage
      localStorage.removeItem("referralCode");
      localStorage.removeItem("referralCategory");
    }
  }, []);

  const getBackgroundImage = (): string => {
    if (isMobile) {
      return "https://gbo1qdj0roz2nqut.public.blob.vercel-storage.com/home-bg-sm-x1K8H1Woi3WMjoEJnhjLGpt6gugM9z.png";
    } else {
      return "https://gbo1qdj0roz2nqut.public.blob.vercel-storage.com/home-bg-lg-GWkkBEQz6PnxsepRxg7sVChWtC4M1x.png";
    }
  };
  const getWale = () => {
    return "https://gbo1qdj0roz2nqut.public.blob.vercel-storage.com/wale-mTGuRn8gew59IpHaWYW1PrlfiZ2NxQ.png";
  };
  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    console.error("Image loading error:", event);
    setImageError(
      "Failed to load the background image. Please check your internet connection and try again.",
    );
  };
  const renderWale = () => {
    return isMobile ? (
      <Image
        src={getWale()}
        alt="Wale Image"
        width={200}
        height={500}
        priority
        onError={handleImageError}
      />
    ) : isTab ? (
      <Image
        src={getWale()}
        alt="Wale Image"
        width={300}
        height={500}
        priority
        onError={handleImageError}
      />
    ) : isDeskTop ? (
      <Image
        src={getWale()}
        alt="Wale Image"
        width={500}
        height={500}
        priority
        onError={handleImageError}
      />
    ) : (
      <Image
        src={getWale()}
        alt="Wale Image"
        width={700}
        height={700}
        className="w-full"
        priority
        onError={handleImageError}
      />
    );
  };
  const renderChat = () => {
    const launcherSize =
      isMobile || isTab ? "h-16 w-16" : isDeskTop ? "h-28 w-28" : "h-24 w-24";

    return (
      <Button
        className={`fixed bottom-8 right-8 ${
          isOpen ? "hidden" : launcherSize
        } chat-launcher-float rounded-full bg-transparent p-0 transition-transform transform hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 z-50 shadow-none overflow-visible`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {!isOpen && (
          <Image
            src="/chat-icon.png"
            alt="Open chat"
            width={160}
            height={160}
            className="h-full w-full object-contain"
            priority
          />
        )}
      </Button>
    );
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden">
      <div className={`absolute inset-0 ${isOpen ? "z-0" : "z-10"}`}>
        <Image
          src={getBackgroundImage()}
          alt="Background"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
          priority
          onError={handleImageError}
        />
      </div>

      {imageError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center z-50">
          {imageError}
        </div>
      )}

      {showMaintenance && <Maintenance onMaintainance={showMaintenance} />}

      <div
        className={`relative flex-grow flex flex-col items-center justify-center p-4 md:p-8 ${
          isOpen ? "z-0" : "z-20"
        }`}
      >
        <div className="flex justify-center mb-20">
          <h3 className=" text-4xl font-Poppins font-bold ">
            <span className="flex justify-center">A New Way </span>
            To <span className="font-grand">Spend </span>Money
          </h3>
        </div>

        <div className="text-center font-Poppins  text-black bg-gradient-to-tr from-purple-300 via-grey-400 to-white bg-opacity-90 px-8 py-3 rounded-full shadow-lg mb-6 border-2 border-white ">
          {rateLoading ? (
            <h2 className="font-Poppins text-sm md:text-xl ">
              {/* animate-pulse */}
              Loading Exchange rate...
            </h2>
          ) : rateError ? (
            <h2 className="font-Poppins text-sm md:text-xl ">
              {/* animate-pulse */}
              {rateError.message}
            </h2>
          ) : (
            <span className="text-blue-700 font-Poppins text-xl md:text-2xl font-bold animate-pulse">
              <b>
                {" "}
                {formatCurrency(rate?.toString() ?? "0", "NGN", "en-NG")}/$1
              </b>
            </span>
          )}
        </div>

        {!rateLoading && !rateError && formattedRateUpdatedAt && (
          <p className="mb-3 text-center font-Poppins text-xs md:text-sm text-black/70">
            Last updated:{" "}
            <span className="font-bold">{formattedRateUpdatedAt}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-center mt-4 space-y-4 sm:space-y-0 sm:space-x-4 mb-5">
          <Button
            className="px-4 py-2 bg-blue-500 text-white rounded-full w-full sm:w-auto hover:bg-blue-500"
            onClick={() => setIsOpen(true)}
          >
            {isClient ? <SendMoney /> : "Spend Money"}
          </Button>
        </div>

        <div className="text-center bg-white font-Poppins  text-black  px-8 py-2 rounded-full shadow-lg mb-6 border-2 border-white">
          {TvtLoading ? (
            <h2 className="font-Poppins text-xs md:text-sm animate-pulse">
              Loading Total Volume Traded YTD...
            </h2>
          ) : tvtError ? (
            <h2 className="font-Poppins text-xs md:text-sm animate-pulse">
              {tvtError.message}
            </h2>
          ) : (
            <h3 className="font-bold font-Poppins text-sm md:text-lg text-black">
              Volume(YTD):
              <span className="text-green-600 text-sm md:text-lg animate-pulse">
                <b> {formatCurrency(tvt?.toString() ?? "0", "USD")}</b>
              </span>
            </h3>
          )}
        </div>

        {referralCode && referralCategory && (
          <div className="mt-4 text-center bg-white bg-opacity-80 p-4 rounded-lg shadow-lg">
            <p className="text-black font-medium">
              Thank you for honoring our{" "}
              {referralCategory === "amb"
                ? "brand ambassador"
                : referralCategory === "mkt"
                  ? "marketer"
                  : "partner"}
              .
            </p>
          </div>
        )}
      </div>

      <div
        className={`absolute left-0 bottom-0 transform-y-1/4 ${
          isOpen ? "z-0" : "z-10"
        } `}
      >
        {renderWale()}
      </div>

      {renderChat()}

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <ErrorBoundary
            fallback={
              <div className="p-4 bg-white rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-2">Chat Error</h3>
                <p>
                  Unable to load the chat interface. Please try again later.
                </p>
                <Button onClick={() => setIsOpen(false)} className="mt-4">
                  Close
                </Button>
              </div>
            }
          >
            <ChatBot isMobile={isMobile} onClose={() => setIsOpen(false)} />
          </ErrorBoundary>
        </div>
      )}
      {/* Transaction Table Section */}
      <div className="w-full max-w-6xl mx-auto px-4 mt-8 mb-12 relative z-20 ">
        <h2 className="text-2xl font-bold text-left pl-4 mb-6 bg-white bg-opacity-90 py-2 rounded-lg">
          Recent Transactions
        </h2>
        <div
          className="bg-white bg-opacity-90 rounded-lg shadow-lg p-4 overflow-auto"
          style={{ height: 165 }}
        >
          <DisplayTransactions />
        </div>
      </div>
    </div>
  );
}
