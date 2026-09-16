"use client";

import React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { SiInstagram, SiSnapchat, SiThreads, SiX } from "react-icons/si";
import Logo from "./Logo";
import FooterTypingText from "./FooterTypingText";

type FooterLink = { label: string; href?: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Use 2SettleHQ",
    links: [
      { label: "PayCard", href: "/virtual-card" },
      { label: "For Individual", href: "/" },
      { label: "For Business", href: "https://2settle.io/", external: true },
      { label: "Meet Wale" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Transfer Money", href: "/transact" },
      { label: "Make Payment", href: "/transact" },
      { label: "Manual Payment", href: "/new-transaction" },
      { label: "Integrate API" },
      { label: "Money Agent" },
    ],
  },
  {
    title: "Opportunity",
    links: [
      { label: "Pool" },
      { label: "Career" },
      { label: "Merchants" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQs" },
      { label: "Compliance", href: "/aml-kyc" },
      { label: "Cancellation & Refund Policy", href: "/crypto-refund-policy" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const spendLinks: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "History", href: "/history" },
  { label: "Reportly", href: "/reportly" },
  { label: "Settings", href: "/setting" },
  { label: "2settle Market", href: "https://market.2settle.io/", external: true },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/2settlehq/", Icon: SiInstagram },
  { label: "X", href: "https://x.com/2SettleHQ", Icon: SiX },
  { label: "Snapchat", href: "https://snapchat.com/t/chUlQmUr", Icon: SiSnapchat },
  { label: "Threads", href: "https://www.threads.net/@2settlehq/", Icon: SiThreads },
];

function FooterItem({ label, href, external }: FooterLink) {
  if (!href) return <span className="block text-gray-500">{label}</span>;
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="block w-fit text-gray-500 transition-colors hover:text-[#315ba4] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315ba4]"
    >
      {label}
    </Link>
  );
}

export default function Footer() {
  const { status } = useSession();

  return (
    <footer className="relative isolate overflow-hidden border-t-[3px] border-[#315ba4] bg-[#f1f5ff] font-sans text-gray-700">
      <svg
        aria-hidden="true"
        viewBox="0 0 960 380"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -right-8 top-0 -z-10 hidden h-[270px] w-[55%] opacity-70 lg:block"
      >
        <path
          fill="white"
          d="M135 54 205 46 254 34 328 38 399 24 480 31 557 17 632 24 707 18 783 27 846 15 914 23 960 10V290l-36-12-50 8-41-18-54 9-63-22-53 6-61-23-56 10-76-26-53 5-60-27-53 6-50-26-56 10-39-17-41 6-28-24-26 9-31-21-29 7-25-26-18 8-21-22-18 4-13-25-15 7-8-26-14 9-10-24-11 3-8-26 5-17-13-15 18-21-3-15 27-12 8-22 34-6 18-19 38-2 30-17Z"
        />
      </svg>

      <div className="relative mx-auto max-w-[1280px] px-5 pb-4 pt-8 sm:px-8 lg:px-12 lg:pt-14">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:min-h-[205px] lg:grid-cols-[minmax(250px,1.3fr)_repeat(4,minmax(135px,1fr))] lg:items-center lg:gap-x-6">
          <div className="col-span-2 max-w-sm sm:col-span-3 lg:col-span-1">
            <div className="mb-2"><Logo className="!h-10 !w-36" /></div>
            <a href="mailto:chat@2settle.io" className="mt-2 block w-fit text-sm font-semibold text-gray-500 hover:text-[#315ba4]">
              chat@2settle.io
            </a>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="2settle social media">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-md bg-[#426cb6] text-white transition-colors hover:bg-[#315ba4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315ba4]"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title} className="lg:min-h-[140px]">
              <h2 className="mb-3 text-sm font-bold text-[#557ab6] sm:text-base">{title}</h2>
              <div className="space-y-2 text-sm leading-5">
                {links.map((item) => (
                  <FooterItem
                    key={item.label}
                    {...(item.label === "Manual Payment" && status !== "authenticated"
                      ? {
                          label: "Manual Payment",
                          href: "/login?callbackUrl=%2Fnew-transaction",
                        }
                      : item)}
                  />
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="mt-4 border-t-[3px] border-[#315ba4] pt-3">
          <nav aria-label="Spend quick links" className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
            {spendLinks.map((item) => <FooterItem key={item.label} {...item} />)}
          </nav>
          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#365da2] px-5 py-3 text-sm text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="leading-5 text-white/80">
              <span className="font-semibold text-white">Product by <span className="text-[#6bc3ec]">Sirfitech</span></span>
              <span className="mx-2" aria-hidden="true">|</span>
              All rights reserved. Copyright © {new Date().getFullYear()}
            </p>
            <FooterTypingText />
          </div>
        </div>

        {status === "authenticated" && (
          <div className="mt-4 flex gap-4 text-xs text-[#426cb6]">
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex items-center gap-1 hover:underline">
              <LogOut className="size-3.5" aria-hidden="true" /> Log out
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
