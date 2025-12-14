// Authentication helper for k6 tests
import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";
import config from "../config.js";

// Shared authentication state
let authToken = null;
let refreshToken = null;
let tokenExp = 0;
let outletId = null;
let userId = null;

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
function isTokenExpired() {
  if (!authToken || !tokenExp) return true;
  // Current time in seconds (JWT exp is in seconds)
  const now = Math.floor(Date.now() / 1000);
  return now >= tokenExp - 10;
}

/**
 * Perform login and store tokens
 */
export function login(
  username = config.testUser.username,
  password = config.testUser.password,
) {
  const res = http.post(
    `${config.baseUrl}/auth/login`,
    JSON.stringify({ username, password }),
    { headers: config.headers },
  );

  const success = check(res, {
    "login successful": (r) => r.status === 200,
  });

  if (success && res.json().data) {
    const data = res.json().data;
    setAuthData(data);
    return data;
  }

  return null;
}

/**
 * Refresh access token
 */
export function refresh() {
  if (!refreshToken) return false;

  const res = http.post(
    `${config.baseUrl}/auth/refresh`,
    JSON.stringify({ refreshToken }),
    { headers: config.headers },
  );

  const success = check(res, {
    "refresh successful": (r) => r.status === 200,
  });

  if (success && res.json().data) {
    setAuthData(res.json().data);
    return true;
  }

  return false;
}

/**
 * Set authentication data from API response
 */
function setAuthData(data) {
  if (data.accessToken) {
    authToken = data.accessToken;
    tokenExp = getTokenExpiry(authToken);
  }
  if (data.refreshToken) {
    refreshToken = data.refreshToken;
  }
  if (data.user?.id) {
    userId = data.user.id;
  }
  if (data.outlets && data.outlets.length > 0) {
    outletId = data.outlets[0].id;
  }
}

/**
 * Ensure valid authentication state
 * - Reuses existing valid token
 * - Refreshes if expired but have refresh token
 * - Logs in if invalid/missing
 */
export function ensureAuthenticated() {
  // Case 1: Active valid token
  if (authToken && !isTokenExpired()) {
    return;
  }

  // Case 2: Expired token, try refresh
  if (isTokenExpired() && refreshToken) {
    if (refresh()) {
      return;
    }
  }

  // Case 3: No token or refresh failed -> Login
  login();
}

/**
 * Perform logout
 */
export function logout() {
  if (!authToken) return;

  http.post(`${config.baseUrl}/auth/logout`, null, {
    headers: getAuthHeaders(),
  });
  resetAuth();
}

/**
 * Get authentication headers
 */
export function getAuthHeaders() {
  ensureAuthenticated();
  return {
    ...config.headers,
    Authorization: `Bearer ${authToken}`,
  };
}

/**
 * Get headers with outlet context
 */
export function getAuthHeadersWithOutlet() {
  return {
    ...getAuthHeaders(),
    "X-Outlet-Id": outletId,
  };
}

export function getOutletId() {
  return outletId;
}
export function getUserId() {
  return userId;
}
export function getAuthToken() {
  return authToken;
}
export function getRefreshToken() {
  return refreshToken;
}

/**
 * Reset authentication state
 */
export function resetAuth() {
  authToken = null;
  refreshToken = null;
  tokenExp = 0;
  outletId = null;
  userId = null;
}
