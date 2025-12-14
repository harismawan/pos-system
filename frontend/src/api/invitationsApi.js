/**
 * Invitations API client
 */

import apiClient from "./client.js";

/**
 * Get invitations for current business
 */
export async function getInvitations(params = {}) {
  const response = await apiClient.get("/invitations", params);
  return response.data;
}

/**
 * Create a new invitation
 */
export async function createInvitation(data) {
  const response = await apiClient.post("/invitations", data);
  return response.data;
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(id) {
  const response = await apiClient.delete(`/invitations/${id}`);
  return response.data;
}

/**
 * Resend invitation email
 */
export async function resendInvitation(id) {
  const response = await apiClient.post(`/invitations/${id}/resend`);
  return response.data;
}

/**
 * Verify invitation token (public)
 */
export async function verifyInvitation(token) {
  const response = await apiClient.get(`/invitations/verify/${token}`);
  return response.data;
}

/**
 * Accept invitation (public)
 */
export async function acceptInvitation(data) {
  const response = await apiClient.post("/invitations/accept", data);
  return response.data;
}
