/**
 * Role Selection Component
 * Reusable role selection component
 */

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Box, Button, Container, Typography, Alert, CircularProgress, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { useToast } from "../../providers/ToastProvider";
import { COLORS } from "../../constants/colors";

/**
 * Styled container for the role selection page
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
 * Styled paper component for the role selection form
 */
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  width: "100%",
  maxWidth: 500,
  gap: theme.spacing(2),
}));

const RoleSelection = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get user_id from route param (passed from signup)
  const { userId } = useParams();

  const handleRoleSelect = async (role) => {
    setLoading(true);
    setError("");

    try {
      await axios.post(`${API_BASE}/set-role`, {
        user_id: parseInt(userId),
        role,
      });

      showToast("Role selected successfully!", "success");

      // Redirect user to their dashboard or next step
      if (role === "freelancer") navigate("/freelancer-form");
      else if (role === "job_seeker") navigate("/jobseeker-form");
      else if (role === "company_admin") navigate("/company-form");
    } catch (err) {
      const msg = extractErrorMessage(err) || "Failed to set role. Try again.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Select Your Role
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Please choose how you want to use SoftScale.
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => handleRoleSelect("freelancer")}
            disabled={loading}
            sx={{
              background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
              boxShadow: `0 6px 16px ${COLORS.info.darker}40`,
              "&:hover": {
                background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
                boxShadow: `0 8px 24px ${COLORS.info.darker}60`,
                transform: "translateY(-2px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Processing...
              </>
            ) : (
              "Continue as Freelancer"
            )}
          </Button>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => handleRoleSelect("job_seeker")}
            disabled={loading}
            sx={{
              background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
              boxShadow: `0 6px 16px ${COLORS.success.darker}40`,
              "&:hover": {
                background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                boxShadow: `0 8px 24px ${COLORS.success.darker}60`,
                transform: "translateY(-2px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Processing...
              </>
            ) : (
              "Continue as Job Seeker"
            )}
          </Button>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => handleRoleSelect("company_admin")}
            disabled={loading}
            sx={{
              background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
              boxShadow: `0 6px 16px ${COLORS.accent.darker}40`,
              "&:hover": {
                background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                boxShadow: `0 8px 24px ${COLORS.accent.darker}60`,
                transform: "translateY(-2px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Processing...
              </>
            ) : (
              "Continue as Company Admin"
            )}
          </Button>
        </Box>
      </StyledPaper>
    </StyledContainer>
  );
};

export default RoleSelection;

