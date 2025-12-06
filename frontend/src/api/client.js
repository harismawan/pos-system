/**
 * API client with authentication, outlet headers, and automatic token refresh
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('accessToken');
        this.refreshToken = null;
        this.outletId = localStorage.getItem('activeOutletId');
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
    }

    setRefreshToken(refreshToken) {
        this.refreshToken = refreshToken;
    }

    setOutlet(outletId) {
        this.outletId = outletId;
        if (outletId) {
            localStorage.setItem('activeOutletId', outletId);
        } else {
            localStorage.removeItem('activeOutletId');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (this.outletId) {
            headers['X-Outlet-Id'] = this.outletId;
        }

        return headers;
    }

    // Subscribe to token refresh
    onTokenRefreshed(callback) {
        this.refreshSubscribers.push(callback);
    }

    // Notify all subscribers that token has been refreshed
    notifySubscribers(newToken) {
        this.refreshSubscribers.forEach(callback => callback(newToken));
        this.refreshSubscribers = [];
    }

    // Attempt to refresh the access token
    async refreshAccessToken() {
        // Get refresh token from auth storage
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
            throw new Error('No auth storage found');
        }

        const parsed = JSON.parse(authStorage);
        const refreshToken = parsed?.state?.refreshToken;

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Token refresh failed');
        }

        // Update local token
        this.setToken(data.data.accessToken);

        // Update auth storage with new tokens
        parsed.state.accessToken = data.data.accessToken;
        parsed.state.refreshToken = data.data.refreshToken;
        localStorage.setItem('auth-storage', JSON.stringify(parsed));

        return data.data.accessToken;
    }

    async request(endpoint, options = {}, retry = true) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Check if it's a token expired error (401)
                // Backend returns code at top level for error responses
                const isTokenExpired = response.status === 401 && data.code === 'AUT-401-004';

                if (isTokenExpired && retry) {
                    // Try to refresh the token
                    if (!this.isRefreshing) {
                        this.isRefreshing = true;

                        try {
                            const newToken = await this.refreshAccessToken();
                            this.isRefreshing = false;
                            this.notifySubscribers(newToken);

                            // Retry the original request with new token
                            return this.request(endpoint, options, false);
                        } catch (refreshError) {
                            this.isRefreshing = false;
                            this.refreshSubscribers = [];

                            // Clear auth and redirect to login
                            this.handleAuthFailure();
                            throw new Error('Session expired. Please login again.');
                        }
                    } else {
                        // Wait for the refresh to complete
                        return new Promise((resolve, reject) => {
                            this.onTokenRefreshed((newToken) => {
                                // Retry with new token
                                this.request(endpoint, options, false)
                                    .then(resolve)
                                    .catch(reject);
                            });
                        });
                    }
                }

                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    }

    handleAuthFailure() {
        // Clear tokens
        this.setToken(null);
        this.setOutlet(null);
        localStorage.removeItem('auth-storage');

        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
