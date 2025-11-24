// Frontend configuration from environment variables
// React requires REACT_APP_ prefix for environment variables

export const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

// Export other config values if needed
export const config = {
  apiBase: API_BASE,
};



