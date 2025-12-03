/**
 * I18n Provider Component
 * Provides internationalization context to the application
 */

import React from "react";
import "../i18n/config";

/**
 * I18n provider wrapper (i18n is initialized in config)
 * @param {React.ReactNode} children - Child components to wrap
 */
export const I18nProvider = ({ children }) => {
  return <>{children}</>;
};


