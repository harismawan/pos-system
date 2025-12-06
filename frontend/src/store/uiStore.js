/**
 * UI store
 * Manages UI state like modals, notifications, loading
 */

import { create } from 'zustand';

export const useUiStore = create((set) => ({
    isLoading: false,
    notification: null,

    setLoading: (loading) => set({ isLoading: loading }),

    showNotification: (message, type = 'info') => {
        set({ notification: { message, type } });
        setTimeout(() => {
            set({ notification: null });
        }, 3000);
    },

    clearNotification: () => set({ notification: null }),
}));
