/**
 * Auth store
 * Manages authentication state and user info
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authApi from "../api/authApi.js";
import * as superAdminApi from "../api/superAdminApi.js";
import apiClient from "../api/client.js";
import { useOutletStore } from "./outletStore.js";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      outlets: [],
      isAuthenticated: false,

      // Impersonation state
      isImpersonating: false,
      originalUser: null,
      originalAccessToken: null,
      originalRefreshToken: null,

      login: async (username, password, options = {}) => {
        const data = await authApi.login(username, password, options);

        apiClient.setToken(data.accessToken);

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          outlets: data.outlets,
          isAuthenticated: true,
        });

        return data;
      },

      logout: async () => {
        try {
          const refreshToken = get().refreshToken;
          await authApi.logout(refreshToken);
        } catch (err) {
          console.error("Logout error:", err);
        }

        apiClient.setToken(null);
        apiClient.setOutlet(null);

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          outlets: [],
          isAuthenticated: false,
          // Clear impersonation state too
          isImpersonating: false,
          originalUser: null,
          originalAccessToken: null,
          originalRefreshToken: null,
        });
      },

      refreshAuth: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) throw new Error("No refresh token");

        const data = await authApi.refresh(refreshToken);

        apiClient.setToken(data.accessToken);

        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });

        return data;
      },

      setUser: (user) => set({ user }),

      // Start impersonating a user (Super Admin only)
      startImpersonation: async (userId) => {
        const state = get();

        // Store original Super Admin credentials
        const originalUser = state.user;
        const originalAccessToken = state.accessToken;
        const originalRefreshToken = state.refreshToken;

        // Get impersonation tokens from API
        const data = await superAdminApi.impersonateUser(userId);

        // Switch to impersonated user
        apiClient.setToken(data.accessToken);

        // Set active outlet if available
        if (data.outlets && data.outlets.length > 0) {
          const defaultOutlet =
            data.outlets.find((o) => o.isDefault) || data.outlets[0];
          useOutletStore.getState().setActiveOutlet(defaultOutlet);
        } else {
          useOutletStore.getState().clearActiveOutlet();
        }

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          outlets: data.outlets || [],
          isImpersonating: true,
          originalUser,
          originalAccessToken,
          originalRefreshToken,
        });

        return data;
      },

      // Stop impersonating and return to Super Admin
      stopImpersonation: () => {
        const state = get();

        if (!state.isImpersonating || !state.originalUser) {
          return;
        }

        // Restore Super Admin credentials
        apiClient.setToken(state.originalAccessToken);

        // Clear active outlet
        useOutletStore.getState().clearActiveOutlet();

        set({
          user: state.originalUser,
          accessToken: state.originalAccessToken,
          refreshToken: state.originalRefreshToken,
          outlets: [],
          isImpersonating: false,
          originalUser: null,
          originalAccessToken: null,
          originalRefreshToken: null,
        });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
