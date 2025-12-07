/**
 * Login Component
 * Reusable login form component
 */

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Box, Button, Container, TextField, Typography, Alert, CircularProgress, Link as MuiLink, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { API_ENDPOINTS, ROUTES } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";

/**
 * Styled container for the login page
 */
const StyledContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: theme.spacing(3),
}));

/**
 * Styled paper component for the login form
 */
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  width: "100%",
  maxWidth: 400,
  gap: theme.spacing(2),
}));

/**
 * Login component
 * Provides email/password authentication
 */
const Login = () => {
  const { t } = useTranslation();
  const { login: loginUser, isAuthenticated, initializing } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, initializing, navigate]);

  /**
   * Handles form submission for login
   * @param {React.FormEvent<HTMLFormElement>} e - Form event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call backend login endpoint
      const response = await axios.post(`${API_BASE}${API_ENDPOINTS.LOGIN}`, {
        email,
        password,
      });

      const { access_token, refresh_token, role } = response.data;

      // Fetch user details
      let userDetails = null;
      try {
        const detailsResponse = await axios.get(`${API_BASE}${API_ENDPOINTS.GET_USER_DETAILS}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        userDetails = detailsResponse.data;
      } catch {
        // Fallback: Set basic currentUser with available data
        userDetails = { user_id: null, name: email.split("@")[0], email };
      }

      const normalizedUser = {
        user_id: userDetails.user_id,
        name: userDetails.name || email.split("@")[0],
        email,
        role,
      };

      // Update auth context and localStorage - ensure all data is saved including refresh_token
      loginUser(access_token, normalizedUser, refresh_token);

      // Double-check that data is saved
      if (typeof Storage !== "undefined") {
        localStorage.setItem("authToken", access_token);
        if (refresh_token) {
          localStorage.setItem("refreshToken", refresh_token);
        }
        localStorage.setItem("userRole", role);
        localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      }

      // Check if profile is complete
      try {
        const completionResponse = await axios.get(`${API_BASE}${API_ENDPOINTS.CHECK_PROFILE_COMPLETION}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!completionResponse.data.completed) {
          // Profile incomplete - redirect to onboarding
          showToast("Please complete your profile setup", "info");
          navigate(`/onboarding/${userDetails.user_id}`);
          return;
        }
      } catch (err) {
        // If check fails, assume incomplete and redirect to onboarding
        console.warn("Could not check profile completion, redirecting to onboarding:", err);
        navigate(`/onboarding/${userDetails.user_id}`);
        return;
      }

      // Show success toast
      showToast(t("auth.loginSuccess", { defaultValue: "Login successful!" }), "success");

      // Navigate to dashboard
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      // Handle login or details errors
      const errorMessage = extractErrorMessage(err) || t("auth.loginFailed");
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          {t("auth.loginTitle")}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            type="email"
            label={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            disabled={loading}
          />

          <TextField
            type="password"
            label={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            disabled={loading}
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <MuiLink component={Link} to={ROUTES.FORGOT_PASSWORD} sx={{ fontSize: "0.875rem" }}>
              Forgot Password?
            </MuiLink>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="large"
              sx={{
                minWidth: 200,
                maxWidth: 300,
                px: 4,
                py: 1.5,
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                boxShadow: "0 4px 14px rgba(30, 41, 59, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)",
                "&:hover": {
                  boxShadow: "0 8px 28px rgba(30, 41, 59, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15)",
                  transform: "translateY(-2px) scale(1.02)",
                },
                "&:active": {
                  transform: "translateY(0) scale(0.98)",
                },
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  {t("auth.loggingIn")}
                </>
              ) : (
                t("auth.loginButton")
              )}
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {t("auth.noAccount")}{" "}
          <MuiLink component={Link} to={ROUTES.SIGNUP}>
            Signup
          </MuiLink>
        </Typography>
      </StyledPaper>
    </StyledContainer>
  );
};

export default Login;

