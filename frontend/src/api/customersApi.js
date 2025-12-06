import apiClient from './client.js';

export async function getCustomers(params) {
    const response = await apiClient.get('/customers', params);
    return response.data;
}

export async function getCustomerById(id) {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
}

export async function createCustomer(data) {
    const response = await apiClient.post('/customers', data);
    return response.data;
}

export async function updateCustomer(id, data) {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data;
}

export async function deleteCustomer(id) {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
}
