import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CryptoRefundPolicy from "@/pages/crypto-refund-policy";
import { cryptoRefundParagraphs } from "@/content/crypto-refund";

vi.mock("next/head", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

afterEach(cleanup);

describe("Crypto Transaction, Cancellation & Refund Policy page", () => {
  it("renders the public policy paragraphs in source order without displaying implementation notes", () => {
    render(<CryptoRefundPolicy />);
    const article = screen.getByRole("article");
    const rendered = Array.from(article.querySelectorAll("h1,h2,p,li"))
      .map((element) => element.textContent ?? "");
    const source = cryptoRefundParagraphs.map((item) => item.text.replace(/\u000b/g, "\n"));
    expect(rendered).toEqual(source);
    expect(cryptoRefundParagraphs).toHaveLength(69);
    expect(article.querySelectorAll("h2")).toHaveLength(11);
    expect(article.querySelectorAll("li")).toHaveLength(21);
    expect(screen.getByText("11. Final Provision")).toBeTruthy();
    expect(screen.queryByText("Production implementation")).toBeNull();
  });
});
