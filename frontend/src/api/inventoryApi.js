import apiClient from './client.js';

export async function getInventory(params) {
    const response = await apiClient.get('/inventory', params);
    return response.data;
}

export async function adjustInventory(data) {
    const response = await apiClient.post('/inventory/adjust', data);
    return response.data;
}

export async function transferInventory(data) {
    const response = await apiClient.post('/inventory/transfer', data);
    return response.data;
}

export async function getStockMovements(params) {
    const response = await apiClient.get('/inventory/movements', params);
    return response.data;
}
