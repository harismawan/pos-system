/**
 * usePermissions hook - Check user permissions on frontend
 */

import { useAuthStore } from "../store/authStore.js";

// Permission definitions (must match backend)
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

  // Super Admin (platform-level)
  SUPER_ADMIN_DASHBOARD: "super_admin.dashboard",
  SUPER_ADMIN_BUSINESSES: "super_admin.businesses",
  SUPER_ADMIN_USERS: "super_admin.users",
  SUPER_ADMIN_SESSIONS: "super_admin.sessions",
  SUPER_ADMIN_IMPERSONATE: "super_admin.impersonate",

  // Invitations
  INVITATIONS_VIEW: "invitations.view",
  INVITATIONS_CREATE: "invitations.create",
  INVITATIONS_CANCEL: "invitations.cancel",
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(PERMISSIONS),

  OWNER: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_VOID,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_EDIT,
    PERMISSIONS.PURCHASE_RECEIVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_OUTLETS,
    PERMISSIONS.SETTINGS_PRICING,
    PERMISSIONS.SETTINGS_CUSTOMERS,
    PERMISSIONS.SETTINGS_SUPPLIERS,
    PERMISSIONS.SETTINGS_WAREHOUSES,
    PERMISSIONS.SETTINGS_AUDIT,
    PERMISSIONS.INVITATIONS_VIEW,
    PERMISSIONS.INVITATIONS_CREATE,
    PERMISSIONS.INVITATIONS_CANCEL,
  ],

  ADMIN: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_VOID,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_EDIT,
    PERMISSIONS.PURCHASE_RECEIVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_OUTLETS,
    PERMISSIONS.SETTINGS_PRICING,
    PERMISSIONS.SETTINGS_CUSTOMERS,
    PERMISSIONS.SETTINGS_SUPPLIERS,
    PERMISSIONS.SETTINGS_WAREHOUSES,
  ],

  MANAGER: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_VOID,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_EDIT,
    PERMISSIONS.PURCHASE_RECEIVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SETTINGS_PRICING,
    PERMISSIONS.SETTINGS_CUSTOMERS,
    PERMISSIONS.SETTINGS_SUPPLIERS,
    PERMISSIONS.SETTINGS_WAREHOUSES,
  ],

  CASHIER: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.SETTINGS_CUSTOMERS,
  ],

  WAREHOUSE_STAFF: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_RECEIVE,
    PERMISSIONS.SETTINGS_WAREHOUSES,
  ],
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Hook to check user permissions
 * @returns {{ can: (permission: string) => boolean, role: string, permissions: string[] }}
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || "CASHIER";

  return {
    /**
     * Check if user has a specific permission
     */
    can: (permission) => hasPermission(role, permission),

    /**
     * Check if user has any of the specified permissions
     */
    canAny: (permissions) => permissions.some((p) => hasPermission(role, p)),

    /**
     * Check if user has all of the specified permissions
     */
    canAll: (permissions) => permissions.every((p) => hasPermission(role, p)),

    /**
     * Check if user is Super Admin
     */
    isSuperAdmin: role === "SUPER_ADMIN",

    /**
     * Current user role
     */
    role,

    /**
     * All permissions for current role
     */
    permissions: ROLE_PERMISSIONS[role] || [],
  };
}
