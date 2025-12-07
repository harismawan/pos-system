import apiClient from "./client.js";

export async function getWarehouses(params) {
  const response = await apiClient.get("/warehouses", params);
  return response.data;
}

export async function getWarehouseById(id) {
  const response = await apiClient.get(`/warehouses/${id}`);
  return response.data;
}

export async function createWarehouse(data) {
  const response = await apiClient.post("/warehouses", data);
  return response.data;
}

export async function updateWarehouse(id, data) {
  const response = await apiClient.put(`/warehouses/${id}`, data);
  return response.data;
}

export async function deleteWarehouse(id) {
  const response = await apiClient.delete(`/warehouses/${id}`);
  return response.data;
}

export async function getWarehouseInventory(id, params) {
  const response = await apiClient.get(`/warehouses/${id}/inventory`, params);
  return response.data;
}
