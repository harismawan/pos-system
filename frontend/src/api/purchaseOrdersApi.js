import apiClient from "./client.js";

export async function getPurchaseOrders(params) {
  const response = await apiClient.get("/purchase-orders", params);
  return response.data;
}

export async function getPurchaseOrderById(id) {
  const response = await apiClient.get(`/purchase-orders/${id}`);
  return response.data;
}

export async function createPurchaseOrder(data) {
  const response = await apiClient.post("/purchase-orders", data);
  return response.data;
}

export async function updatePurchaseOrder(id, data) {
  const response = await apiClient.put(`/purchase-orders/${id}`, data);
  return response.data;
}

export async function receivePurchaseOrder(id, items) {
  const response = await apiClient.post(`/purchase-orders/${id}/receive`, {
    items,
  });
  return response.data;
}

export async function cancelPurchaseOrder(id) {
  const response = await apiClient.post(`/purchase-orders/${id}/cancel`);
  return response.data;
}
