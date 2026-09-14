// @vitest-environment node
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ClientObservability from "@/components/ClientObservability";

describe("Client observability", () => {
  it("does not create server-rendered Suspense boundaries for tracking widgets", () => {
    const html = renderToString(
      <>
        <main>2settle</main>
        <ClientObservability />
      </>,
    );

    expect(html).toBe("<main>2settle</main>");
    expect(html).not.toContain("<!--$");
  });
});
