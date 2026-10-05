import { beforeEach, describe, expect, it } from "vitest";
import { useStatusStore } from "stores/statusStore";

describe("statusStore.patchStatus", () => {
  beforeEach(() => {
    useStatusStore.getState().clearAllStatuses();
  });

  it("creates the record when the reference was never seeded", () => {
    useStatusStore.getState().patchStatus("2S-REF1", { status: "settled" });

    expect(useStatusStore.getState().statusesByReference["2S-REF1"]).toMatchObject({
      reference: "2S-REF1",
      status: "settled",
    });
  });

  it("defaults a new record to pending when the patch has no status", () => {
    useStatusStore.getState().patchStatus("2S-REF2", { txHash: "0xabc" });

    expect(useStatusStore.getState().statusesByReference["2S-REF2"]).toMatchObject({
      status: "pending",
      txHash: "0xabc",
    });
  });

  it("merges into an existing record", () => {
    const { upsertStatus, patchStatus } = useStatusStore.getState();
    upsertStatus({ reference: "2S-REF3", status: "pending", type: "transfer" });
    patchStatus("2S-REF3", { status: "confirming" });

    expect(useStatusStore.getState().statusesByReference["2S-REF3"]).toMatchObject({
      status: "confirming",
      type: "transfer",
    });
  });
});
