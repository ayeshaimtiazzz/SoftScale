/**
 * Centralized Routing Configuration
 * All route changes must be documented
 */

import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants";
import ProtectedRoute from "../components/ProtectedRoute";

// Lazy load large route-based pages for code splitting
const Dashboard = lazy(() => import("../modules/dashboard/Dashboard"));
const TalentMatch = lazy(() => import("../modules/talent-match/TalentMatch"));
const ProposalGeneration = lazy(() =>
  import("../modules/proposal-generation/ProposalGeneration")
);
const SentimentAnalysis = lazy(() =>
  import("../modules/sentiment-analysis/SentimentAnalysis")
);
const PricePrediction = lazy(() =>
  import("../modules/price-prediction/PricePrediction")
);
const CRM = lazy(() => import("../modules/crm/CRM"));

// Regular imports for smaller components
import Login from "../components/Login";
import Signup from "../components/Signup";
import RoleSelection from "../components/RoleSelection";
import FreelancerForm from "../components/FreelancerForm";
import JobSeekerForm from "../components/JobSeekerForm";
import CompanyForm from "../components/CompanyForm";
import Profile from "../components/Profile";

/**
 * Loading fallback component for Suspense
 */
const LoadingFallback = () => (
  <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
);

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
      <Route path={ROUTES.FREELANCER_FORM} element={<FreelancerForm />} />
      <Route path={ROUTES.JOBSEEKER_FORM} element={<JobSeekerForm />} />
      <Route path={ROUTES.COMPANY_FORM} element={<CompanyForm />} />

      {/* Protected Routes with Lazy Loading */}
      <Route
        path={ROUTES.ROOT}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.TALENT_MATCH}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <TalentMatch />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROPOSAL_GENERATION}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ProposalGeneration />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SENTIMENT_ANALYSIS}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <SentimentAnalysis />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PRICE_PREDICTION}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <PricePrediction />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CRM}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <CRM />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROFILE}
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/home" element={<Navigate to={ROUTES.ROOT} replace />} />

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
};

