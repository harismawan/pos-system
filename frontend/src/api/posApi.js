import apiClient from './client.js';

export async function createPosOrder(data) {
    const response = await apiClient.post('/sales/orders', data);
    return response.data;
}

export async function getPosOrders(params) {
    const response = await apiClient.get('/sales/orders', params);
    return response.data;
}

export async function getPosOrderById(id) {
    const response = await apiClient.get(`/sales/orders/${id}`);
    return response.data;
}

export async function completePosOrder(id) {
    const response = await apiClient.post(`/sales/orders/${id}/complete`, {});
    return response.data;
}

export async function cancelPosOrder(id) {
    const response = await apiClient.post(`/sales/orders/${id}/cancel`, {});
    return response.data;
}

export async function addPayment(orderId, paymentData) {
    const response = await apiClient.post(`/sales/orders/${orderId}/payments`, paymentData);
    return response.data;
}
