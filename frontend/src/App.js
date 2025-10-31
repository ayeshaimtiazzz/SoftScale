// src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import RoleSelection from "./components/RoleSelection";
import FreelancerForm from "./components/FreelancerForm";
import JobSeekerForm from "./components/JobSeekerForm";
import CompanyForm from './components/CompanyForm'; 

// IMPORTANT: Make sure these modules exist in your project.
// If you have components at ./modules/..., keep their imports.
// Added imports for the missing feature pages.
let Dashboard;
let TalentMatch;
let ProposalGeneration;
let SentimentAnalysis;
let PricePrediction;
let CRM;

try {
  // Prefer existing project modules if present
  Dashboard = require('./modules/dashboard/Dashboard').default;
  TalentMatch = require('./modules/talent-match/TalentMatch').default;
  ProposalGeneration = require('./modules/proposal-generation/ProposalGeneration').default;  // Added
  SentimentAnalysis = require('./modules/sentiment-analysis/SentimentAnalysis').default;  // Added
  PricePrediction = require('./modules/price-prediction/PricePrediction').default;  // Added
  CRM = require('./modules/crm/CRM').default;  // Added
} catch (e) {
  // Fallback placeholder components so routes load without crashing
  Dashboard = () => <div style={{padding:24}}>Dashboard placeholder — create <code>modules/dashboard/Dashboard</code></div>;
  TalentMatch = () => <div style={{padding:24}}>TalentMatch placeholder — create <code>modules/talent-match/TalentMatch</code></div>;
  ProposalGeneration = () => <div style={{padding:24}}>ProposalGeneration placeholder — create <code>modules/proposal-generation/ProposalGeneration</code></div>;  // Added
  SentimentAnalysis = () => <div style={{padding:24}}>SentimentAnalysis placeholder — create <code>modules/sentiment-analysis/SentimentAnalysis</code></div>;  // Added
  PricePrediction = () => <div style={{padding:24}}>PricePrediction placeholder — create <code>modules/price-prediction/PricePrediction</code></div>;  // Added
  CRM = () => <div style={{padding:24}}>CRM placeholder — create <code>modules/crm/CRM</code></div>;  // Added
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/role-selection/:userId" element={<RoleSelection />} />
      <Route path="/freelancer-form" element={<FreelancerForm />} />
      <Route path="/jobseeker-form" element={<JobSeekerForm />} />
      <Route path="/company-form" element={<CompanyForm />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/talent-match"
        element={
          <ProtectedRoute>
            <TalentMatch />
          </ProtectedRoute>
        }
      />
      {/* Added: Protected routes for the missing Sidebar links */}
      <Route
        path="/proposal-generation"
        element={
          <ProtectedRoute>
            <ProposalGeneration />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sentiment-analysis"
        element={
          <ProtectedRoute>
            <SentimentAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/price-prediction"
        element={
          <ProtectedRoute>
            <PricePrediction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <CRM />
          </ProtectedRoute>
        }
      />

      {/* Redirect root / to login if no token (the ProtectedRoute already handles protection);
          But we want root to be reachable and not cause confusing blank pages. */}
      <Route
        path="/home"
        element={<Navigate to="/" replace />}
      />

      {/* Catch-all: go to /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
