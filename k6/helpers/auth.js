// Authentication helper for k6 tests
import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";
import config from "../config.js";

// Superadmin credentials (from seed.js)
const SUPERADMIN_CREDENTIALS = {
  username: "superadmin",
  password: "superadmin123",
};

// Auth state for regular user
let userAuth = {
  authToken: null,
  refreshToken: null,
  tokenExp: 0,
  outletId: null,
  userId: null,
};

// Auth state for superadmin (separate session)
let superAdminAuth = {
  authToken: null,
  refreshToken: null,
  tokenExp: 0,
  userId: null,
};

/**
 * Decode JWT to get expiration time
 */
function getTokenExpiry(token) {
  if (!token) return 0;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;

    const decoded = encoding.b64decode(parts[1], "rawurl");
    const payloadStr = String.fromCharCode(...new Uint8Array(decoded));

    const payload = JSON.parse(payloadStr);
    return payload.exp || 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Check if token is expired or about to expire (within 10 seconds)
 */
function isTokenExpired(authState) {
  if (!authState.authToken || !authState.tokenExp) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= authState.tokenExp - 10;
}

/**
 * Perform login and return auth data
 */
function performLogin(username, password) {
  const res = http.post(
    `${config.baseUrl}/auth/login`,
    JSON.stringify({ username, password }),
    { headers: config.headers },
  );

  const success = check(res, {
    "login successful": (r) => r.status === 200,
  });

  if (success && res.json().data) {
    return res.json().data;
  }
  return null;
}

/**
 * Set authentication data from API response
 */
function setAuthData(authState, data) {
  if (data.accessToken) {
    authState.authToken = data.accessToken;
    authState.tokenExp = getTokenExpiry(data.accessToken);
  }
  if (data.refreshToken) {
    authState.refreshToken = data.refreshToken;
  }
  if (data.user?.id) {
    authState.userId = data.user.id;
  }
  if (data.outlets && data.outlets.length > 0) {
    authState.outletId = data.outlets[0].id;
  }
}

/**
 * Login as regular test user
 */
export function login(
  username = config.testUser.username,
  password = config.testUser.password,
) {
  const data = performLogin(username, password);
  if (data) {
    setAuthData(userAuth, data);
    return data;
  }
  return null;
}

/**
 * Refresh access token for regular user
 */
export function refresh() {
  if (!userAuth.refreshToken) return false;

  const res = http.post(
    `${config.baseUrl}/auth/refresh`,
    JSON.stringify({ refreshToken: userAuth.refreshToken }),
    { headers: config.headers },
  );

  const success = check(res, {
    "refresh successful": (r) => r.status === 200,
  });

  if (success && res.json().data) {
    setAuthData(userAuth, res.json().data);
    return true;
  }

  return false;
}

/**
 * Ensure valid authentication state for regular user
 */
export function ensureAuthenticated() {
  if (userAuth.authToken && !isTokenExpired(userAuth)) {
    return;
  }

  if (isTokenExpired(userAuth) && userAuth.refreshToken) {
    if (refresh()) {
      return;
    }
  }

  login();
}

/**
 * Ensure superadmin is authenticated (separate session)
 */
export function ensureSuperAdminAuthenticated() {
  if (superAdminAuth.authToken && !isTokenExpired(superAdminAuth)) {
    return;
  }

  // Login as superadmin
  const data = performLogin(
    SUPERADMIN_CREDENTIALS.username,
    SUPERADMIN_CREDENTIALS.password,
  );
  if (data) {
    setAuthData(superAdminAuth, data);
  }
}

/**
 * Perform logout for regular user
 */
export function logout() {
  if (!userAuth.authToken) return;

  http.post(`${config.baseUrl}/auth/logout`, null, {
    headers: getAuthHeaders(),
  });
  resetAuth();
}

/**
 * Get authentication headers for regular user
 */
export function getAuthHeaders() {
  ensureAuthenticated();
  return {
    ...config.headers,
    Authorization: `Bearer ${userAuth.authToken}`,
  };
}

/**
 * Get authentication headers for superadmin
 */
export function getSuperAdminAuthHeaders() {
  ensureSuperAdminAuthenticated();
  return {
    ...config.headers,
    Authorization: `Bearer ${superAdminAuth.authToken}`,
  };
}

/**
 * Get headers with outlet context (regular user only)
 */
export function getAuthHeadersWithOutlet() {
  const headers = getAuthHeaders();
  headers["X-Outlet-Id"] = userAuth.outletId;
  return headers;
}

export function getOutletId() {
  return userAuth.outletId;
}
export function getUserId() {
  return userAuth.userId;
}
export function getAuthToken() {
  return userAuth.authToken;
}
export function getRefreshToken() {
  return userAuth.refreshToken;
}

/**
 * Reset regular user authentication state
 */
export function resetAuth() {
  userAuth = {
    authToken: null,
    refreshToken: null,
    tokenExp: 0,
    outletId: null,
    userId: null,
  };
}

/**
 * Reset superadmin authentication state
 */
export function resetSuperAdminAuth() {
  superAdminAuth = {
    authToken: null,
    refreshToken: null,
    tokenExp: 0,
    userId: null,
  };
}
