import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TermsAndConditions from "@/pages/terms";
import { termsParagraphs } from "@/content/terms";

vi.mock("next/head", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

afterEach(cleanup);

describe("Terms and Conditions page", () => {
  it("renders every source paragraph in order without changing its wording", () => {
    render(<TermsAndConditions />);
    const article = screen.getByRole("article");
    const rendered = Array.from(article.querySelectorAll("h1,h2,p,li"))
      .map((element) => element.textContent ?? "");
    const source = termsParagraphs.map((item) => item.text.replace(/\u000b/g, "\n"));
    expect(rendered).toEqual(source);
    expect(termsParagraphs).toHaveLength(110);
    expect(article.querySelectorAll("h2")).toHaveLength(23);
    expect(article.querySelectorAll("li")).toHaveLength(5);
    expect(screen.getByText("23. Contact")).toBeTruthy();
  });
});
