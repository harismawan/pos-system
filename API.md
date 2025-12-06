# POS System API Documentation

Complete API reference for the POS System backend.

**Base URL**: `http://localhost:3000/api`

**Authentication**: Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

**Multi-Outlet Context**: Include `X-Outlet-Id` header to specify the active outlet for operations.

---

## Table of Contents

- [Authentication](#authentication)
- [Products](#products)
- [Pricing](#pricing)
- [Customers](#customers)
- [Outlets](#outlets)
- [Warehouses](#warehouses)
- [Inventory](#inventory)
- [Suppliers](#suppliers)
- [Purchase Orders](#purchase-orders)
- [POS / Sales](#pos--sales)

---

## Authentication

### POST /auth/login

Login with username and password.

**Request Body:**
```json
{
  "username": "owner",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clx...",
      "username": "owner",
      "name": "System Owner",
      "email": "owner@pos-system.local",
      "role": "OWNER"
    },
    "outlets": [
      {
        "id": "clx...",
        "name": "Main Outlet",
        "code": "MAIN",
        "role": "MANAGER",
        "isDefault": true
      }
    ]
  }
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /auth/logout

Logout (invalidate tokens on client side).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me

Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "username": "owner",
    "name": "System Owner",
    "email": "owner@pos-system.local",
    "role": "OWNER",
    "outlets": [...]
  }
}
```

---

## Products

### GET /products

List products with optional filters and pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `search` (string, optional) - Search by SKU, name, or barcode
- `category` (string, optional) - Filter by category
- `isActive` (boolean, optional) - Filter by active status
- `outletId` (string, optional) - Filter inventory by outlet
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "clx...",
        "sku": "PROD-001",
        "barcode": "1234567890001",
        "name": "Sample Product 1",
        "description": "This is a sample product",
        "category": "Electronics",
        "unit": "pcs",
        "basePrice": "100000.00",
        "costPrice": "75000.00",
        "taxRate": "11.00",
        "isActive": true,
        "createdAt": "2025-12-06T...",
        "updatedAt": "2025-12-06T...",
        "inventories": [...]
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

### GET /products/:id

Get product by ID with full details.

**Headers:** `Authorization: Bearer <token>`

**Response:** Single product object with inventories and price tiers.

### POST /products

Create a new product.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "sku": "PROD-004",
  "barcode": "1234567890004",
  "name": "New Product",
  "description": "Product description",
  "category": "Electronics",
  "unit": "pcs",
  "basePrice": 150000,
  "costPrice": 100000,
  "taxRate": 11,
  "isActive": true
}
```

**Response:** Created product object.

### PUT /products/:id

Update an existing product.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as POST (partial updates allowed).

**Response:** Updated product object.

### DELETE /products/:id

Soft delete a product (sets `isActive` to false).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Product deactivated successfully"
  }
}
```

---

## Pricing

### GET /pricing/quote

Get price quote for a product based on outlet and customer.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `productId` (string, required)
- `outletId` (string, required)
- `customerId` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "clx...",
    "productName": "Sample Product 1",
    "effectivePrice": 90000,
    "basePrice": 100000,
    "costPrice": 75000,
    "taxRate": 11,
    "priceTier": {
      "id": "clx...",
      "name": "Wholesale",
      "code": "WHOLESALE"
    },
    "tierSource": "customer",
    "priceSource": "outlet_tier_price"
  }
}
```

### GET /pricing/tiers

List all price tiers.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "Retail",
      "code": "RETAIL",
      "description": "Standard retail pricing",
      "isDefault": true,
      "createdAt": "2025-12-06T...",
      "updatedAt": "2025-12-06T..."
    }
  ]
}
```

### POST /pricing/tiers

Create a new price tier.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "VIP",
  "code": "VIP",
  "description": "VIP customer pricing",
  "isDefault": false
}
```

### PUT /pricing/tiers/:id

Update a price tier.

### GET /pricing/products/:productId/prices

Get all price tier prices for a product.

### POST /pricing/products/:productId/prices

Set a price for a product in a specific tier.

**Request Body:**
```json
{
  "priceTierId": "clx...",
  "outletId": "clx...",  // null for global
  "price": 95000
}
```

---

## Customers

### GET /customers

List customers with filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `search` (string) - Search by name, email, or phone
- `priceTierId` (string) - Filter by price tier
- `isMember` (boolean) - Filter by membership status
- `page`, `limit`

### GET /customers/:id

Get customer by ID with order history.

### POST /customers

Create a new customer.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+62 812 3456 7890",
  "addressLine1": "123 Street",
  "city": "Jakarta",
  "priceTierId": "clx...",
  "isMember": true,
  "notes": "VIP customer"
}
```

### PUT /customers/:id

Update customer.

### DELETE /customers/:id

Delete customer (fails if customer has orders).

---

## Outlets

### GET /outlets

List all outlets.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `isActive` (boolean)
- `page`, `limit`

### GET /outlets/:id

Get outlet by ID with users and warehouses.

### POST /outlets

Create a new outlet.

**Request Body:**
```json
{
  "name": "Branch 2",
  "code": "BR02",
  "addressLine1": "456 Avenue",
  "city": "Jakarta",
  "phone": "+62 21 9876543",
  "defaultPriceTierId": "clx...",
  "isActive": true
}
```

### PUT /outlets/:id

Update outlet.

### DELETE /outlets/:id

Delete outlet (fails if outlet has orders).

### GET /outlets/:id/users

Get users assigned to an outlet.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "userId": "clx...",
      "outletId": "clx...",
      "outletRole": "CASHIER",
      "isDefaultForUser": false,
      "user": {
        "id": "clx...",
        "name": "Jane Doe",
        "username": "jane",
        "email": "jane@example.com",
        "role": "CASHIER"
      }
    }
  ]
}
```

### POST /outlets/:id/users

Assign a user to an outlet.

**Request Body:**
```json
{
  "userId": "clx...",
  "outletRole": "CASHIER",
  "isDefaultForUser": false
}
```

### DELETE /outlets/:id/users/:userId

Remove a user from an outlet.

---

## Warehouses

### GET /warehouses

List warehouses.

**Query Parameters:**
- `outletId` (string) - Filter by outlet
- `type` (enum: CENTRAL, OUTLET)
- `isActive` (boolean)
- `page`, `limit`

### GET /warehouses/:id

Get warehouse by ID with inventory.

### POST /warehouses

Create a new warehouse.

**Request Body:**
```json
{
  "outletId": "clx...",
  "name": "Main Warehouse",
  "code": "WH-MAIN",
  "addressLine1": "789 Warehouse St",
  "type": "OUTLET",
  "isDefault": true,
  "isActive": true
}
```

### PUT /warehouses/:id

Update warehouse.

### DELETE /warehouses/:id

Delete warehouse (fails if warehouse has inventory).

### GET /warehouses/:id/inventory

Get inventory for a specific warehouse.

**Query Parameters:**
- `lowStock` (boolean) - Filter low stock items
- `page`, `limit`

---

## Inventory

### GET /inventory

Get inventory across warehouses.

**Headers:** `Authorization: Bearer <token>`, `X-Outlet-Id: <outletId>`

**Query Parameters:**
- `productId` (string)
- `warehouseId` (string)
- `outletId` (string)
- `lowStock` (boolean)
- `page`, `limit`

**Response:**
```json
{
  "success": true,
  "data": {
    "inventories": [
      {
        "id": "clx...",
        "productId": "clx...",
        "warehouseId": "clx...",
        "quantityOnHand": "100.00",
        "minimumStock": "10.00",
        "maximumStock": "500.00",
        "product": {...},
        "warehouse": {...}
      }
    ],
    "pagination": {...}
  }
}
```

### POST /inventory/adjust

Adjust inventory quantity (in or out).

**Request Body:**
```json
{
  "productId": "clx...",
  "warehouseId": "clx...",
  "outletId": "clx...",
  "type": "ADJUSTMENT_IN",  // or ADJUSTMENT_OUT
  "quantity": 50,
  "notes": "Received damaged goods return"
}
```

### POST /inventory/transfer

Transfer inventory between warehouses.

**Request Body:**
```json
{
  "productId": "clx...",
  "fromWarehouseId": "clx...",
  "toWarehouseId": "clx...",
  "outletId": "clx...",
  "quantity": 20,
  "notes": "Stock rebalancing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "source": {...},
    "destination": {...}
  }
}
```

### GET /inventory/movements

Get stock movement history.

**Query Parameters:**
- `productId`, `warehouseId`, `outletId`
- `type` (enum: PURCHASE, SALE, TRANSFER, ADJUSTMENT_IN, ADJUSTMENT_OUT)
- `page`, `limit`

---

## Suppliers

### GET /suppliers

List suppliers.

**Query Parameters:**
- `search` (string) - Search by name, contact, or email
- `isActive` (boolean)
- `page`, `limit`

### GET /suppliers/:id

Get supplier by ID with purchase order history.

### POST /suppliers

Create a new supplier.

**Request Body:**
```json
{
  "name": "ABC Suppliers Inc.",
  "contactPerson": "Jane Smith",
  "email": "supplier@abc.com",
  "phone": "+62 21 9876 5432",
  "addressLine1": "789 Supplier Ave",
  "city": "Jakarta",
  "isActive": true
}
```

### PUT /suppliers/:id

Update supplier.

### DELETE /suppliers/:id

Delete supplier (fails if supplier has purchase orders).

---

## Purchase Orders

### GET /purchase-orders

List purchase orders.

**Headers:** `Authorization: Bearer <token>`, `X-Outlet-Id: <outletId>`

**Query Parameters:**
- `supplierId`, `warehouseId`, `outletId`
- `status` (enum: DRAFT, ORDERED, RECEIVED, CANCELLED)
- `page`, `limit`

### GET /purchase-orders/:id

Get purchase order by ID with full details.

### POST /purchase-orders

Create a new purchase order.

**Request Body:**
```json
{
  "supplierId": "clx...",
  "warehouseId": "clx...",
  "outletId": "clx...",
  "expectedDate": "2025-12-15",
  "notes": "Quarterly restock",
  "items": [
    {
      "productId": "clx...",
      "quantity": 100,
      "unitCost": 70000
    },
    {
      "productId": "clx...",
      "quantity": 50,
      "unitCost": 25000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "orderNumber": "PO-MAIN-20251206-1234",
    "status": "DRAFT",
    "totalAmount": "8250000.00",
    "supplier": {...},
    "warehouse": {...},
    "items": [...]
  }
}
```

### PUT /purchase-orders/:id

Update a draft purchase order.

### POST /purchase-orders/:id/receive

Receive goods from a purchase order (updates inventory).

**Request Body:**
```json
{
  "receivedItems": [
    {
      "itemId": "clx...",
      "quantity": 100
    },
    {
      "itemId": "clx...",
      "quantity": 45
    }
  ]
}
```

**Response:** Updated purchase order with status RECEIVED.

**Side Effects:**
- Updates inventory quantities
- Creates stock movements (type: PURCHASE)
- Enqueues audit log job

### POST /purchase-orders/:id/cancel

Cancel a purchase order.

**Response:** Purchase order with status CANCELLED.

---

## POS / Sales

### POST /pos/orders

Create a new POS order.

**Headers:** `Authorization: Bearer <token>`, `X-Outlet-Id: <outletId>`

**Request Body:**
```json
{
  "outletId": "clx...",
  "warehouseId": "clx...",
  "registerId": "clx...",
  "customerId": "clx...",
  "notes": "Customer wants gift wrapping",
  "items": [
    {
      "productId": "clx...",
      "quantity": 2,
      "discountAmount": 5000
    }
  ]
}
```

**Response:** Created order with calculated totals.

### GET /pos/orders

List POS orders.

**Query Parameters:**
- `outletId`, `customerId`, `cashierId`
- `status` (enum: OPEN, COMPLETED, CANCELLED)
- `page`, `limit`

### GET /pos/orders/:id

Get POS order by ID.

### POST /pos/orders/:id/complete

Complete a POS order (must be fully paid).

**Response:** Completed order.

**Side Effects:**
- Updates order status to COMPLETED
- Decreases inventory quantities
- Creates stock movements (type: SALE)
- Enqueues audit log job
- Enqueues email notification job (if customer has email)

### POST /pos/orders/:id/cancel

Cancel a POS order.

### POST /pos/orders/:id/payments

Add a payment to an order.

**Request Body:**
```json
{
  "method": "CASH",  // CASH, CARD, E_WALLET, BANK_TRANSFER
  "amount": 200000,
  "reference": "TXN-12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {...},
    "order": {
      "paymentStatus": "PAID"  // UNPAID, PARTIAL, PAID
    }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation error, business logic error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Pagination

All list endpoints support pagination:

**Request:**
```
GET /api/products?page=2&limit=20
```

**Response:**
```json
{
  "data": {
    "products": [...],
    "pagination": {
      "total": 150,
      "page": 2,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

---

## Background Jobs

The following operations enqueue background jobs (non-blocking):

| Operation | Job Type | Purpose |
|-----------|----------|---------|
| User login | `AUDIT_LOG` | Track login events |
| Sale completed | `AUDIT_LOG` | Track sales |
| Sale completed | `EMAIL_NOTIFICATION` | Send receipt to customer |
| PO received | `AUDIT_LOG` | Track receiving |
| Outlet created | `AUDIT_LOG` | Track outlet changes |
| User assigned to outlet | `AUDIT_LOG` | Track permissions |

Jobs are processed asynchronously by the worker service.

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting in production.

---

## Versioning

API version: `v1` (implicit, no version prefix required)

Future versions will use `/api/v2` prefix.

---

**Last Updated:** 2025-12-06
