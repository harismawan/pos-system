/**
 * Users API client
 */

import apiClient from "./client.js";

/**
 * Get users with pagination and filters
 */
export async function getUsers(params = {}) {
  const response = await apiClient.get("/users", params);
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
  const response = await apiClient.post("/users", data);
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
  const response = await apiClient.delete(
    `/users/${userId}/outlets/${outletId}`,
  );
  return response.data;
}
