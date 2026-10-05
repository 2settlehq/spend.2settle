import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaymentLifecycleStatus =
  | "pending"
  | "confirming"
  | "confirmed"
  | "settling"
  | "settled"
  | "expired"
  | "failed"
  | "settlement_reversed";

export type StatusRecord = {
  reference: string;
  giftId?: string | null;
  status: PaymentLifecycleStatus;
  type?: string;
  expiresAt?: string | null;
  confirmations?: number | null;
  txHash?: string | null;
  updatedAt?: string;
};

type StatusStore = {
  activeReference: string | null;
  statusesByReference: Record<string, StatusRecord>;
  setActiveReference: (reference: string | null) => void;
  upsertStatus: (record: StatusRecord) => void;
  // Starts tracking a reference without overwriting what is already known
  trackStatus: (record: StatusRecord) => void;
  patchStatus: (
    reference: string,
    patch: Partial<Omit<StatusRecord, "reference">>,
  ) => void;
  clearStatus: (reference: string) => void;
  clearAllStatuses: () => void;
};

export const useStatusStore = create<StatusStore>()(
  persist(
    (set) => ({
      activeReference: null,
      statusesByReference: {},

      setActiveReference: (reference) => set({ activeReference: reference }),

      upsertStatus: (record) =>
        set((state) => ({
          statusesByReference: {
            ...state.statusesByReference,
            [record.reference]: {
              ...state.statusesByReference[record.reference],
              ...record,
              updatedAt: record.updatedAt ?? new Date().toISOString(),
            },
          },
        })),

      trackStatus: (record) =>
        set((state) => {
          if (state.statusesByReference[record.reference]) return state;

          return {
            statusesByReference: {
              ...state.statusesByReference,
              [record.reference]: {
                ...record,
                updatedAt: record.updatedAt ?? new Date().toISOString(),
              },
            },
          };
        }),

      patchStatus: (reference, patch) =>
        set((state) => {
          // Create the record when missing so polled updates for payments that
          // were never seeded with upsertStatus (e.g. AI chat debits) still land
          const existing: StatusRecord = state.statusesByReference[reference] ?? {
            reference,
            status: "pending",
          };

          return {
            statusesByReference: {
              ...state.statusesByReference,
              [reference]: {
                ...existing,
                ...patch,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      clearStatus: (reference) =>
        set((state) => {
          const next = { ...state.statusesByReference };
          delete next[reference];

          return {
            activeReference:
              state.activeReference === reference ? null : state.activeReference,
            statusesByReference: next,
          };
        }),

      clearAllStatuses: () =>
        set({
          activeReference: null,
          statusesByReference: {},
        }),
    }),
    {
      name: "status-store",
    },
  ),
);
