import apiClient from './client.js';

export async function getSuppliers(params) {
    const response = await apiClient.get('/suppliers', params);
    return response.data;
}

export async function getSupplierById(id) {
    const response = await apiClient.get(`/suppliers/${id}`);
    return response.data;
}

export async function createSupplier(data) {
    const response = await apiClient.post('/suppliers', data);
    return response.data;
}

export async function updateSupplier(id, data) {
    const response = await apiClient.put(`/suppliers/${id}`, data);
    return response.data;
}

export async function deleteSupplier(id) {
    const response = await apiClient.delete(`/suppliers/${id}`);
    return response.data;
}
