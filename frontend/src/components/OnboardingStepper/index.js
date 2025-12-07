/**
 * Onboarding Stepper Component
 * Combines role selection and form filling in a user-friendly stepper interface
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Box,
  Button,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  CardActionArea,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Person, Work, Business, CheckCircle, ArrowForward, ArrowBack, ExitToApp } from "@mui/icons-material";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { useToast } from "../../providers/ToastProvider";
import { COLORS } from "../../constants/colors";
import { ROUTES } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import FreelancerForm from "../Forms/FreelancerForm";
import JobSeekerForm from "../Forms/JobSeekerForm";
import CompanyForm from "../Forms/CompanyForm";

/**
 * Styled container for the onboarding stepper
 */
const StyledContainer = styled(Container)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  minHeight: "100vh",
  padding: theme.spacing(4),
  paddingTop: theme.spacing(6),
}));

/**
 * Styled paper component for the stepper
 */
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  width: "100%",
  maxWidth: 900,
  borderRadius: theme.spacing(2),
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
}));

/**
 * Styled role card
 */
const RoleCard = styled(Card)(({ theme, selected, roleColor }) => ({
  height: "100%",
  transition: "all 0.3s ease",
  border: selected ? `3px solid ${roleColor}` : `2px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: `0 8px 24px ${roleColor}40`,
    border: `3px solid ${roleColor}`,
  },
  ...(selected && {
    boxShadow: `0 8px 24px ${roleColor}60`,
    background: `linear-gradient(135deg, ${roleColor}08 0%, ${roleColor}15 100%)`,
  }),
}));

// Wrap forms in a container that removes outer styling when embedded
// Moved outside component to prevent recreation on every render
const FormWrapper = ({ children }) => (
  <Box
    sx={{
      "& .form-container": {
        minHeight: "auto",
        padding: 0,
        display: "block",
      },
      "& .heading": {
        display: "none", // Hide "SoftScale" heading in stepper
      },
      "& .form-box": {
        boxShadow: "none",
        padding: 0,
        "& h2": {
          marginTop: 0,
          marginBottom: 3,
        },
      },
    }}
  >
    {children}
  </Box>
);

const OnboardingStepper = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { logout } = useAuth();
  const { userId } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleSet, setRoleSet] = useState(false);

  const steps = [t("onboarding.step1"), t("onboarding.step2")];

  const roleOptions = [
    {
      value: "freelancer",
      label: t("onboarding.roles.freelancer.label"),
      description: t("onboarding.roles.freelancer.description"),
      icon: <Person sx={{ fontSize: 48 }} />,
      color: COLORS.info.main,
    },
    {
      value: "job_seeker",
      label: t("onboarding.roles.jobSeeker.label"),
      description: t("onboarding.roles.jobSeeker.description"),
      icon: <Work sx={{ fontSize: 48 }} />,
      color: COLORS.success.main,
    },
    {
      value: "company_admin",
      label: t("onboarding.roles.companyAdmin.label"),
      description: t("onboarding.roles.companyAdmin.description"),
      icon: <Business sx={{ fontSize: 48 }} />,
      color: COLORS.accent.main,
    },
  ];

  // Check if user_id exists and if role is already set
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const user_id = userId || currentUser.user_id;
    const userRole = localStorage.getItem("userRole") || currentUser.role;

    if (!user_id) {
      showToast(t("onboarding.completeSignupFirst"), "error");
      navigate("/signup");
      return;
    }

    // If user already has a role selected (from login), skip to step 2
    if (userRole && userRole !== "pending") {
      // Map role names if needed (backend uses job_seeker, frontend uses job_seeker)
      const roleMapping = {
        job_seeker: "job_seeker",
        freelancer: "freelancer",
        company_admin: "company_admin",
        company: "company_admin",
      };

      const mappedRole = roleMapping[userRole] || userRole;
      setSelectedRole(mappedRole);
      setRoleSet(true);
      setActiveStep(1); // Skip to form step (role already selected)
    }
  }, [userId, navigate, showToast]);

  const handleRoleSelect = async (role) => {
    setLoading(true);
    setError("");

    try {
      const user_id = userId || JSON.parse(localStorage.getItem("currentUser") || "{}").user_id;

      await axios.post(`${API_BASE}/set-role`, {
        user_id: parseInt(user_id),
        role,
      });

      setSelectedRole(role);
      setRoleSet(true);
      showToast(t("onboarding.roleSelectedSuccess"), "success");
    } catch (err) {
      const msg = extractErrorMessage(err) || t("onboarding.roleSelectFailed");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleFormComplete = () => {
    // Forms handle their own navigation to dashboard
    // This is just for the stepper completion
    showToast(t("onboarding.profileSetupComplete"), "success");
  };

  const handleSkipToLogin = async () => {
    try {
      // Clear authentication data (this will call backend logout and clear local data)
      await logout();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);
      // Continue even if logout fails
    }

    // Show info message
    showToast(t("onboarding.skipMessage"), "info");

    // Navigate to login
    navigate(ROUTES.LOGIN || "/login");
  };

  const renderRoleSelection = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        {t("onboarding.roleSelectionDescription")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 3,
          mt: 2,
        }}
      >
        {roleOptions.map((role) => (
          <RoleCard key={role.value} selected={selectedRole === role.value} roleColor={role.color} elevation={selectedRole === role.value ? 4 : 2}>
            <CardActionArea onClick={() => !loading && handleRoleSelect(role.value)} disabled={loading} sx={{ height: "100%", p: 2 }}>
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    color: role.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {role.icon}
                </Box>
                <Typography variant="h5" component="h3" fontWeight={600}>
                  {role.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {role.description}
                </Typography>
                {selectedRole === role.value && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: role.color,
                      mt: 1,
                    }}
                  >
                    <CheckCircle />
                    <Typography variant="body2" fontWeight={600}>
                      {t("onboarding.selected")}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </CardActionArea>
          </RoleCard>
        ))}
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );

  // Memoize the form to prevent remounting on error state changes
  const renderedForm = useMemo(() => {
    if (!selectedRole) {
      return (
        <Alert severity="warning" sx={{ mt: 3 }}>
          {t("onboarding.pleaseSelectRole")}
        </Alert>
      );
    }

    switch (selectedRole) {
      case "freelancer":
        return (
          <FormWrapper key="freelancer-form">
            <FreelancerForm />
          </FormWrapper>
        );
      case "job_seeker":
        return (
          <FormWrapper key="jobseeker-form">
            <JobSeekerForm />
          </FormWrapper>
        );
      case "company_admin":
        return (
          <FormWrapper key="company-form">
            <CompanyForm />
          </FormWrapper>
        );
      default:
        return <Alert severity="error">{t("onboarding.invalidRole")}</Alert>;
    }
  }, [selectedRole]); // Only recreate when selectedRole changes

  const renderForm = () => renderedForm;

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Box sx={{ mb: 4, position: "relative" }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ExitToApp />}
            onClick={handleSkipToLogin}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              textTransform: "none",
            }}
          >
            {t("onboarding.skip")}
          </Button>
          <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
            {t("onboarding.title")}
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary">
            {t("onboarding.subtitle")}
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel
              StepIconProps={{
                sx: {
                  "&.Mui-completed": { color: COLORS.success.main },
                  "&.Mui-active": { color: COLORS.primary.main },
                },
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {steps[0]}
              </Typography>
            </StepLabel>
            <StepContent>
              {renderRoleSelection()}
              {roleSet && (
                <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    endIcon={<ArrowForward />}
                    sx={{
                      background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    {t("onboarding.continueToProfile")}
                  </Button>
                </Box>
              )}
            </StepContent>
          </Step>

          <Step>
            <StepLabel
              StepIconProps={{
                sx: {
                  "&.Mui-completed": { color: COLORS.success.main },
                  "&.Mui-active": { color: COLORS.primary.main },
                },
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {steps[1]}
              </Typography>
            </StepLabel>
            <StepContent>
              {activeStep === 1 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-start" }}>
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      startIcon={<ArrowBack />}
                      sx={{
                        borderColor: COLORS.primary.main,
                        color: COLORS.primary.main,
                        "&:hover": {
                          borderColor: COLORS.primary.dark,
                          backgroundColor: `${COLORS.primary.main}10`,
                        },
                      }}
                    >
                      {t("onboarding.backToRoleSelection")}
                    </Button>
                  </Box>
                  {renderForm()}
                </Box>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </StyledPaper>
    </StyledContainer>
  );
};

export default OnboardingStepper;

