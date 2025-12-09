/**
 * Token refresh utility
 * Handles automatic token refresh and API request interceptors
 */

import axios from "axios";
import { API_BASE } from "../config";
import { API_ENDPOINTS } from "../constants";
import { getAuthToken, getRefreshToken, setAuthData, clearAuthData } from "./storage";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Refresh the access token using the refresh token
 * @returns {Promise<string|null>} New access token or null if refresh fails
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    // Use a separate axios instance without interceptors for refresh token call
    // to avoid infinite loops if refresh fails
    const refreshAxios = axios.create({
      baseURL: API_BASE,
    });
    const response = await refreshAxios.post(API_ENDPOINTS.REFRESH_TOKEN, { refresh_token: refreshToken });

    const { access_token } = response.data;

    if (access_token) {
      // Update stored token
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      const role = localStorage.getItem("userRole");
      setAuthData({
        token: access_token,
        refreshToken: refreshToken, // Keep the same refresh token
        user: currentUser,
        role: role,
      });
      return access_token;
    }

    console.error("Refresh token response missing access_token");
    return null;
  } catch (error) {
    // Log error details for debugging
    if (error.response) {
      console.error("Refresh token failed:", {
        status: error.response.status,
        data: error.response.data,
        message: error.response.data?.detail || error.message,
      });
    } else if (error.request) {
      console.error("Refresh token failed: No response from server", error.request);
    } else {
      console.error("Refresh token failed:", error.message);
    }

    // Refresh token is invalid or expired
    clearAuthData();
    return null;
  }
}

/**
 * Create an axios instance with token refresh interceptor
 * @param {Object} config - Axios configuration
 * @returns {axios.AxiosInstance} Configured axios instance
 */
export function createAxiosInstance(config = {}) {
  const instance = axios.create({
    baseURL: API_BASE,
    ...config,
  });

  // Request interceptor to add token
  // Always get the latest token from storage to ensure we use the refreshed token
  instance.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If error is 401 and we haven't already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshAccessToken();

          if (newToken) {
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } else {
            processQueue(new Error("Token refresh failed"), null);
            clearAuthData();
            // Redirect to login or trigger logout
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return Promise.reject(error);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          clearAuthData();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Default axios instance with token refresh interceptor
 * Use this instance for all API calls that require authentication
 */
export const axiosInstance = createAxiosInstance();

// Set default baseURL for axios
axios.defaults.baseURL = API_BASE;

// Add interceptors to the default axios instance
// This ensures all axios calls (even direct axios.get/post/etc) will have token refresh
// Request interceptor to add token
axios.interceptors.request.use(
  (config) => {
    // Only add token if baseURL matches our API (to avoid interfering with external APIs)
    if (config.baseURL === API_BASE || !config.baseURL) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s for our API calls
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept refresh token endpoint to avoid infinite loops
      const requestUrl = originalRequest.url || "";
      const fullUrl = originalRequest.baseURL ? `${originalRequest.baseURL}${requestUrl}` : requestUrl;
      if (fullUrl.includes(API_ENDPOINTS.REFRESH_TOKEN) || requestUrl.includes(API_ENDPOINTS.REFRESH_TOKEN)) {
        return Promise.reject(error);
      }

      // Check if this is a request to our API
      const isOurAPI = !originalRequest.baseURL || originalRequest.baseURL === API_BASE || originalRequest.url?.startsWith(API_BASE);

      if (!isOurAPI) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        } else {
          processQueue(new Error("Token refresh failed"), null);
          clearAuthData();
          // Redirect to login or trigger logout
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthData();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

