import { create } from "zustand";

type ReportlyStore = {
  reportType: string;
  reporterName: string;
  reporterPhoneNumber: string;
  reporterWalletAddress: string;
  fraudsterWalletAddress: string;
  descriptionNote: string;
  reportId: string;
  setReportType: (val: string) => void;
  setReporterName: (val: string) => void;
  setReporterPhoneNumber: (val: string) => void;
  setReporterWalletAddress: (val: string) => void;
  setFraudsterWalletAddress: (val: string) => void;
  setDescriptionNote: (val: string) => void;
  setReportId: (val: string) => void;
  reset: () => void;
};

const initialState = {
  reportType: "",
  reporterName: "",
  reporterPhoneNumber: "",
  reporterWalletAddress: "",
  fraudsterWalletAddress: "",
  descriptionNote: "",
  reportId: "",
};

export const useReportlyStore = create<ReportlyStore>((set) => ({
  ...initialState,
  setReportType: (val) => set({ reportType: val }),
  setReporterName: (val) => set({ reporterName: val }),
  setReporterPhoneNumber: (val) => set({ reporterPhoneNumber: val }),
  setReporterWalletAddress: (val) => set({ reporterWalletAddress: val }),
  setFraudsterWalletAddress: (val) => set({ fraudsterWalletAddress: val }),
  setDescriptionNote: (val) => set({ descriptionNote: val }),
  setReportId: (val) => set({ reportId: val }),
  reset: () => set(initialState),
}));
