/**
 * Printer Store
 * Zustand store for printer settings and state
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePrinterStore = create(
  persist(
    (set, get) => ({
      // Settings (persisted)
      autoPrint: false,
      paperWidth: 48, // Characters per line (48 for 80mm, 32 for 58mm)
      openCashDrawer: false,
      cutPaper: true,

      // Connection state (not persisted)
      isConnected: false,
      connectionType: "none",
      deviceName: null,

      // Actions
      setAutoPrint: (enabled) => set({ autoPrint: enabled }),
      setPaperWidth: (width) => set({ paperWidth: width }),
      setOpenCashDrawer: (enabled) => set({ openCashDrawer: enabled }),
      setCutPaper: (enabled) => set({ cutPaper: enabled }),

      updateConnectionStatus: (status) =>
        set({
          isConnected: status.connected,
          connectionType: status.connectionType,
          deviceName: status.deviceName,
        }),

      clearConnection: () =>
        set({
          isConnected: false,
          connectionType: "none",
          deviceName: null,
        }),

      // Get print options for receipt generation
      getPrintOptions: () => {
        const state = get();
        return {
          paperWidth: state.paperWidth,
          cutPaper: state.cutPaper,
          openDrawer: state.openCashDrawer,
        };
      },
    }),
    {
      name: "printer-settings",
      partialize: (state) => ({
        autoPrint: state.autoPrint,
        paperWidth: state.paperWidth,
        openCashDrawer: state.openCashDrawer,
        cutPaper: state.cutPaper,
      }),
    },
  ),
);
