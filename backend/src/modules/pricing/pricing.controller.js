/**
 * Pricing controller
 */

import * as pricingService from "./pricing.service.js";
import logger from "../../libs/logger.js";
import { PRC } from "../../libs/responseCodes.js";
import { successResponse, errorResponse } from "../../libs/responses.js";
import { enqueueAuditLogJob, createAuditLogData } from "../../libs/jobs.js";
import {
  AUDIT_EVENT_TYPES,
  AUDIT_ENTITY_TYPES,
} from "../../libs/auditConstants.js";

export async function getPriceQuoteController({ query, store, set }) {
  try {
    const { productId, customerId } = query;
    const outletId = store.outletId || query.outletId;
    const businessId = store.user.businessId;

    if (!productId || !outletId) {
      set.status = 400;
      return errorResponse(
        PRC.MISSING_PARAMS,
        "productId and outletId are required",
      );
    }

    const quote = await pricingService.resolvePrice(
      productId,
      outletId,
      customerId,
      businessId,
    );

    return successResponse(PRC.QUOTE_SUCCESS, quote);
  } catch (err) {
    logger.error({ err }, "Get price quote failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRC.QUOTE_FAILED, message);
  }
}

export async function getPriceTiersController({ store, set }) {
  try {
    const businessId = store.user.businessId;
    const tiers = await pricingService.getPriceTiers(businessId);

    return successResponse(PRC.LIST_TIERS_SUCCESS, tiers);
  } catch (err) {
    logger.error({ err }, "Get price tiers failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRC.LIST_TIERS_FAILED, message);
  }
}

export async function createPriceTierController({ body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const tier = await pricingService.createPriceTier(body, businessId);

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.PRICE_TIER_CREATED,
        outletId: null,
        entityType: AUDIT_ENTITY_TYPES.PRICE_TIER,
        entityId: tier.id,
        payload: {
          name: tier.name,
          code: tier.code,
        },
      }),
    );

    set.status = 201;
    return successResponse(PRC.CREATE_TIER_SUCCESS, tier);
  } catch (err) {
    logger.error({ err }, "Create price tier failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRC.CREATE_TIER_FAILED, message);
  }
}

export async function updatePriceTierController({ params, body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const tier = await pricingService.updatePriceTier(
      params.id,
      body,
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.PRICE_TIER_UPDATED,
        outletId: null,
        entityType: AUDIT_ENTITY_TYPES.PRICE_TIER,
        entityId: params.id,
        payload: {
          name: tier.name,
          code: tier.code,
        },
      }),
    );

    return successResponse(PRC.UPDATE_TIER_SUCCESS, tier);
  } catch (err) {
    logger.error({ err }, "Update price tier failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRC.UPDATE_TIER_FAILED, message);
  }
}

export async function getProductPricesController({ params, store, set }) {
  try {
    const businessId = store.user.businessId;
    const prices = await pricingService.getProductPrices(
      params.productId,
      businessId,
    );

    return successResponse(PRC.GET_PRICES_SUCCESS, prices);
  } catch (err) {
    logger.error({ err }, "Get product prices failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRC.GET_PRICES_FAILED, message);
  }
}

export async function setProductPriceController({ params, body, store, set }) {
  try {
    const businessId = store.user.businessId;
    const price = await pricingService.setProductPrice(
      {
        productId: params.productId,
        ...body,
      },
      businessId,
    );

    // Audit Log
    enqueueAuditLogJob(
      createAuditLogData(store, {
        eventType: AUDIT_EVENT_TYPES.PRODUCT_PRICE_SET,
        outletId: body.outletId || null,
        entityType: AUDIT_ENTITY_TYPES.PRODUCT_PRICE_TIER,
        entityId: `${params.productId}-${body.priceTierId}-${body.outletId || "global"}`,
        payload: {
          productId: params.productId,
          priceTierId: body.priceTierId,
          price: body.price,
        },
      }),
    );

    return successResponse(PRC.SET_PRICE_SUCCESS, price);
  } catch (err) {
    logger.error({ err }, "Set product price failed");
    set.status = err.statusCode || 500;
    const message = set.status === 500 ? "Internal Server Error" : err.message;
    return errorResponse(PRC.SET_PRICE_FAILED, message);
  }
}
