/**
 * Forgot Password Component
 * Allows users to request a password reset via email
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Link as MuiLink,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { API_BASE } from "config";
import { API_ENDPOINTS, ROUTES } from "../../constants";
import { useToast } from "../../providers/ToastProvider";

const StyledContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: theme.spacing(3),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  width: "100%",
  maxWidth: 400,
  gap: theme.spacing(2),
}));

const ForgotPassword = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE}${API_ENDPOINTS.FORGOT_PASSWORD}`,
        { email }
      );

      setSuccess(true);
      showToast("Password reset request successful", "success");
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Failed to process request. Please try again.";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <StyledContainer>
        <StyledPaper elevation={3}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Request Successful
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reset request processed successfully.
          </Alert>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              component={Link}
              to={`${ROUTES.RESET_PASSWORD}?email=${encodeURIComponent(email)}`}
              variant="contained"
              fullWidth
              size="large"
            >
              Reset Password
            </Button>
            <Button
              component={Link}
              to={ROUTES.LOGIN}
              variant="outlined"
              fullWidth
            >
              Back to Login
            </Button>
          </Box>
        </StyledPaper>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Forgot Password
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            disabled={loading}
            autoFocus
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            size="large"
            fullWidth
            sx={{ mt: 1 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Remember your password?{" "}
          <MuiLink component={Link} to={ROUTES.LOGIN}>
            Back to Login
          </MuiLink>
        </Typography>
      </StyledPaper>
    </StyledContainer>
  );
};

export default ForgotPassword;
