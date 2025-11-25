/**
 * Theme Context
 * Provides theme mode (light/dark) functionality
 */

import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({
  mode: "light",
  toggleTheme: () => {},
});

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return context;
};

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // Get saved theme from localStorage or default to light
    return localStorage.getItem("themeMode") || "light";
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

