/**
 * Centralized Routing Configuration
 * All route changes must be documented
 */

import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants";
import ProtectedRoute from "./protected-route.js";
import AppLayout from "../components/layout/AppLayout";

// Lazy load large route-based pages for code splitting
const Dashboard = lazy(() => import("../pages/dashboard"));
const TalentMatch = lazy(() => import("../pages/talent-match"));
const ProposalGeneration = lazy(() => import("../pages/proposal-generation"));
const SentimentAnalysis = lazy(() => import("../pages/sentiment-analysis"));
const PricePrediction = lazy(() => import("../pages/price-prediction"));
const CRM = lazy(() => import("../pages/crm"));
const LeadDiscovery = lazy(() => import("../pages/lead-discovery"));
const Insights = lazy(() => import("../pages/insights"));
const Rankings = lazy(() => import("../pages/rankings"));
const CompanyWorkspaceLayout = lazy(() => import("../pages/company-workspace/Layout"));
const CompanyPostingsPage = lazy(() => import("../pages/company-workspace/PostingsPage"));
const CompanyPostJobPage = lazy(() => import("../pages/company-workspace/PostJobPage"));
const CompanyPostProjectPage = lazy(() => import("../pages/company-workspace/PostProjectPage"));
const WorkspaceProfilePage = lazy(() => import("../pages/company-workspace/WorkspaceProfilePage"));
const CatalogItemHub = lazy(() => import("../pages/company-workspace/catalog/CatalogItemHub"));
const CatalogOverview = lazy(() => import("../pages/company-workspace/catalog/CatalogOverview"));
const CatalogLeadDiscovery = lazy(() => import("../pages/company-workspace/catalog/CatalogLeadDiscovery"));
const CatalogProspects = lazy(() => import("../pages/company-workspace/catalog/CatalogProspects"));
const CatalogPrice = lazy(() => import("../pages/company-workspace/catalog/CatalogPrice"));
const CatalogDealsActivity = lazy(() => import("../pages/company-workspace/catalog/CatalogDealsActivity"));
const CatalogRankings = lazy(() => import("../pages/company-workspace/catalog/CatalogRankings"));

// Regular imports for smaller components
import Login from "../pages/auth/login";
import Signup from "../pages/auth/signup";
import ForgotPassword from "../components/Forms/ForgotPassword";
import ResetPassword from "../components/Forms/ResetPassword";
import RoleSelection from "../pages/auth/role-selection";
import OnboardingStepper from "../pages/auth/onboarding";
import FreelancerForm from "../pages/forms/freelancer-form";
import JobSeekerForm from "../pages/forms/job-seeker-form";
import CompanyForm from "../pages/forms/company-form";
import Profile from "../pages/profile";
import TalentDetails from "../pages/talent-details";
import AccountSettings from "../pages/account-settings";
import Billing from "../pages/billing";

/**
 * Loading fallback component for Suspense
 */
const LoadingFallback = () => <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>;

const ProtectedLayout = () => (
  <ProtectedRoute>
    <AppLayout />
  </ProtectedRoute>
);

const toRelative = (path) => {
  if (!path) return "";
  return path.replace(/^\//, "");
};

/**
 * Main routing configuration
 * Public routes: login, signup, role selection, forms
 * Protected routes: dashboard, features, profile
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.SIGNUP} element={<Signup />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      <Route path={ROUTES.ROLE_SELECTION} element={<RoleSelection />} />
      <Route path={ROUTES.ONBOARDING} element={<OnboardingStepper />} />
      <Route path={ROUTES.FREELANCER_FORM} element={<FreelancerForm />} />
      <Route path={ROUTES.JOBSEEKER_FORM} element={<JobSeekerForm />} />
      <Route path={ROUTES.COMPANY_FORM} element={<CompanyForm />} />

      {/* Protected Routes */}
      <Route path={ROUTES.ROOT} element={<ProtectedLayout />}>
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route
          path={toRelative(ROUTES.DASHBOARD)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.TALENT_MATCH)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <TalentMatch />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.COMPANY_WORKSPACE)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <CompanyWorkspaceLayout />
            </Suspense>
          }
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route
            path="profile"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <WorkspaceProfilePage />
              </Suspense>
            }
          />
          <Route
            path="postings"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CompanyPostingsPage />
              </Suspense>
            }
          />
          <Route
            path="postings/item/:itemType/:itemId"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CatalogItemHub />
              </Suspense>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogOverview />
                </Suspense>
              }
            />
            <Route
              path="lead-discovery"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogLeadDiscovery />
                </Suspense>
              }
            />
            <Route
              path="prospects"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogProspects />
                </Suspense>
              }
            />
            <Route
              path="price"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogPrice />
                </Suspense>
              }
            />
            <Route
              path="rankings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogRankings />
                </Suspense>
              }
            />
            <Route
              path="activity"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CatalogDealsActivity />
                </Suspense>
              }
            />
          </Route>
          <Route
            path="post-job"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CompanyPostJobPage />
              </Suspense>
            }
          />
          <Route
            path="post-project"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CompanyPostProjectPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="company-postings" element={<Navigate to={ROUTES.COMPANY_POSTINGS} replace />} />
        <Route
          path={toRelative(ROUTES.PROPOSAL_GENERATION)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ProposalGeneration />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.SENTIMENT_ANALYSIS)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <SentimentAnalysis />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.PRICE_PREDICTION)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <PricePrediction />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.CRM)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <CRM />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.LEAD_DISCOVERY)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <LeadDiscovery />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.INSIGHTS)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Insights />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.RANKINGS)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Rankings />
            </Suspense>
          }
        />
        <Route path={toRelative(ROUTES.PROFILE)} element={<Profile />} />
        <Route path={toRelative(ROUTES.TALENT_DETAILS)} element={<TalentDetails />} />
        <Route
          path={toRelative(ROUTES.ACCOUNT_SETTINGS)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AccountSettings />
            </Suspense>
          }
        />
        <Route
          path={toRelative(ROUTES.BILLING)}
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Billing />
            </Suspense>
          }
        />
      </Route>

      {/* Redirects */}
      <Route path="/home" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
};

