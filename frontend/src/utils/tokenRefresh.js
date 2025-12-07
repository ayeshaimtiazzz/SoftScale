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
    const response = await axios.post(`${API_BASE}${API_ENDPOINTS.REFRESH_TOKEN}`, { refresh_token: refreshToken });

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

    return null;
  } catch (error) {
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

