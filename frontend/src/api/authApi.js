import apiClient from "./client.js";

export async function login(username, password, options = {}) {
  const response = await apiClient.post(
    "/auth/login",
    { username, password },
    options,
  );
  return response.data;
}

export async function refresh(refreshToken) {
  const response = await apiClient.post("/auth/refresh", { refreshToken });
  return response.data;
}

export async function logout() {
  const response = await apiClient.post("/auth/logout", {});
  return response.data;
}

export async function getMe() {
  const response = await apiClient.get("/auth/me");
  return response.data;
}

export async function forgotPassword(email, options = {}) {
  const response = await apiClient.post(
    "/auth/forgot-password",
    { email },
    options,
  );
  return response.data;
}

export async function resetPassword(token, newPassword) {
  const response = await apiClient.post("/auth/reset-password", {
    token,
    newPassword,
  });
  return response.data;
}

export async function changePassword(currentPassword, newPassword) {
  const response = await apiClient.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
}

export const authApi = {
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
