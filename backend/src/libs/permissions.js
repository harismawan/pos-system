/**
 * Permission-Based Access Control (RBAC)
 * Defines permissions and role mappings for the POS system
 */

import { AUT } from "./responseCodes.js";
import { errorResponse } from "./responses.js";

// Available permissions in the system
export const PERMISSIONS = {
  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Products
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_TRANSFER: "inventory.transfer",

  // Sales/POS
  POS_ACCESS: "pos.access",
  POS_VOID: "pos.void",

  // Purchase Orders
  PURCHASE_VIEW: "purchase.view",
  PURCHASE_CREATE: "purchase.create",
  PURCHASE_EDIT: "purchase.edit",
  PURCHASE_RECEIVE: "purchase.receive",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  // Settings
  SETTINGS_OUTLETS: "settings.outlets",
  SETTINGS_PRICING: "settings.pricing",
  SETTINGS_CUSTOMERS: "settings.customers",
  SETTINGS_SUPPLIERS: "settings.suppliers",
  SETTINGS_WAREHOUSES: "settings.warehouses",
  SETTINGS_AUDIT: "settings.audit",
};

// Role to permissions mapping
export const ROLE_PERMISSIONS = {
  OWNER: [
    // Full access to everything
    ...Object.values(PERMISSIONS),
  ],

  ADMIN: [
    // All except user deletion
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    // Products - full
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    // Inventory - full
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    // POS - full
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_VOID,
    // Purchase Orders - full
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_EDIT,
    PERMISSIONS.PURCHASE_RECEIVE,
    // Reports - full
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    // Settings - full excluding audit
    PERMISSIONS.SETTINGS_OUTLETS,
    PERMISSIONS.SETTINGS_PRICING,
    PERMISSIONS.SETTINGS_CUSTOMERS,
    PERMISSIONS.SETTINGS_SUPPLIERS,
    PERMISSIONS.SETTINGS_WAREHOUSES,
  ],

  MANAGER: [
    // Users - view only
    PERMISSIONS.USERS_VIEW,
    // Products - create/edit
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    // Inventory - full
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    // POS - full
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_VOID,
    // Purchase Orders - full
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_EDIT,
    PERMISSIONS.PURCHASE_RECEIVE,
    // Reports - view only
    PERMISSIONS.REPORTS_VIEW,
    // Settings - pricing, customers, suppliers
    PERMISSIONS.SETTINGS_PRICING,
    PERMISSIONS.SETTINGS_CUSTOMERS,
    PERMISSIONS.SETTINGS_SUPPLIERS,
    PERMISSIONS.SETTINGS_WAREHOUSES,
  ],

  CASHIER: [
    // Products - view only
    PERMISSIONS.PRODUCTS_VIEW,
    // POS - access only, no void
    PERMISSIONS.POS_ACCESS,
    // Customers - for POS
    PERMISSIONS.SETTINGS_CUSTOMERS,
  ],

  WAREHOUSE_STAFF: [
    // Products - view only
    PERMISSIONS.PRODUCTS_VIEW,
    // Inventory - full
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    // Purchase Orders - view and receive
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_RECEIVE,
    // Warehouses
    PERMISSIONS.SETTINGS_WAREHOUSES,
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]}
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Elysia middleware to require specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Middleware function
 */
export function requirePermission(permission) {
  return ({ store, set }) => {
    if (!store.user) {
      set.status = 401;
      return errorResponse(AUT.NOT_AUTHENTICATED, "Authentication required");
    }

    if (!hasPermission(store.user.role, permission)) {
      set.status = 403;
      // set.headers needs to be handled by Elysia context usually, but here we return body
      return errorResponse(
        AUT.PERMISSION_DENIED,
        `Permission denied: ${permission} required`,
      );
    }
  };
}

/**
 * Elysia middleware to require any of the specified permissions
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 * @returns {Function} Middleware function
 */
export function requireAnyPermission(permissions) {
  return ({ store, set }) => {
    if (!store.user) {
      set.status = 401;
      return errorResponse(AUT.NOT_AUTHENTICATED, "Authentication required");
    }

    const hasAny = permissions.some((p) => hasPermission(store.user.role, p));
    if (!hasAny) {
      set.status = 403;
      return errorResponse(
        AUT.PERMISSION_DENIED,
        `Permission denied: one of [${permissions.join(", ")}] required`,
      );
    }
  };
}
