import apiClient from './client.js';

export async function getPriceQuote(productId, outletId, customerId = null) {
    const params = { productId, outletId };
    if (customerId) params.customerId = customerId;

    const response = await apiClient.get('/pricing/quote', params);
    return response.data;
}

export async function getPriceTiers() {
    const response = await apiClient.get('/pricing/tiers');
    return response.data;
}

export async function createPriceTier(data) {
    const response = await apiClient.post('/pricing/tiers', data);
    return response.data;
}
