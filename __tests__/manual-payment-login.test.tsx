import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LoginPage from "@/pages/login";

const mocks = vi.hoisted(() => ({
  query: { callbackUrl: "/new-transaction" as string },
  signIn: vi.fn(),
}));

vi.mock("next/router", () => ({ useRouter: () => ({ query: mocks.query, push: vi.fn() }) }));
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
vi.mock("next/head", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

afterEach(() => {
  cleanup();
  mocks.signIn.mockClear();
});

it("returns to manual payment after Google sign-in", () => {
  render(<LoginPage />);
  fireEvent.click(screen.getByRole("button", { name: "Google" }));
  expect(mocks.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/new-transaction" });
});

it("does not accept an external callback URL", () => {
  mocks.query.callbackUrl = "//untrusted.example";
  render(<LoginPage />);
  fireEvent.click(screen.getByRole("button", { name: "Google" }));
  expect(mocks.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  mocks.query.callbackUrl = "/new-transaction";
});
