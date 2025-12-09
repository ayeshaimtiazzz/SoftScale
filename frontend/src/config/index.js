/**
 * Application configuration
 * All environment-specific values must come from environment variables
 * Never hardcode environment-specific values in the codebase
 */

/**
 * API base URL from environment variable
 * Defaults to local development server if not set
 */
export const API_BASE =
  process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000/api";

/**
 * Application configuration object
 */
export const config = {
  apiBase: API_BASE,
};



