"use client";

import React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { SiInstagram, SiSnapchat, SiThreads, SiX } from "react-icons/si";
import Logo from "./Logo";
import FooterTypingText from "./FooterTypingText";

type FooterLink = { label: string; href?: string; external?: boolean };

const spendLinks: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "History", href: "/history" },
  { label: "Reportly", href: "/reportly" },
  { label: "Settings", href: "/setting" },
  { label: "Manual Payment", href: "/new-transaction" },
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
    <footer className="relative isolate overflow-hidden border-t-[3px] border-[#315ba4] bg-[#eef2fc] font-sans text-gray-700">
      <svg
        aria-hidden="true"
        data-testid="footer-world-map"
        viewBox="0 0 1200 500"
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute -right-[3%] -top-8 z-0 hidden h-[220px] w-[62%] text-white opacity-90 lg:block"
      >
        <defs>
          <filter id="footer-map-brush" x="-5%" y="-8%" width="110%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="2" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g fill="currentColor" filter="url(#footer-map-brush)">
          <path d="M30 135c58-46 119-72 191-77l56 12 46-12 57 18 52-5 35 20-20 23-44 9-11 27-43 8-25 35-50 10-31-18-46 12-38-20-50 8-43-22-46-4-30-24 40-20Z" />
          <path d="M164 210l34-13 38 13 31 29 45 17 22 37-13 35 19 31-14 42-25 38-9 45-28-11-21-51-27-25-10-49-32-38 8-37-29-31 11-32Z" />
          <path d="M430 43l49-24 53 8 22 23-22 27-57 14-43-17-2-31Z" />
          <path d="M510 138l40-24 36 6 22-16 49 3 23 22-24 17-30-7-16 22-36-5-19 17-40-9-5-26Z" />
          <path d="M552 183l48-22 50 13 30 35 13 50-27 34-12 54-28 58-32-13-19-49-37-38-12-52-25-32 17-30 34-8Z" />
          <path d="M639 112l70-40 74 4 46-21 87 6 53 29 76 5 54 31 78 7 68 34 26 38-45 22-54-5-36 28-51-9-42 28-59-14-37-36-52 12-31-35-49 3-36-29-55 4-45-22-51 5-19-34 29-30Z" />
          <path d="M976 306l47-18 46 9 29 22 47 7 25 31-31 31-57-4-45 17-55-17-22-35 16-43Z" />
          <path d="m1130 403 31-7 20 15-20 19-34-8 3-19ZM1091 250l19-18 15 10-8 24-26-16ZM900 272l24-17 17 17-14 23-27-23ZM742 289l16-11 12 16-18 12-10-17Z" />
          <path d="M3 105c133-48 260-66 385-54l-9 12C251 54 128 75 3 119v-14ZM520 76c224-60 448-56 677 12v15C972 38 745 35 520 91V76ZM468 430c221 30 443 21 671-26l16 11c-231 54-462 65-692 31l5-16Z" opacity=".55" />
        </g>
      </svg>

      <div className="relative z-10 mx-auto max-w-[1280px] px-5 pb-3 pt-5 sm:px-8 lg:px-12 lg:pt-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(250px,1fr)_auto] sm:items-center lg:min-h-[88px] lg:gap-8">
          <div className="flex max-w-xl flex-col items-start gap-1.5">
            <Logo className="!h-8 !w-28 shrink-0" />
            <a href="mailto:chat@2settle.io" className="block w-fit text-xs font-semibold text-gray-500 hover:text-[#315ba4]">
              chat@2settle.io
            </a>
          </div>

          <nav aria-label="Help center" className="sm:justify-self-end">
            <a
              href="mailto:chat@2settle.io"
              className="inline-flex rounded-sm text-base font-bold text-[#557ab6] transition-colors hover:text-[#315ba4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315ba4] sm:text-lg"
            >
              Help center
            </a>
            <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="2settle social media">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-7 items-center justify-center rounded bg-[#426cb6] text-white transition-colors hover:bg-[#315ba4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315ba4]"
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-2 border-t-2 border-[#315ba4] pt-2">
          <nav aria-label="Spend quick links" className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] sm:text-xs">
            {spendLinks.map((item) => (
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
          </nav>
          <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-[#365da2] px-4 py-2 text-xs text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="leading-4 text-white/80">
              <span className="font-semibold text-white">Product by <span className="text-[#6bc3ec]">Sirfitech</span></span>
              <span className="mx-2" aria-hidden="true">|</span>
              All rights reserved. Copyright © {new Date().getFullYear()}
            </p>
            <FooterTypingText />
          </div>
        </div>

        {status === "authenticated" && (
          <div className="mt-2 flex gap-4 text-xs text-[#426cb6]">
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex items-center gap-1 hover:underline">
              <LogOut className="size-3.5" aria-hidden="true" /> Log out
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
