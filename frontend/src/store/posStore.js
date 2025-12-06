/**
 * POS store
 * Manages current POS order state
 */

import { create } from 'zustand';

export const usePosStore = create((set, get) => ({
    currentOrder: null,
    orderItems: [],
    customer: null,

    setCustomer: (customer) => set({ customer }),

    addItem: (product, quantity = 1) => {
        const items = get().orderItems;
        const existingIndex = items.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            const updated = [...items];
            updated[existingIndex].quantity += quantity;
            set({ orderItems: updated });
        } else {
            set({
                orderItems: [
                    ...items,
                    {
                        productId: product.id,
                        product,
                        quantity,
                        unitPrice: product.basePrice,
                        discountAmount: 0,
                    },
                ],
            });
        }
    },

    removeItem: (productId) => {
        set({
            orderItems: get().orderItems.filter(item => item.productId !== productId),
        });
    },

    updateItemQuantity: (productId, quantity) => {
        const items = get().orderItems;
        const updated = items.map(item =>
            item.productId === productId ? { ...item, quantity } : item
        );
        set({ orderItems: updated });
    },

    clearOrder: () => {
        set({
            currentOrder: null,
            orderItems: [],
            customer: null,
        });
    },

    getTotals: () => {
        const items = get().orderItems;

        const subtotal = items.reduce((sum, item) => {
            return sum + (item.unitPrice * item.quantity);
        }, 0);

        const tax = items.reduce((sum, item) => {
            const taxRate = item.product?.taxRate || 0;
            return sum + (item.unitPrice * item.quantity * taxRate / 100);
        }, 0);

        const discount = items.reduce((sum, item) => {
            return sum + (item.discountAmount || 0);
        }, 0);

        const total = subtotal + tax - discount;

        return {
            subtotal,
            tax,
            discount,
            total,
        };
    },
}));
