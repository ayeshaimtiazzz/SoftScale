/**
 * Authentication Provider
 * Provides authentication state and methods to the application
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { STORAGE_KEYS, API_ENDPOINTS } from "../constants";
import { clearAuthData, getAuthToken, getRefreshToken, getCurrentUser, setAuthData } from "../utils/storage";
import { AuthContext } from "../contexts/AuthContext";
import { refreshAccessToken } from "../utils/tokenRefresh";
import axios from "axios";
import { API_BASE } from "../config";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    setToken(getAuthToken());
    setUser(getCurrentUser());
    setInitializing(false);
  }, []);

  // Auto-refresh token every 30 minutes to prevent invalid token errors
  useEffect(() => {
    const setupAutoRefresh = () => {
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Only set up auto-refresh if we have a refresh token and access token
      const refreshToken = getRefreshToken();
      const accessToken = getAuthToken();

      if (refreshToken && accessToken) {
        // Refresh every 30 minutes (30 * 60 * 1000 ms)
        refreshIntervalRef.current = setInterval(
          async () => {
            try {
              // eslint-disable-next-line no-console
              console.log("Proactive token refresh triggered at", new Date().toLocaleTimeString());
              const newToken = await refreshAccessToken();
              if (newToken) {
                setToken(newToken);
                // eslint-disable-next-line no-console
                console.log("Token refreshed successfully at", new Date().toLocaleTimeString());
              } else {
                // Refresh failed, clear interval and logout
                // eslint-disable-next-line no-console
                console.error("Token refresh failed, logging out");
                if (refreshIntervalRef.current) {
                  clearInterval(refreshIntervalRef.current);
                  refreshIntervalRef.current = null;
                }
                // Trigger logout if refresh fails
                clearAuthData();
                setToken(null);
                setUser(null);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("Auto-refresh failed:", error);
              if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
              }
              // Trigger logout on error
              clearAuthData();
              setToken(null);
              setUser(null);
            }
          },
          30 * 60 * 1000
        ); // 30 minutes in milliseconds
      }
    };

    setupAutoRefresh();

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [token]);

  const login = useCallback((authToken, userData, refreshToken = null) => {
    if (!authToken) {
      return;
    }
    const payload = {
      token: authToken,
      refreshToken: refreshToken,
      user: userData,
      role: userData?.role ?? localStorage.getItem(STORAGE_KEYS.USER_ROLE),
    };
    setAuthData(payload);
    setToken(authToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Call backend logout endpoint to revoke refresh tokens
    try {
      const currentToken = getAuthToken();
      if (currentToken) {
        // Even if token is expired, we try to logout
        await axios
          .post(
            `${API_BASE}${API_ENDPOINTS.LOGOUT}`,
            {},
            {
              headers: { Authorization: `Bearer ${currentToken}` },
            }
          )
          .catch(() => {
            // Ignore errors - we still want to clear local data
            // Token might already be expired
          });
      }
    } catch (error) {
      // Ignore errors - we still want to clear local data
      // eslint-disable-next-line no-console
      console.warn("Logout API call failed, clearing local data anyway:", error);
    } finally {
      // Always clear local data regardless of API call result
      clearAuthData();
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, user, initializing, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

