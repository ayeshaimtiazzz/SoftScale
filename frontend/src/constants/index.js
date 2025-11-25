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
 */
export const DOMAINS = [
  "Healthcare",
  "Information Technology",
  "Software",
  "SaaS",
  "Finance",
  "Education",
  "E-commerce",
  "Marketing",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Transportation",
  "Telecommunications",
  "Real Estate",
  "Energy",
  "Energy & Utilities",
  "Automotive",
  "Agriculture",
  "Pharmaceuticals",
  "Media",
  "Media & Entertainment",
  "Entertainment",
  "Government",
  "Non-profit",
  "Legal",
  "Other",
  "Research & Development",
  "Cloud Computing",
  "Software Development",
  "Data Science",
  "Automation",
  "Web Development",
  "Mobile Apps",
  "AI & ML",
  "AI",
  "Cybersecurity",
];

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
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
  GET_USER_DETAILS: "/get-user-details",
  POST_JOB: "/post-job",
  POST_PROJECT: "/post-project",
  GET_COMPANY_POSTS: "/get-company-posts",
};

/**
 * Route paths
 */
export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  ROLE_SELECTION: "/role-selection/:userId",
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
};

