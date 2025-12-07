/**
 * Pricing routes
 */

import { Elysia } from "elysia";
import * as pricingController from "./pricing.controller.js";
import * as pricingSchemas from "./pricing.schemas.js";
import { authMiddleware } from "../../libs/auth.js";
import { requirePermission, PERMISSIONS } from "../../libs/permissions.js";
import { withRequestLogger } from "../../libs/requestLogger.js";

export const pricingRoutes = new Elysia({ prefix: "/pricing" })
  .use(withRequestLogger())
  .get("/quote", pricingController.getPriceQuoteController, {
    // Price quotes needed for POS, so allow POS access
    beforeHandle: [authMiddleware, requirePermission(PERMISSIONS.POS_ACCESS)],
    ...pricingSchemas.getPriceQuoteQuerySchema,
  })
  .get("/tiers", pricingController.getPriceTiersController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_PRICING),
    ],
    ...pricingSchemas.getPriceTiersQuerySchema,
  })
  .post("/tiers", pricingController.createPriceTierController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_PRICING),
    ],
    ...pricingSchemas.createPriceTierBodySchema,
  })
  .put("/tiers/:id", pricingController.updatePriceTierController, {
    beforeHandle: [
      authMiddleware,
      requirePermission(PERMISSIONS.SETTINGS_PRICING),
    ],
    ...pricingSchemas.updatePriceTierBodySchema,
  })
  .get(
    "/products/:productId/prices",
    pricingController.getProductPricesController,
    {
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SETTINGS_PRICING),
      ],
      ...pricingSchemas.productIdParamSchema,
    },
  )
  .post(
    "/products/:productId/prices",
    pricingController.setProductPriceController,
    {
      beforeHandle: [
        authMiddleware,
        requirePermission(PERMISSIONS.SETTINGS_PRICING),
      ],
      ...pricingSchemas.setProductPriceBodySchema,
    },
  );
