// src/index.js
/**
 * Application entry point
 * Initializes React and renders the root component
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
// Import token refresh utilities early to set up axios interceptors
import "./utils/tokenRefresh";

// After a dev-server restart or deploy, lazy-loaded chunks can 404 while the tab still runs an old main bundle.
// Recover once per tab session (sessionStorage) to avoid reload loops.
window.addEventListener("unhandledrejection", (event) => {
  const r = event.reason;
  const msg = typeof r?.message === "string" ? r.message : "";
  const isChunkLoad =
    r?.name === "ChunkLoadError" || (msg.includes("Loading chunk") && msg.includes("failed"));
  if (!isChunkLoad) return;
  const key = "softscale_chunk_reload_once";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  event.preventDefault();
  window.location.reload();
});

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
