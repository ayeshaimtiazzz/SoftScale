/**
 * Main App Component
 * Sets up routing and providers for the application
 */

import React from "react";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";

const App = () => {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
};

export default App;
