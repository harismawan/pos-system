/**
 * Reports controller
 */

import * as reportsService from "./reports.service.js";
import { REP } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import logger from "../../libs/logger.js";

export async function getTopProductsController({ query, store, set }) {
  try {
    const outletId = store.outletId || query.outletId;
    const result = await reportsService.getTopProducts({ ...query, outletId });

    return successResponse(REP.TOP_PRODUCTS_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get top products failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(REP.REPORT_FAILED, message);
  }
}

export async function getInventoryValuationController({ query, set }) {
  try {
    const result = await reportsService.getInventoryValuation(query);

    return successResponse(REP.INVENTORY_VALUATION_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get inventory valuation failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(REP.REPORT_FAILED, message);
  }
}

export async function getStockMovementsController({ query, store, set }) {
  try {
    const outletId = store.outletId || query.outletId;
    const result = await reportsService.getStockMovementReport({
      ...query,
      outletId,
    });

    return successResponse(REP.STOCK_MOVEMENTS_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get stock movements failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(REP.REPORT_FAILED, message);
  }
}

export async function getOrderHistoryController({ query, store, set }) {
  try {
    const outletId = store.outletId || query.outletId;
    const result = await reportsService.getOrderHistory({ ...query, outletId });

    return successResponse(REP.ORDER_HISTORY_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get order history failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(REP.REPORT_FAILED, message);
  }
}

export async function getSalesTrendController({ query, store, set }) {
  try {
    const outletId = store.outletId || query.outletId;
    const result = await reportsService.getSalesTrend({ ...query, outletId });

    return successResponse(REP.SALES_TREND_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get sales trend failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(REP.REPORT_FAILED, message);
  }
}

export async function getHourlySalesHeatmapController({ query, store, set }) {
  try {
    const outletId = store.outletId || query.outletId;
    const result = await reportsService.getHourlySalesHeatmap({
      ...query,
      outletId,
    });

    return successResponse(REP.HEATMAP_SUCCESS, result);
  } catch (err) {
    logger.error({ err }, "Get hourly sales heatmap failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(REP.REPORT_FAILED, message);
  }
}
