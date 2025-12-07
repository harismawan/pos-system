import apiClient from "./client.js";

export async function getSalesSummary(params = {}) {
  const response = await apiClient.get("/reports/sales-summary", params);
  return response.data;
}

export async function getTopProducts(params = {}) {
  const response = await apiClient.get("/reports/top-products", params);
  return response.data;
}

export async function getInventoryValuation(params = {}) {
  const response = await apiClient.get("/reports/inventory-valuation", params);
  return response.data;
}

export async function getStockMovements(params = {}) {
  const response = await apiClient.get("/reports/stock-movements", params);
  return response.data;
}

export async function getOrderHistory(params = {}) {
  const response = await apiClient.get("/reports/order-history", params);
  return response.data;
}
