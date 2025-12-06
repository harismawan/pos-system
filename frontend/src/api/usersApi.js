/**
 * Users API client
 */

import apiClient from './apiClient.js';

/**
 * Get users with pagination and filters
 */
export async function getUsers(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    if (params.role) searchParams.append('role', params.role);
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive);

    const query = searchParams.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);
    return response.data;
}

/**
 * Get user by ID
 */
export async function getUserById(id) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
}

/**
 * Create a new user
 */
export async function createUser(data) {
    const response = await apiClient.post('/users', data);
    return response.data;
}

/**
 * Update user
 */
export async function updateUser(id, data) {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
}

/**
 * Delete (deactivate) user
 */
export async function deleteUser(id) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
}

/**
 * Assign user to outlet
 */
export async function assignUserToOutlet(userId, data) {
    const response = await apiClient.post(`/users/${userId}/outlets`, data);
    return response.data;
}

/**
 * Remove user from outlet
 */
export async function removeUserFromOutlet(userId, outletId) {
    const response = await apiClient.delete(`/users/${userId}/outlets/${outletId}`);
    return response.data;
}
