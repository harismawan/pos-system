import apiClient from './client.js';

export async function getOutlets(params) {
    const response = await apiClient.get('/outlets', params);
    return response.data;
}

export async function getOutletById(id) {
    const response = await apiClient.get(`/outlets/${id}`);
    return response.data;
}

export async function createOutlet(data) {
    const response = await apiClient.post('/outlets', data);
    return response.data;
}

export async function updateOutlet(id, data) {
    const response = await apiClient.put(`/outlets/${id}`, data);
    return response.data;
}

export async function deleteOutlet(id) {
    const response = await apiClient.delete(`/outlets/${id}`);
    return response.data;
}

export async function getOutletUsers(id) {
    const response = await apiClient.get(`/outlets/${id}/users`);
    return response.data;
}

export async function assignUserToOutlet(id, userId) {
    const response = await apiClient.post(`/outlets/${id}/users`, { userId });
    return response.data;
}

export async function removeUserFromOutlet(outletId, userId) {
    const response = await apiClient.delete(`/outlets/${outletId}/users/${userId}`);
    return response.data;
}
