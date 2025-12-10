import apiClient from "./client.js";

// getSalesSummary removed - use getSalesTrend instead which provides same data plus comparison

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

export async function getSalesTrend(params = {}) {
  const response = await apiClient.get("/reports/sales-trend", params);
  return response.data;
}

export async function getHourlySalesHeatmap(params = {}) {
  const response = await apiClient.get("/reports/hourly-heatmap", params);
  return response.data;
}
