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

// After a dev-server restart, deploy, or slow/timed-out chunk fetch, lazy-loaded bundles can fail.
// Recover with a one-shot reload; clear the flag after load so later failures can retry once too.
const CHUNK_RELOAD_KEY = "softscale_chunk_reload_once";

const isChunkLoadReason = (reason) => {
  if (!reason) return false;
  if (reason.name === "ChunkLoadError") return true;
  const msg = typeof reason.message === "string" ? reason.message : String(reason);
  return (
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    (msg.includes("failed") && (msg.includes("chunk") || msg.includes("static/js")))
  );
};

function scheduleChunkReload() {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

window.addEventListener(
  "unhandledrejection",
  (event) => {
    if (!isChunkLoadReason(event.reason)) return;
    event.preventDefault();
    scheduleChunkReload();
  },
  false
);

// Script tag failures (timeout / network) for split chunks may not reject a tracked promise.
window.addEventListener(
  "error",
  (event) => {
    const t = event.target;
    if (!t || t.tagName !== "SCRIPT" || typeof t.src !== "string") return;
    if (!t.src.includes("/static/js/")) return;
    if (!t.src.includes("chunk") && !t.src.includes("vendors")) return;
    event.preventDefault?.();
    scheduleChunkReload();
  },
  true
);

window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY), 8000);
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
