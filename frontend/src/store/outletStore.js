/**
 * Outlet store
 * Manages active outlet selection
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import apiClient from "../api/client.js";

export const useOutletStore = create(
  persist(
    (set, get) => ({
      activeOutlet: null,

      setActiveOutlet: (outlet) => {
        apiClient.setOutlet(outlet?.id || null);
        set({ activeOutlet: outlet });
      },

      clearActiveOutlet: () => {
        apiClient.setOutlet(null);
        set({ activeOutlet: null });
      },
    }),
    {
      name: "outlet-storage",
    },
  ),
);
