# Unused API Endpoints

Scan Date: 2025-12-13

The following backend API endpoints were identified as unused by the frontend application during a codebase scan.

## Module: Pricing

Reference: `backend/src/modules/pricing/pricing.routes.js`

- **`PUT /pricing/tiers/:id`**
  - **Function**: `updatePriceTierController`
  - **Description**: Updates an existing price tier.
  - **Status**: defined in backend routes but not present in `frontend/src/api/pricingApi.js`.

- **`GET /pricing/products/:productId/prices`**
  - **Function**: `getProductPricesController`
  - **Description**: Retrieves pricing details for a specific product.
  - **Status**: defined in backend routes but not present in `frontend/src/api/pricingApi.js`.

- **`POST /pricing/products/:productId/prices`**
  - **Function**: `setProductPriceController`
  - **Description**: Sets or updates the price of a product for a specific tier.
  - **Status**: defined in backend routes but not present in `frontend/src/api/pricingApi.js`.

## Recommendation

Consider deprecating or removing these endpoints if they are not intended for external use, or implementing the corresponding frontend features if they are missing (e.g., UI for managing price tiers or per-product pricing).
