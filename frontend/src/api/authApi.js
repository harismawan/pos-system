import apiClient from "./client.js";

export async function login(username, password) {
  const response = await apiClient.post("/auth/login", { username, password });
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
