// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// Protects children by checking localStorage 'authToken'.
// If missing, redirect to /login.
export default function ProtectedRoute({ children }) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    return children;
  } catch (err) {
    // in case of any localStorage access error -> send to login
    return <Navigate to="/login" replace />;
  }
}
