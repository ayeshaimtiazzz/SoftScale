/**
 * Local storage utilities
 * Provides access to localStorage with fallback values
 */

import { STORAGE_KEYS } from "../constants";

/**
 * Reads a JSON value from localStorage
 * @param {string} key - The storage key
 * @param {any} fallback - Default value if key doesn't exist or parsing fails
 * @returns {any} The parsed value or fallback
 */
export function readJson(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return fallback;
    }
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

/**
 * Gets the current user from localStorage
 * @returns {object|null} User object or null
 */
export function getCurrentUser() {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!user) return null;
    return JSON.parse(user);
  } catch {
    return null;
  }
}

/**
 * Gets the auth token from localStorage
 * @returns {string|null} Auth token or null
 */
export function getAuthToken() {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Gets the refresh token from localStorage
 * @returns {string|null} Refresh token or null
 */
export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Gets the user role from localStorage
 * @returns {string|null} User role or null
 */
export function getUserRole() {
  return localStorage.getItem(STORAGE_KEYS.USER_ROLE);
}

/**
 * Persists authentication data to localStorage
 * @param {{ token: string, refreshToken?: string, user: object, role?: string }} payload
 */
export function setAuthData({ token, refreshToken, user, role }) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  if (role || user?.role) {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role || user?.role || "");
  }
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }
}

/**
 * Clears all authentication-related data from localStorage
 * Should be called on logout
 */
export function clearAuthData() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

