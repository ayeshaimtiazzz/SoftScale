/**
 * Application-wide constants and enums
 * Never use magic strings or numbers in components; always use constants or enums
 */

/**
 * User roles in the system
 */
export const UserRole = {
  COMPANY_ADMIN: "company_admin",
  FREELANCER: "freelancer",
  JOBSEEKER: "jobseeker",
  GUEST: "guest",
};

/**
 * Job types
 */
export const JobType = {
  FULL_TIME: "full-time",
  PART_TIME: "part-time",
  CONTRACT: "contract",
  INTERNSHIP: "internship",
};

/**
 * Work modes
 */
export const WorkMode = {
  REMOTE: "remote",
  HYBRID: "hybrid",
  ON_SITE: "on-site",
};

/**
 * Project types
 */
export const ProjectType = {
  SHORT_TERM: "short-term",
  LONG_TERM: "long-term",
  GENERAL: "General",
  MILESTONE: "milestone",
};

/**
 * Payment types
 */
export const PaymentType = {
  FIXED: "fixed",
  HOURLY: "hourly",
};

/**
 * Industry domains
 * Re-exported from domains.js for backward compatibility
 */
export { DOMAINS } from "./domains";

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  REFRESH_TOKEN: "refreshToken",
  USER_ROLE: "userRole",
  CURRENT_USER: "currentUser",
  JOBS: "jobs",
  PROJECTS: "projects",
  FREELANCER_PROFILES: "freelancerProfiles",
  JOB_SEEKER_PROFILES: "jobSeekerProfiles",
  COMPANY_PROFILES: "companyProfiles",
  REVENUE_THIS_MONTH: "revenueThisMonth",
  ACTIVE_DEALS: "activeDeals",
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  REFRESH_TOKEN: "/refresh",
  LOGOUT: "/logout",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  GET_USER_DETAILS: "/get-user-details",
  CHECK_PROFILE_COMPLETION: "/check-profile-completion",
  POST_JOB: "/post-job",
  POST_PROJECT: "/post-project",
  GET_COMPANY_POSTS: "/get-company-posts",
  UPDATE_USER_DETAILS: "/update-user-details",
  CHANGE_PASSWORD: "/change-password",
  GET_NOTIFICATION_PREFERENCES: "/notification-preferences",
  UPDATE_NOTIFICATION_PREFERENCES: "/notification-preferences",
  GET_SUBSCRIPTION: "/subscription",
  UPDATE_SUBSCRIPTION: "/subscription",
  GET_PAYMENT_METHODS: "/payment-methods",
  ADD_PAYMENT_METHOD: "/payment-methods",
  DELETE_PAYMENT_METHOD: "/payment-methods",
  GET_BILLING_HISTORY: "/billing-history",
  // Sentiment analysis for communications
  SENTIMENT_ANALYSIS: "/sentiment-analysis",
};

/**
 * Route paths
 */
export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  ROLE_SELECTION: "/role-selection/:userId",
  ONBOARDING: "/onboarding/:userId",
  FREELANCER_FORM: "/freelancer-form",
  JOBSEEKER_FORM: "/jobseeker-form",
  COMPANY_FORM: "/company-form",
  DASHBOARD: "/dashboard",
  TALENT_MATCH: "/talent-match",
  PROPOSAL_GENERATION: "/proposal-generation",
  SENTIMENT_ANALYSIS: "/sentiment-analysis",
  PRICE_PREDICTION: "/price-prediction",
  CRM: "/crm",
  PROFILE: "/profile",
  TALENT_DETAILS: "/talent-details",
  LEAD_DISCOVERY: "/lead-discovery",
  INSIGHTS: "/insights",
  ACCOUNT_SETTINGS: "/account-settings",
  BILLING: "/billing",
};

// Re-export constants from other files
export * from "./domains";
export * from "./locations";
export * from "./selectionOptions";
export * from "./sampleData";
export * from "./colors";

