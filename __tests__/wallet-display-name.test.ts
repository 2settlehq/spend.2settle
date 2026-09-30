import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getEnsName = vi.fn();
vi.mock("wagmi/actions", () => ({ getEnsName: (...args: any[]) => getEnsName(...args) }));
vi.mock("@/wagmi", () => ({ config: {} }));

import { resolveWalletName } from "@/lib/wallets/resolveWalletName";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";

const ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

function mockBns(name: string | null) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: 0, name }),
  }) as any;
}

describe("resolveWalletName", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prefers the ENS name", async () => {
    getEnsName.mockResolvedValue("vitalik.eth");
    mockBns("other.bnb");
    expect(await resolveWalletName("EVM", ADDRESS)).toBe("vitalik.eth");
  });

  it("falls back to the .bnb name", async () => {
    getEnsName.mockResolvedValue(null);
    mockBns("name.bnb");
    expect(await resolveWalletName("EVM", ADDRESS)).toBe("name.bnb");
  });

  it("falls back to the truncated address when lookups fail", async () => {
    getEnsName.mockRejectedValue(new Error("rpc down"));
    global.fetch = vi.fn().mockRejectedValue(new Error("offline")) as any;
    expect(await resolveWalletName("EVM", ADDRESS)).toBe("0xd8d...6045");
  });

  it("uses the truncated address for non-EVM wallets without lookups", async () => {
    global.fetch = vi.fn() as any;
    expect(await resolveWalletName("TRC20", "TXYZabcdefghijklmnop1234")).toBe("TXYZa...1234");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("wallet store display name", () => {
  beforeEach(() => useWalletStore.getState().clearWallet());

  it("keeps the name across a chain switch but not an address change", () => {
    const store = useWalletStore.getState();
    store.setWallet("EVM", ADDRESS, 1);
    store.setDisplayName(ADDRESS, "vitalik.eth");

    useWalletStore.getState().setWallet("EVM", ADDRESS, 56);
    expect(useWalletStore.getState().displayName).toBe("vitalik.eth");

    useWalletStore.getState().setWallet("EVM", "0x1111111111111111111111111111111111111111", 1);
    expect(useWalletStore.getState().displayName).toBeNull();
  });

  it("ignores a lookup that finishes after the wallet changed", () => {
    useWalletStore.getState().setWallet("EVM", "0x1111111111111111111111111111111111111111", 1);
    useWalletStore.getState().setDisplayName(ADDRESS, "stale.eth");
    expect(useWalletStore.getState().displayName).toBeNull();
  });
});
