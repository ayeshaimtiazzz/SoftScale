/**
 * Authentication Provider
 * Provides authentication state and methods to the application
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { STORAGE_KEYS } from "../constants";
import {
  clearAuthData,
  getAuthToken,
  getRefreshToken,
  getCurrentUser,
  setAuthData,
} from "../utils/storage";
import { AuthContext } from "../contexts/AuthContext";
import { refreshAccessToken } from "../utils/tokenRefresh";

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

  // Auto-refresh token proactively before expiry (every 25 minutes)
  // Access token expires in 30 minutes, so refresh at 25 minutes to avoid expiry
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
        // Refresh every 25 minutes (25 * 60 * 1000 ms)
        // This ensures we refresh BEFORE the 30-minute expiry
        refreshIntervalRef.current = setInterval(async () => {
          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              setToken(newToken);
              console.log("Token refreshed proactively at", new Date().toLocaleTimeString());
            } else {
              // Refresh failed, clear interval
              if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
              }
            }
          } catch (error) {
            console.error("Auto-refresh failed:", error);
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
          }
        }, 25 * 60 * 1000); // 25 minutes in milliseconds
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

  const logout = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    clearAuthData();
    setToken(null);
    setUser(null);
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

