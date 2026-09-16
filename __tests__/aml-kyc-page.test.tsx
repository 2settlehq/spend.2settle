import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AmlKycPolicy from "@/pages/aml-kyc";
import { amlKycParagraphs } from "@/content/aml-kyc";

vi.mock("next/head", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

afterEach(cleanup);

describe("AML/KYC Policy page", () => {
  it("renders every source paragraph in order without changing its wording", () => {
    render(<AmlKycPolicy />);
    const article = screen.getByRole("article");
    const rendered = Array.from(article.querySelectorAll("h1,h2,p,li"))
      .map((element) => element.textContent ?? "");
    const source = amlKycParagraphs.map((item) => item.text.replace(/\u000b/g, "\n"));
    expect(rendered).toEqual(source);
    expect(amlKycParagraphs).toHaveLength(54);
    expect(article.querySelectorAll("h2")).toHaveLength(11);
    expect(article.querySelectorAll("li")).toHaveLength(17);
    expect(screen.getByText("11. Contact")).toBeTruthy();
  });
});
