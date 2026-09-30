import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getEnsName = vi.fn();
const getEnsAvatar = vi.fn();
vi.mock("wagmi/actions", () => ({
  getEnsName: (...args: any[]) => getEnsName(...args),
  getEnsAvatar: (...args: any[]) => getEnsAvatar(...args),
}));
vi.mock("@/wagmi", () => ({ config: {} }));

import { resolveWalletIdentity } from "@/lib/wallets/resolveWalletName";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";

const ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

function mockBns(name: string | null) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: 0, name }),
  }) as any;
}

describe("resolveWalletIdentity", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prefers the ENS name, with its avatar", async () => {
    getEnsName.mockResolvedValue("vitalik.eth");
    getEnsAvatar.mockResolvedValue("https://avatar.example/v.png");
    mockBns("other.bnb");
    expect(await resolveWalletIdentity("EVM", ADDRESS)).toEqual({
      name: "vitalik.eth",
      avatar: "https://avatar.example/v.png",
    });
    expect(getEnsAvatar).toHaveBeenCalledWith({}, { name: "vitalik.eth", chainId: 1 });
  });

  it("falls back to the .bnb name", async () => {
    getEnsName.mockResolvedValue(null);
    mockBns("name.bnb");
    expect(await resolveWalletIdentity("EVM", ADDRESS)).toEqual({ name: "name.bnb", avatar: null });
  });

  it("falls back to the truncated address when lookups fail", async () => {
    getEnsName.mockRejectedValue(new Error("rpc down"));
    global.fetch = vi.fn().mockRejectedValue(new Error("offline")) as any;
    expect(await resolveWalletIdentity("EVM", ADDRESS)).toEqual({ name: "0xd8d...6045", avatar: null });
  });

  it("uses the truncated address for non-EVM wallets without lookups", async () => {
    global.fetch = vi.fn() as any;
    expect((await resolveWalletIdentity("TRC20", "TXYZabcdefghijklmnop1234")).name).toBe("TXYZa...1234");
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
