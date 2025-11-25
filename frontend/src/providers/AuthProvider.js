/**
 * Authentication Provider
 * Provides authentication state and methods to the application
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants";
import {
  clearAuthData,
  getAuthToken,
  getCurrentUser,
  setAuthData,
} from "../utils/storage";
import { AuthContext } from "../contexts/AuthContext";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setToken(getAuthToken());
    setUser(getCurrentUser());
    setInitializing(false);
  }, []);

  const login = useCallback((authToken, userData) => {
    if (!authToken) {
      return;
    }
    const payload = {
      token: authToken,
      user: userData,
      role: userData?.role ?? localStorage.getItem(STORAGE_KEYS.USER_ROLE),
    };
    setAuthData(payload);
    setToken(authToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
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

