import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPolicy from "@/pages/privacy";

vi.mock("next/head", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

afterEach(cleanup);

describe("Privacy Policy page", () => {
  it("uses the Terms and Conditions legal-page design", () => {
    render(<PrivacyPolicy />);

    const article = screen.getByRole("article");
    expect(article.className).toContain("max-w-4xl");
    expect(article.className).toContain("text-gray-800");

    const title = screen.getByRole("heading", { level: 1, name: "Privacy Policy" });
    expect(title.className).toContain("text-[#315ba4]");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(10);

    for (const heading of screen.getAllByRole("heading", { level: 2 })) {
      expect(heading.className).toContain("text-[#315ba4]");
    }

    expect(screen.getByText("Last updated: August 20, 2026")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "compliance@2settle.io" })).toHaveLength(2);
  });
});
