import apiClient from './client.js';

export async function createPosOrder(data) {
    const response = await apiClient.post('/pos/orders', data);
    return response.data;
}

export async function getPosOrders(params) {
    const response = await apiClient.get('/pos/orders', params);
    return response.data;
}

export async function getPosOrderById(id) {
    const response = await apiClient.get(`/pos/orders/${id}`);
    return response.data;
}

export async function completePosOrder(id) {
    const response = await apiClient.post(`/pos/orders/${id}/complete`, {});
    return response.data;
}

export async function cancelPosOrder(id) {
    const response = await apiClient.post(`/pos/orders/${id}/cancel`, {});
    return response.data;
}

export async function addPayment(orderId, paymentData) {
    const response = await apiClient.post(`/pos/orders/${orderId}/payments`, paymentData);
    return response.data;
}
