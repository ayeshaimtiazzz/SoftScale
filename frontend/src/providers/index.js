/**
 * Root Providers
 * Composes all context providers at the app root
 */

import React from "react";
import { ThemeModeProvider } from "../contexts/ThemeContext";
import { ThemeProvider } from "./ThemeProvider";
import { I18nProvider } from "./I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";

/**
 * Root provider component that composes all providers
 * @param {React.ReactNode} children - Child components to wrap
 */
export const AppProviders = ({ children }) => {
  return (
    <ThemeModeProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ThemeModeProvider>
  );
};

