/**
 * Authentication Context
 * Defines the authentication context structure
 */

import { createContext, useContext } from "react";

export const AuthContext = createContext({
  token: null,
  user: null,
  isAuthenticated: false,
  initializing: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

