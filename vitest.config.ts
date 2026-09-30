// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    env: {
      // src/wagmi.ts refuses to load without a well-formed id
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "00000000000000000000000000000000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "stores": path.resolve(__dirname, "./stores"),
    },
  },
});
