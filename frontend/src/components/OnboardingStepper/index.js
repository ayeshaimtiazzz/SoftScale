/**
 * Onboarding Stepper Component
 * Combines role selection and form filling in a user-friendly stepper interface
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  Person,
  Work,
  Business,
  CheckCircle,
  ArrowForward,
  ArrowBack,
} from "@mui/icons-material";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { useToast } from "../../providers/ToastProvider";
import { COLORS } from "../../constants/colors";
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
  border: selected
    ? `3px solid ${roleColor}`
    : `2px solid ${theme.palette.divider}`,
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

const steps = ["Select Your Role", "Complete Your Profile"];

const roleOptions = [
  {
    value: "freelancer",
    label: "Freelancer",
    description: "Work on projects and build your portfolio",
    icon: <Person sx={{ fontSize: 48 }} />,
    color: COLORS.info.main,
  },
  {
    value: "job_seeker",
    label: "Job Seeker",
    description: "Find your dream job opportunity",
    icon: <Work sx={{ fontSize: 48 }} />,
    color: COLORS.success.main,
  },
  {
    value: "company_admin",
    label: "Company Admin",
    description: "Post jobs and find the best talent",
    icon: <Business sx={{ fontSize: 48 }} />,
    color: COLORS.accent.main,
  },
];

const OnboardingStepper = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { userId } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleSet, setRoleSet] = useState(false);

  // Check if user_id exists
  useEffect(() => {
    if (!userId) {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (!currentUser.user_id) {
        showToast("Please complete signup first", "error");
        navigate("/signup");
      }
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
      showToast("Role selected successfully! Click continue to proceed.", "success");
    } catch (err) {
      const msg = extractErrorMessage(err) || "Failed to set role. Try again.";
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
    showToast("Profile setup complete! Welcome to SoftScale!", "success");
  };

  const renderRoleSelection = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Choose how you want to use SoftScale. You can always update this later.
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
          <RoleCard
            key={role.value}
            selected={selectedRole === role.value}
            roleColor={role.color}
            elevation={selectedRole === role.value ? 4 : 2}
          >
            <CardActionArea
              onClick={() => !loading && handleRoleSelect(role.value)}
              disabled={loading}
              sx={{ height: "100%", p: 2 }}
            >
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
                      Selected
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

  const renderForm = () => {
    if (!selectedRole) {
      return (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Please select a role first.
        </Alert>
      );
    }

    // Wrap forms in a container that removes outer styling when embedded
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

    switch (selectedRole) {
      case "freelancer":
        return (
          <FormWrapper>
            <FreelancerForm />
          </FormWrapper>
        );
      case "job_seeker":
        return (
          <FormWrapper>
            <JobSeekerForm />
          </FormWrapper>
        );
      case "company_admin":
        return (
          <FormWrapper>
            <CompanyForm />
          </FormWrapper>
        );
      default:
        return (
          <Alert severity="error">Invalid role selected. Please try again.</Alert>
        );
    }
  };

  return (
    <StyledContainer>
      <StyledPaper elevation={3}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            align="center"
            gutterBottom
            sx={{ fontWeight: 700, mb: 1 }}
          >
            Welcome to SoftScale
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary">
            Let&apos;s set up your profile in just a few steps
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
                    Continue to Profile
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
                      Back to Role Selection
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

