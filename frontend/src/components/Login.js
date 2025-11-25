/**
 * Login Component
 * Handles user authentication and login flow
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Box, Button, Container, TextField, Typography, Alert, CircularProgress, Link as MuiLink, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { extractErrorMessage } from "../utils/errorHandler";
import { API_BASE } from "../config";
import { STORAGE_KEYS, API_ENDPOINTS, ROUTES } from "../constants";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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

      // Extract data from response
      const { access_token, role } = response.data;

      // Store token and role
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);

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

      // Store full user object
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify({
          user_id: userDetails.user_id,
          name: userDetails.name,
          email,
          role,
        })
      );

      // Navigate to dashboard
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      // Handle login or details errors
      const errorMessage = extractErrorMessage(err) || t("auth.loginFailed");
      setError(errorMessage);
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

          {error && <Alert severity="error">{error}</Alert>}

          <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
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

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {t("auth.noAccount")}{" "}
          <MuiLink component={Link} to={ROUTES.SIGNUP}>
            {t("auth.signup")}
          </MuiLink>
        </Typography>
      </StyledPaper>
    </StyledContainer>
  );
};

export default Login;
