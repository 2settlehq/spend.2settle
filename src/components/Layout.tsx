import React, { ReactNode } from "react";
import Script from "next/script";
import Footer from "./shared/Footer";
import Navbar from "./shared/NavBar";
import { useMediaQuery } from "./dashboard/Body";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTab = useMediaQuery("(max-width: 768px)");
  const isDeskTop = useMediaQuery("(max-width: 1440px)");

  const bgClass = isMobile
    ? "bg-gradient-to-r from-[#d2d9f8] to-[#f3f7f6]"
    : isTab
    ? "bg-gradient-to-r from-[#bec3f8] to-[#f3f7f6]"
    : "bg-[#f3f7f8]";

  return (
    <div className="flex flex-col min-h-screen">
      <Script
        id="telegram-script"
        strategy="beforeInteractive"
        src="https://telegram.org/js/telegram-web-app.js"
      />
      <Script
        id="structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "2Settle",
          url: "https://spend.2settle.io",
          logo: "https://spend.2settle.io/logo.png",
          sameAs: [
            "https://twitter.com/2settlehq",
            "https://linkedin.com/company/2settle",
            "https://t.me/yourtelegram",
          ],
          description:
            "2Settle enables Africans to send, receive, and spend crypto easily with instant fiat conversion.",
        })}
      </Script>
      {/* #ced4f9 start
       {/* #f3f7f6 end */}
      <header className={bgClass}>
        <Navbar />
      </header>
      <main role="main" className="flex-grow">
        {children}
      </main>
      <footer>
        <Footer />
      </footer>
    </div>
  );
}
