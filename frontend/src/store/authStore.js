/**
 * Auth store
 * Manages authentication state and user info
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '../api/authApi.js';
import apiClient from '../api/client.js';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            outlets: [],
            isAuthenticated: false,

            login: async (username, password) => {
                const data = await authApi.login(username, password);

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
                    await authApi.logout();
                } catch (err) {
                    console.error('Logout error:', err);
                }

                apiClient.setToken(null);
                apiClient.setOutlet(null);

                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    outlets: [],
                    isAuthenticated: false,
                });
            },

            refreshAuth: async () => {
                const refreshToken = get().refreshToken;
                if (!refreshToken) throw new Error('No refresh token');

                const data = await authApi.refresh(refreshToken);

                apiClient.setToken(data.accessToken);

                set({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                });

                return data;
            },

            setUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
