/**
 * Application configuration
 * All environment-specific values must come from environment variables
 * Never hardcode environment-specific values in the codebase
 */

/**
 * Ensure base URL includes /api. All FastAPI routers use prefix="/api".
 * .env files often set REACT_APP_API_BASE to http://host:port without /api,
 * which would 404 every route (e.g. Not Found on forgot-password).
 */
function normalizeApiBase(raw) {
  const fallback = "http://127.0.0.1:8000/api";
  if (!raw || typeof raw !== "string") {
    return fallback;
  }
  let base = raw.trim().replace(/\/+$/, "");
  if (!/\/api$/i.test(base)) {
    base = `${base}/api`;
  }
  return base;
}

/**
 * API base URL from environment variable
 * Defaults to local development server if not set
 */
export const API_BASE = "http://127.0.0.1:8000/api";//normalizeApiBase(process.env.REACT_APP_API_BASE);

/**
 * Application configuration object
 */
export const config = {
  apiBase: API_BASE,
};



