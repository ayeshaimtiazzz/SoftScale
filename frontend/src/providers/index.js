/**
 * Root Providers
 * Composes all context providers at the app root
 */

import React from "react";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "./I18nProvider";
import { AuthProvider } from "./AuthProvider";

/**
 * Root provider component that composes all providers
 * @param {React.ReactNode} children - Child components to wrap
 */
export const AppProviders = ({ children }) => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};

