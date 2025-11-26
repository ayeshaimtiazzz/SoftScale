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

// Regular imports for smaller components
import Login from "../pages/auth/login";
import Signup from "../pages/auth/signup";
import RoleSelection from "../pages/auth/role-selection";
import OnboardingStepper from "../pages/auth/onboarding";
import FreelancerForm from "../pages/forms/freelancer-form";
import JobSeekerForm from "../pages/forms/job-seeker-form";
import CompanyForm from "../pages/forms/company-form";
import Profile from "../pages/profile";

/**
 * Loading fallback component for Suspense
 */
const LoadingFallback = () => <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>;

const ProtectedLayout = () => (
  <ProtectedRoute>
    <AppLayout />
  </ProtectedRoute>
);

const toRelative = (path) => path.replace(/^\//, "");

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
        <Route path={toRelative(ROUTES.PROFILE)} element={<Profile />} />
      </Route>

      {/* Redirects */}
      <Route path="/home" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
};

