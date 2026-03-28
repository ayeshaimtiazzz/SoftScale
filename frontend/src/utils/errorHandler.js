/**
 * Extracts a user-friendly error message from FastAPI error responses
 * Handles both string errors and validation error arrays
 */
export function extractErrorMessage(error) {
  // No HTTP response: network failure, CORS, or backend unreachable
  if (!error?.response) {
    return "Cannot reach server. Check that the backend is running and try again.";
  }
  // Response with no body or empty body
  if (!error.response?.data) {
    const status = error.response?.status;
    return status
      ? `Server error (${status}). Please try again.`
      : "An unexpected error occurred. Please try again.";
  }

  const data = error.response.data;

  // If detail is a string, return it directly
  if (typeof data.detail === "string") {
    return data.detail;
  }

  // If detail is an array (validation errors), format them
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((err) => {
        const field = err.loc?.slice(1).join(".") || "field";
        return `${field}: ${err.msg}`;
      })
      .join("; ");
  }

  // If detail is an object (single validation error)
  if (typeof data.detail === "object" && data.detail !== null) {
    if (data.detail.msg) {
      const field = data.detail.loc?.slice(1).join(".") || "field";
      return `${field}: ${data.detail.msg}`;
    }
    return JSON.stringify(data.detail);
  }

  // Fallback to error message or stringify
  if (typeof data.error === "string") {
    return data.error;
  }

  return JSON.stringify(data);
}
