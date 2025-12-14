/**
 * Super Admin API client
 */

import apiClient from "./client.js";

// ============================================
// DASHBOARD
// ============================================

export async function getDashboard() {
  const response = await apiClient.get("/super-admin/dashboard");
  return response.data;
}

// ============================================
// BUSINESS MANAGEMENT
// ============================================

export async function getBusinesses(params = {}) {
  const response = await apiClient.get("/super-admin/businesses", params);
  return response.data;
}

export async function getBusinessById(id) {
  const response = await apiClient.get(`/super-admin/businesses/${id}`);
  return response.data;
}

export async function updateBusinessStatus(id, status) {
  const response = await apiClient.put(`/super-admin/businesses/${id}/status`, {
    status,
  });
  return response.data;
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function getAllUsers(params = {}) {
  const response = await apiClient.get("/super-admin/users", params);
  return response.data;
}

export async function getUserById(id) {
  const response = await apiClient.get(`/super-admin/users/${id}`);
  return response.data;
}

export async function forcePasswordReset(id, newPassword) {
  const response = await apiClient.put(
    `/super-admin/users/${id}/reset-password`,
    { newPassword },
  );
  return response.data;
}

export async function updateUserStatus(id, isActive) {
  const response = await apiClient.put(`/super-admin/users/${id}/status`, {
    isActive,
  });
  return response.data;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function getUserSessions(userId) {
  const response = await apiClient.get(`/super-admin/users/${userId}/sessions`);
  return response.data;
}

export async function revokeAllSessions(userId) {
  const response = await apiClient.delete(
    `/super-admin/users/${userId}/sessions`,
  );
  return response.data;
}

export async function revokeSession(userId, sessionId) {
  const response = await apiClient.delete(
    `/super-admin/users/${userId}/sessions/${sessionId}`,
  );
  return response.data;
}

// ============================================
// IMPERSONATION
// ============================================

export async function impersonateUser(userId) {
  const response = await apiClient.post(
    `/super-admin/users/${userId}/impersonate`,
  );
  return response.data;
}
