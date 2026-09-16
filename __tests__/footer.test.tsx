import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Footer from "@/components/shared/Footer";
import FooterTypingText from "@/components/shared/FooterTypingText";

const auth = vi.hoisted(() => ({ status: "unauthenticated" }));

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: auth.status }), signOut: vi.fn() }));
vi.mock("@/components/shared/Logo", () => ({ default: () => <img alt="Logo" src="/logos/normal/simple_logo.png" /> }));

afterEach(() => { cleanup(); auth.status = "unauthenticated"; });

describe("Spend footer redesign", () => {
  it("keeps the logo, socials, and old Spend destinations without the removed message or wallet CTA", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByText(/Seamless, user friendly experience/)).toBeNull();
    expect(within(footer).getByRole("img", { name: "Logo" })).toBeTruthy();
    expect(within(footer).queryByRole("button", { name: "Connect Wallet" })).toBeNull();
    expect(within(footer).queryByText("Spend Now")).toBeNull();
    for (const label of ["Instagram", "X", "Snapchat", "Threads"]) {
      expect(within(footer).getByRole("link", { name: label })).toHaveProperty("target", "_blank");
    }
    const quick = within(footer).getByRole("navigation", { name: "Spend quick links" });
    expect(within(quick).getByRole("link", { name: "History" }).getAttribute("href")).toBe("/history");
    expect(within(quick).getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/setting");
    expect(within(quick).getByRole("link", { name: "2settle Market" }).getAttribute("href")).toBe("https://market.2settle.io/");
    const terms = within(footer).getByRole("link", { name: "Terms of Service" });
    expect(terms.getAttribute("href")).toBe("/terms");
    expect(terms).not.toHaveProperty("target", "_blank");
    const compliance = within(footer).getByRole("link", { name: "Compliance" });
    expect(compliance.getAttribute("href")).toBe("/aml-kyc");
    expect(compliance).not.toHaveProperty("target", "_blank");
    const refundPolicy = within(footer).getByRole("link", { name: "Cancellation & Refund Policy" });
    expect(refundPolicy.getAttribute("href")).toBe("/crypto-refund-policy");
    expect(refundPolicy).not.toHaveProperty("target", "_blank");
    for (const name of ["Use 2SettleHQ", "Services", "Opportunity", "Support"]) {
      expect(within(footer).getByRole("navigation", { name })).toBeTruthy();
    }
  });
  it("fits the manual payment link into Services without a separate gear button", () => {
    auth.status = "authenticated";
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByRole("button", { name: /Manual transaction/i })).toBeNull();
    const services = within(footer).getByRole("navigation", { name: "Services" });
    expect(within(services).getByRole("link", { name: "Manual Payment" }).getAttribute("href"))
      .toBe("/new-transaction");
    expect(within(footer).getByRole("button", { name: /Log out/i })).toBeTruthy();
  });
  it("shows manual payment to signed-out visitors too", () => {
    render(<Footer />);
    const services = screen.getByRole("navigation", { name: "Services" });
    expect(within(services).getByRole("link", { name: "Manual Payment" }).getAttribute("href"))
      .toBe("/login?callbackUrl=%2Fnew-transaction");
  });
});

describe("2settle footer typing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it("types, holds for two seconds, erases, and switches phrases", async () => {
    render(<FooterTypingText />);
    const animated = screen.getByLabelText("@2SettleHQ: Transfer Money or Make Payment");
    const run = async (ms: number) => {
      for (let elapsed = 0; elapsed < ms; elapsed += 100) {
        await act(async () => vi.advanceTimersByTimeAsync(Math.min(100, ms - elapsed)));
      }
    };
    await run(1400);
    expect(animated.textContent).toContain("Transfer Money");
    await run(1900);
    expect(animated.textContent).toContain("Transfer Money");
    await run(2800);
    expect(animated.textContent).toContain("Make Payment");
  });
  it("shows both phrases without animation when reduced motion is preferred", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<FooterTypingText />);
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(screen.getByLabelText("@2SettleHQ: Transfer Money or Make Payment").textContent).toContain("Transfer Money / Make Payment");
    vi.unstubAllGlobals();
  });
});
