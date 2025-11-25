/**
 * Signup Component
 * Reusable signup form component
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, Container, TextField, Typography, Alert, CircularProgress, Link as MuiLink, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { useToast } from "../../providers/ToastProvider";
import { ROUTES } from "../../constants";

/**
 * Styled container for the signup page
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
 * Styled paper component for the signup form
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

const Signup = () => {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/signup`, {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      const { user_id } = response.data;

      // Store user_id and email in localStorage for later use in forms
      localStorage.setItem("currentUser", JSON.stringify({ user_id, email: email.trim() }));

      // Show success toast
      showToast("Account created successfully!", "success");

      // Navigate to role selection page
      navigate(`/role-selection/${user_id}`);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Sign Up
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField type="text" label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth disabled={loading} />

          <TextField
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            disabled={loading}
          />

          <TextField
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            disabled={loading}
          />

          <TextField
            type="password"
            label="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
            disabled={loading}
          />

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
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Already have an account?{" "}
          <MuiLink component={Link} to={ROUTES.LOGIN}>
            Login
          </MuiLink>
        </Typography>
      </StyledPaper>
    </StyledContainer>
  );
};

export default Signup;

